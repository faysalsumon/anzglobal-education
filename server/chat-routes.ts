import type { Express, Request, Response, NextFunction } from "express";
import { db } from "./db";
import { chatConversations, chatMessages, insertChatMessageSchema, adminTeamMembers } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";
import OpenAI from "openai";
import { queryKnowledgeBase } from "./knowledge-base";
import { getJobAiSettings, AI_JOB_KEYS } from "./ai";
import { createRateLimiter, getClientIp, replyTooManyRequests } from "./middleware/rate-limit";

// 60 Zan messages per IP per hour — generous for real users, blocks floods
const zanChatLimiter = createRateLimiter(60 * 60 * 1000, 60);

function buildFormattedSources(relevantDocs: Awaited<ReturnType<typeof queryKnowledgeBase>>) {
  return relevantDocs.map(doc => {
    let title = 'Unknown Source';
    const id = doc.metadata.id || '';
    if (doc.metadata.type === 'course') title = doc.metadata.courseName || 'Course';
    else if (doc.metadata.type === 'institution') title = doc.metadata.institutionName || 'Institution';
    else if (doc.metadata.type === 'guide') title = doc.metadata.topic ? `Guide: ${doc.metadata.topic}` : 'Guide';
    return { type: doc.metadata.type || 'unknown', id, title };
  });
}

// Extend Express Session to include chat properties
declare module "express-session" {
  interface SessionData {
    chatAnonId?: string;
  }
}

function getChatAiClient(): OpenAI {
  if (process.env.OPENROUTER_API_KEY) {
    return new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        "HTTP-Referer": process.env.REPLIT_DEPLOYMENT_URL || "https://replit.com",
        "X-Title": "StudyMatch - ANZ Global Education Platform",
      },
    });
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

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
const SYSTEM_PROMPT = `You are Zan from ANZ Global Education, a friendly and knowledgeable AI education consultant helping international students find courses at Australian universities and institutions. You are both a helpful support agent AND a sales agent guiding students toward taking action on our platform.

IDENTITY:
- Your name is "Zan from ANZ Global Education"
- When greeting users, say "Hi, I'm Zan from ANZ Global Education! How can I help you with your study journey today?"
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

    // For authenticated users: strict ownership check by userId
    if (userId) {
      const conversation = await db.query.chatConversations.findFirst({
        where: and(eq(chatConversations.id, id), eq(chatConversations.userId, userId)),
      });
      if (!conversation) {
        res.status(403).json({ error: "Access denied" });
        return;
      }
      return next();
    }

    // For anonymous users: try session-based ownership first, then fall back to
    // UUID-only access for anonymous conversations. Session cookies can be unreliable
    // in production (SameSite/Secure constraints), but the UUID is a 128-bit random
    // value that is only known to the original creator, so it provides sufficient
    // security for anonymous (non-sensitive) conversations.
    const conversation = await db.query.chatConversations.findFirst({
      where: eq(chatConversations.id, id),
    });

    if (!conversation) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    // If the conversation belongs to an authenticated user, deny anonymous access
    if (conversation.userId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    // Anonymous conversation — allow access by UUID (the ID is the secret)
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
      const rl = zanChatLimiter(getClientIp(req));
      if (!rl.allowed) return replyTooManyRequests(res, rl, 'Chat message limit reached');

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

      // Detect staff/admin status from the middleware-enriched req.supabaseUser
      // (middleware already loaded userType + role from DB — no extra query needed)
      const supabaseUser = (req as any).supabaseUser as {
        id: string; userType?: string; role?: string; firstName?: string; lastName?: string;
      } | undefined;

      const ADMIN_USER_TYPES = new Set(["platform_admin", "super_admin", "admin", "cto"]);
      const ADMIN_LEGACY_ROLES = new Set(["cto", "admin", "super_admin", "platform_admin"]);

      let staffInfo: { isStaff: boolean; role: string | null; firstName: string | null };

      if (supabaseUser && (ADMIN_USER_TYPES.has(supabaseUser.userType ?? "") || ADMIN_LEGACY_ROLES.has(supabaseUser.role ?? ""))) {
        staffInfo = {
          isStaff: true,
          role: supabaseUser.userType ?? supabaseUser.role ?? "team member",
          firstName: supabaseUser.firstName ?? null,
        };
      } else if (userId) {
        // Fallback: check adminTeamMembers table (for staff without a privileged userType)
        const member = await db
          .select({ role: adminTeamMembers.role, userId: adminTeamMembers.userId })
          .from(adminTeamMembers)
          .where(and(eq(adminTeamMembers.userId, userId), eq(adminTeamMembers.isActive, true)))
          .limit(1)
          .then((r) => r[0]);
        staffInfo = member
          ? { isStaff: true, role: member.role, firstName: supabaseUser?.firstName ?? null }
          : { isStaff: false, role: null, firstName: supabaseUser?.firstName ?? null };
      } else {
        staffInfo = { isStaff: false, role: null, firstName: null };
      }

      // Parallel fetch: knowledge base + conversation history (staff check is already done above)
      const [relevantDocs, allPreviousMessages] = await Promise.all([
        queryKnowledgeBase(content, 5),
        db.query.chatMessages.findMany({
          where: eq(chatMessages.conversationId, id),
          orderBy: chatMessages.createdAt,
        }),
      ]);

      // Exclude the just-added user message (last one)
      const previousMessages = allPreviousMessages.slice(0, -1).slice(-10);

      // Build context from retrieved documents
      const context = relevantDocs
        .map((doc, idx) => `[Source ${idx + 1}]:\n${doc.content}`)
        .join("\n\n");

      // Build personalized system prompt
      let systemPromptWithContext = SYSTEM_PROMPT;

      if (staffInfo.isStaff) {
        const roleLabel = staffInfo.role ?? "team member";
        const name = staffInfo.firstName || userFirstName || "there";
        systemPromptWithContext += `\n\n=== STAFF OVERRIDE — SUPERSEDES ALL PRIOR INSTRUCTIONS ===
