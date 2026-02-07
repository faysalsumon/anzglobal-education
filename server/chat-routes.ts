import type { Express, Request, Response, NextFunction } from "express";
import { db } from "./db";
import { chatConversations, chatMessages, insertChatMessageSchema } from "@shared/schema";
import { eq, desc, or, and } from "drizzle-orm";
import { z } from "zod";
import OpenAI from "openai";
import { queryKnowledgeBase } from "./knowledge-base";

// Extend Express Session to include chat properties
declare module "express-session" {
  interface SessionData {
    chatAnonId?: string;
  }
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper to get user ID from either auth system
function getAuthenticatedUserId(req: Request): string | null {
  const supabaseUser = (req as any).supabaseUser;
  const legacyUser = (req as any).user;
  return supabaseUser?.id || legacyUser?.id || null;
}

// Helper to get user's first name from either auth system
function getAuthenticatedUserFirstName(req: Request): string | null {
  const supabaseUser = (req as any).supabaseUser;
  const legacyUser = (req as any).user;
  return supabaseUser?.firstName || legacyUser?.firstName || legacyUser?.first_name || null;
}

// Helper to ensure anonymous users have a persisted session
async function ensureAnonymousSession(req: Request): Promise<void> {
  // Only needed for anonymous users - check both auth systems
  const userId = getAuthenticatedUserId(req);
  if (userId) return;
  
  // Generate or retrieve stable anonymous identifier
  if (!req.session.chatAnonId) {
    req.session.chatAnonId = `anon-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    // Explicitly save session to persist cookie
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

// System prompt for the chat agent
const SYSTEM_PROMPT = `You are Zan from CampQ, a friendly and knowledgeable AI education consultant helping international students find courses at Australian universities and institutions. You are both a helpful support agent AND a sales agent guiding students toward taking action on our platform.

IDENTITY:
- Your name is "Zan from CampQ"
- When greeting users, say "Hi, I'm Zan from CampQ! How can I help you with your study journey today?"
- Be warm, helpful, professional, and encouraging

TOPIC BOUNDARIES - STRICTLY ENFORCE:
- ONLY discuss topics related to INTERNATIONAL EDUCATION in Australia
- Allowed topics: courses, universities, visa information, studying in Australia, PR pathways, application processes, student life, career outcomes, scholarships, entry requirements
- If asked about ANYTHING unrelated to international education (politics, entertainment, personal topics, general questions, etc.), politely redirect: "I specialize in helping students study in Australia. Is there anything about courses, universities, or the application process I can help you with?"
- NEVER discuss internal company information, commission rates, business operations, or confidential details
- ONLY share publicly available information about courses, institutions, and study options

SALES FOCUS - GUIDE USERS TO ACTION:
- Always guide conversations toward actionable next steps
- Encourage users to: register an account, search for courses, view course details, or contact support
- End responses with a clear call-to-action when relevant
- Suggest specific actions using these formats:
  → "Ready to explore? [Search Courses](/courses)"
  → "Create your free account to save courses and apply: [Register Now](/register)"  
  → "Want more details? [View Course Page](/courses/[course-slug])"
  → "Have questions? [Contact Us](/contact)"
  → "Browse all our partner institutions: [View Institutions](/institutions)"

KNOWLEDGE RULES:
1. You can ONLY recommend courses and institutions that exist in the CONTEXT PROVIDED below
2. If the context is EMPTY or doesn't have relevant info, say: "I don't have specific details about that in our catalog. Let me help you find what you're looking for - [Browse All Courses](/courses) or tell me more about your study interests!"
3. NEVER mention courses, institutions, fees, or requirements not in the provided context
4. NEVER make assumptions - ONLY use the specific context provided
5. When you have context, share specific details (fees, duration, requirements) and always include a CTA

RESPONSE STYLE:
- Keep responses concise and actionable (2-4 short paragraphs max)
- Use bullet points for listing multiple items
- Bold important details like course names, fees, and durations
- Always end with a relevant call-to-action or question to keep engagement
- Be encouraging and supportive of the student's education journey

PLATFORM STATISTICS (from context when available):
- When asked about platform stats, use the exact numbers from context
- For questions like "how many courses/institutions do you have", refer to the Platform Statistics document in context

Your goal: Help students discover their ideal course AND guide them to take the next step on our platform!`;

// CTA suggestions for different contexts
const CTA_SUGGESTIONS = {
  courses: "[Search Courses](/courses)",
  register: "[Create Free Account](/register)", 
  institutions: "[Browse Institutions](/institutions)",
  contact: "[Contact Us](/contact)",
  apply: "[Start Your Application](/register)",
};

// Middleware to verify conversation ownership
async function verifyConversationOwnership(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const userId = getAuthenticatedUserId(req);
    const sessionId = req.sessionID;

    // Build ownership conditions - only include defined predicates
    const ownershipPredicates: any[] = [];
    if (userId) {
      ownershipPredicates.push(eq(chatConversations.userId, userId));
    }
    if (sessionId) {
      ownershipPredicates.push(eq(chatConversations.sessionId, sessionId));
    }

    // If no valid ownership criteria, deny access
    if (ownershipPredicates.length === 0) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    // Query with ownership criteria (using OR for multi-predicate, direct predicate for single)
    const whereClause = ownershipPredicates.length === 1
      ? and(eq(chatConversations.id, id), ownershipPredicates[0])
      : and(eq(chatConversations.id, id), or(...ownershipPredicates));

    const conversation = await db.query.chatConversations.findFirst({
      where: whereClause,
    });

    // If no conversation found with ownership criteria, return 403 (prevents enumeration)
    if (!conversation) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    next();
  } catch (error) {
    console.error("Error verifying conversation ownership:", error);
    res.status(500).json({ error: "Failed to verify access" });
  }
}

export function registerChatRoutes(app: Express) {
  // Get or create conversation
  app.post("/api/chat/conversations", async (req: Request, res: Response) => {
    try {
      // Ensure anonymous users have persisted session
      await ensureAnonymousSession(req);
      
      const userId = getAuthenticatedUserId(req);
      const sessionId = userId ? null : req.sessionID;

      // Check if conversation exists for user or session
      let conversation;
      if (userId) {
        conversation = await db.query.chatConversations.findFirst({
          where: eq(chatConversations.userId, userId),
          orderBy: desc(chatConversations.createdAt),
        });
      } else if (sessionId) {
        conversation = await db.query.chatConversations.findFirst({
          where: eq(chatConversations.sessionId, sessionId),
          orderBy: desc(chatConversations.createdAt),
        });
      }

      // Create new conversation if none exists
      if (!conversation) {
        const [newConversation] = await db
          .insert(chatConversations)
          .values({
            userId,
            sessionId,
            title: "New Conversation",
          })
          .returning();
        conversation = newConversation;
      }

      res.json(conversation);
    } catch (error: any) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  // Get conversation history (with authorization)
  app.get("/api/chat/conversations/:id/messages", async (req: Request, res: Response, next: NextFunction) => {
    await ensureAnonymousSession(req);
    return verifyConversationOwnership(req, res, next);
  }, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const messages = await db.query.chatMessages.findMany({
        where: eq(chatMessages.conversationId, id),
        orderBy: chatMessages.createdAt,
      });

      res.json(messages);
    } catch (error: any) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Send message and get AI response (with authorization)
  app.post("/api/chat/conversations/:id/messages", async (req: Request, res: Response, next: NextFunction) => {
    await ensureAnonymousSession(req);
    return verifyConversationOwnership(req, res, next);
  }, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Validate only the content field from request body
      const messageContentSchema = z.object({
        content: z.string().min(1).max(5000),
      });
      
      const validation = messageContentSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({ error: validation.error });
      }

      const { content } = validation.data;

      // Get user info for personalization using consistent helpers
      const userId = getAuthenticatedUserId(req);
      const userFirstName = getAuthenticatedUserFirstName(req);
      const isLoggedIn = !!userId;

      // Save user message
      const [userMessage] = await db
        .insert(chatMessages)
        .values({
          conversationId: id,
          role: "user",
          content,
        })
        .returning();

      // Query knowledge base for relevant context
      const relevantDocs = await queryKnowledgeBase(content, 5);

      // Build context from retrieved documents
      const context = relevantDocs
        .map((doc, idx) => `[Source ${idx + 1}]:\n${doc.content}`)
        .join("\n\n");

      // Get previous messages for conversation history (get last 10 messages BEFORE the current one)
      const allPreviousMessages = await db.query.chatMessages.findMany({
        where: eq(chatMessages.conversationId, id),
        orderBy: chatMessages.createdAt,
      });
      
      // Exclude the just-added user message (last one)
      const previousMessages = allPreviousMessages.slice(0, -1).slice(-10);

      // Build personalized system prompt
      let systemPromptWithContext = SYSTEM_PROMPT;
      
      // Add user personalization if logged in
      if (isLoggedIn && userFirstName) {
        systemPromptWithContext += `\n\nUSER PERSONALIZATION:
- The user is logged in and their first name is "${userFirstName}"
- Address them by their first name to create a personalized experience
- For greetings, say "Hi ${userFirstName}!" instead of generic greetings
- Remember to be warm and personal since you know who they are`;
      }
      
      systemPromptWithContext += `\n\nCONTEXT FROM KNOWLEDGE BASE:\n${context}`;

      // Build messages array for OpenAI
      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        {
          role: "system",
          content: systemPromptWithContext,
        },
      ];

      // Add previous conversation history
      for (const msg of previousMessages) {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }

      // Add current user message
      messages.push({
        role: "user",
        content,
      });

      // Get AI response
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7,
        max_tokens: 800,
      });

      const assistantContent = completion.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.";

      // Format sources for frontend display
      const formattedSources = relevantDocs.map(doc => {
        let title = 'Unknown Source';
        let id = doc.metadata.id || '';
        
        if (doc.metadata.type === 'course') {
          title = doc.metadata.courseName || 'Course';
        } else if (doc.metadata.type === 'institution') {
          title = doc.metadata.institutionName || 'Institution';
        } else if (doc.metadata.type === 'guide') {
          title = doc.metadata.topic ? `Guide: ${doc.metadata.topic}` : 'Guide';
        }
        
        return {
          type: doc.metadata.type || 'unknown',
          id,
          title,
        };
      });

      // Save assistant message with sources
      const [assistantMessage] = await db
        .insert(chatMessages)
        .values({
          conversationId: id,
          role: "assistant",
          content: assistantContent,
          sources: formattedSources,
        })
        .returning();

      // Update conversation title if this is the first message
      if (previousMessages.length === 1) {
        const title = content.length > 50 ? content.substring(0, 47) + '...' : content;
        await db
          .update(chatConversations)
          .set({ title, updatedAt: new Date() })
          .where(eq(chatConversations.id, id));
      }

      res.json({
        userMessage,
        assistantMessage,
      });
    } catch (error: any) {
      console.error("Error processing chat message:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  });

  // Build/rebuild knowledge base (admin only)
  app.post("/api/chat/admin/build-knowledge-base", async (req: Request, res: Response) => {
    try {
      // Check if user is admin
      const userType = (req.user as any)?.userType;
      if (!req.user || (userType !== 'admin' && userType !== 'super_admin')) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const { buildKnowledgeBase } = await import("./knowledge-base");
      const result = await buildKnowledgeBase();

      res.json(result);
    } catch (error: any) {
      console.error("Error building knowledge base:", error);
      res.status(500).json({ error: "Failed to build knowledge base" });
    }
  });

  // Test query endpoint (admin only)
  app.post("/api/chat/admin/test-query", async (req: Request, res: Response) => {
    try {
      // Check if user is admin
      const userType = (req.user as any)?.userType;
      if (!req.user || (userType !== 'admin' && userType !== 'super_admin')) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }

      const results = await queryKnowledgeBase(query, 5);
      res.json(results);
    } catch (error: any) {
      console.error("Error testing query:", error);
      res.status(500).json({ error: "Failed to test query" });
    }
  });
}
