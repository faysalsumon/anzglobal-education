import type { Express, Request, Response } from "express";
import { db } from "./db";
import { chatConversations, chatMessages, insertChatMessageSchema } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import OpenAI from "openai";
import { queryKnowledgeBase } from "./knowledge-base";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// System prompt for the chat agent
const SYSTEM_PROMPT = `You are an AI assistant for ANZ Global Education, a platform connecting international students with Australian universities and institutions.

Your role is to help students with:
1. Course discovery and recommendations
2. Understanding application requirements and processes
3. General information about studying in Australia
4. Platform features and navigation

CRITICAL RULES:
- Only answer questions based on the knowledge base context provided
- If you don't have information about a specific query, respond: "I don't have that specific information. Would you like me to connect you with our support team?"
- Never make up information about courses, fees, or requirements
- Always cite specific institutions or course names when relevant
- Be friendly, helpful, and encouraging
- Keep responses concise but informative

When answering:
- Use bullet points for lists
- Include specific course/institution names from the context
- Mention relevant fees, locations, or requirements if available
- Suggest next steps (apply, view course details, etc.)`;

export function registerChatRoutes(app: Express) {
  // Get or create conversation
  app.post("/api/chat/conversations", async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any)?.id || null;
      const { sessionId } = req.body;

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
            sessionId: sessionId || null,
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

  // Get conversation history
  app.get("/api/chat/conversations/:id/messages", async (req: Request, res: Response) => {
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

  // Send message and get AI response
  app.post("/api/chat/conversations/:id/messages", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const validation = insertChatMessageSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({ error: validation.error });
      }

      const { content } = validation.data;

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

      // Build messages array for OpenAI
      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        {
          role: "system",
          content: `${SYSTEM_PROMPT}\n\nCONTEXT FROM KNOWLEDGE BASE:\n${context}`,
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

      // Save assistant message with sources
      const [assistantMessage] = await db
        .insert(chatMessages)
        .values({
          conversationId: id,
          role: "assistant",
          content: assistantContent,
          sources: relevantDocs.map(doc => ({
            type: doc.metadata.type,
            content: doc.content.substring(0, 200) + '...',
            metadata: doc.metadata,
            score: doc.score,
          })),
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