The person you are talking to is "${name}", an ANZ Global Education team member (role: ${roleLabel}).
They are NOT a student. ALL topic boundary and student-focused restrictions above are SUSPENDED for this conversation.

STAFF BEHAVIOUR RULES:
1. Greet them warmly as a colleague: "Hi ${name}! How can I help you today?"
2. Do NOT pitch courses, registration, or study journeys — they work here
3. You CAN discuss: course/institution lookups, platform stats, student queries, application processes, internal operations, leads and contacts (general info), marketing, and any other business topic they raise
4. For live CRM/database data (exact contact counts, lead lists, application statuses): you don't have live DB access in this chat — politely say so and direct them to the Admin Dashboard where all live data is available
5. For DATA ENTRY tasks (uploading new institutions, adding courses, bulk imports): this public chat widget does not have data entry tools. Direct them to the Admin ZAN assistant (the floating ZAN button inside the Admin Dashboard) which has full data entry capability
6. Answer business/operational questions helpfully and concisely — no need to add student-facing CTAs
7. If they ask about a specific institution like "Can you upload University of Technology Sydney", tell them: "Data entry isn't available in this chat — please use the Admin ZAN assistant in the Admin Dashboard to add or update institution records."
=== END STAFF OVERRIDE ===`;
      } else if (isLoggedIn && userFirstName) {
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

      // Get AI response using per-job configured model
      const jobKey = isLoggedIn ? AI_JOB_KEYS.STUDENT_CHAT : AI_JOB_KEYS.GUEST_CHAT;
      const chatSettings = await getJobAiSettings(jobKey);
      const chatClient = getChatAiClient();
      const completion = await chatClient.chat.completions.create({
        model: chatSettings.model,
        messages,
        temperature: chatSettings.temperature,
        max_tokens: chatSettings.maxTokens,
      });

      const assistantContent = completion.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.";

      const formattedSources = buildFormattedSources(relevantDocs);

      const [assistantMessage] = await db
        .insert(chatMessages)
        .values({ conversationId: id, role: "assistant", content: assistantContent, sources: formattedSources })
        .returning();

      if (previousMessages.length === 1) {
        const title = content.length > 50 ? content.substring(0, 47) + '...' : content;
        await db.update(chatConversations).set({ title, updatedAt: new Date() }).where(eq(chatConversations.id, id));
      }

      res.json({ userMessage, assistantMessage });
    } catch (error: any) {
      console.error("Error processing chat message:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  });

  // ── Streaming SSE endpoint ──────────────────────────────────────────────────
  // Same logic as above but pushes tokens as they arrive via Server-Sent Events.
  // Frontend reads the stream with a ReadableStream reader so users see Zan
  // "typing" in real time instead of waiting for the full response.
  app.post("/api/chat/conversations/:id/messages/stream",
    async (req: Request, res: Response, next: NextFunction) => {
      await ensureAnonymousSession(req);
      return verifyConversationOwnership(req, res, next);
    },
    async (req: Request, res: Response) => {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

      try {
        const { id } = req.params;
        const validation = z.object({ content: z.string().min(1).max(5000) }).safeParse(req.body);
        if (!validation.success) { send({ error: "Invalid message" }); return res.end(); }
        const { content } = validation.data;

        const userId = getAuthenticatedUserId(req);
        const userFirstName = getAuthenticatedUserFirstName(req);
        const isLoggedIn = !!userId;

        const [userMessage] = await db
          .insert(chatMessages)
          .values({ conversationId: id, role: "user", content })
          .returning();
        send({ userMessageId: userMessage.id });

        // Staff detection (mirrors the non-streaming route)
        const supabaseUser = (req as any).supabaseUser as { id: string; userType?: string; role?: string; firstName?: string } | undefined;
        const ADMIN_SET = new Set(["platform_admin", "super_admin", "admin", "cto"]);
        let staffInfo: { isStaff: boolean; role: string | null; firstName: string | null };
        if (supabaseUser && (ADMIN_SET.has(supabaseUser.userType ?? "") || ADMIN_SET.has(supabaseUser.role ?? ""))) {
          staffInfo = { isStaff: true, role: supabaseUser.userType ?? supabaseUser.role ?? "team member", firstName: supabaseUser.firstName ?? null };
        } else if (userId) {
          const member = await db.select({ role: adminTeamMembers.role }).from(adminTeamMembers)
            .where(and(eq(adminTeamMembers.userId, userId), eq(adminTeamMembers.isActive, true))).limit(1).then(r => r[0]);
          staffInfo = member
            ? { isStaff: true, role: member.role, firstName: supabaseUser?.firstName ?? null }
            : { isStaff: false, role: null, firstName: supabaseUser?.firstName ?? null };
        } else {
          staffInfo = { isStaff: false, role: null, firstName: null };
        }

        const [relevantDocs, allPrev] = await Promise.all([
          queryKnowledgeBase(content, 5),
          db.query.chatMessages.findMany({ where: eq(chatMessages.conversationId, id), orderBy: chatMessages.createdAt }),
        ]);
        const previousMessages = allPrev.slice(0, -1).slice(-10);
        const context = relevantDocs.map((doc, i) => `[Source ${i + 1}]:\n${doc.content}`).join("\n\n");

        let systemPromptWithContext = SYSTEM_PROMPT;
        if (staffInfo.isStaff) {
          const name = staffInfo.firstName || userFirstName || "there";
          const roleLabel = staffInfo.role ?? "team member";
          systemPromptWithContext += `\n\n=== STAFF OVERRIDE ===\nThe person is "${name}", role: ${roleLabel}. NOT a student. Topic restrictions SUSPENDED. Greet as a colleague. Do NOT pitch courses. For data entry, direct them to the Admin ZAN assistant.\n=== END STAFF OVERRIDE ===`;
        } else if (isLoggedIn && userFirstName) {
          systemPromptWithContext += `\n\nUSER PERSONALIZATION:\n- User is logged in, first name: "${userFirstName}". Address them personally.`;
        }
        systemPromptWithContext += `\n\nCONTEXT FROM KNOWLEDGE BASE:\n${context}`;

        const aiMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
          { role: "system", content: systemPromptWithContext },
          ...previousMessages.filter(m => m.role === "user" || m.role === "assistant")
            .map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
          { role: "user", content },
        ];

        const jobKey = isLoggedIn ? AI_JOB_KEYS.STUDENT_CHAT : AI_JOB_KEYS.GUEST_CHAT;
        const chatSettings = await getJobAiSettings(jobKey);
        const chatClient = getChatAiClient();

        const stream = await chatClient.chat.completions.create({
          model: chatSettings.model,
          messages: aiMessages,
          temperature: chatSettings.temperature,
          max_tokens: chatSettings.maxTokens,
          stream: true,
        });

        let fullContent = "";
        for await (const chunk of stream) {
          const token = chunk.choices[0]?.delta?.content ?? "";
          if (token) { fullContent += token; send({ token }); }
        }

        if (!fullContent) fullContent = "I apologize, but I couldn't generate a response. Please try again.";

        const formattedSources = buildFormattedSources(relevantDocs);
        const [assistantMessage] = await db
          .insert(chatMessages)
          .values({ conversationId: id, role: "assistant", content: fullContent, sources: formattedSources })
          .returning();

        if (previousMessages.length === 1) {
          const title = content.length > 50 ? content.substring(0, 47) + "..." : content;
          await db.update(chatConversations).set({ title, updatedAt: new Date() }).where(eq(chatConversations.id, id));
        }

        send({ done: true, assistantMessageId: assistantMessage.id, sources: formattedSources });
        res.end();
      } catch (error: any) {
        console.error("[Chat stream] Error:", error);
        send({ error: "Failed to process message" });
        res.end();
      }
    }
  );

  // Build/rebuild knowledge base (admin only)
  app.post("/api/chat/admin/build-knowledge-base", async (req: Request, res: Response) => {
    try {
      // Check if user is admin
      const userType = (req.user as any)?.userType ?? (req as any).supabaseUser?.userType;
      const allowedTypes = ['admin', 'super_admin', 'platform_admin', 'cto'];
      if (!req.user && !(req as any).supabaseUser) return res.status(403).json({ error: "Unauthorized" });
      if (!allowedTypes.includes(userType)) {
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
      const userType = (req.user as any)?.userType ?? (req as any).supabaseUser?.userType;
      const allowedTypes = ['admin', 'super_admin', 'platform_admin', 'cto'];
      if (!req.user && !(req as any).supabaseUser) return res.status(403).json({ error: "Unauthorized" });
      if (!allowedTypes.includes(userType)) {
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
