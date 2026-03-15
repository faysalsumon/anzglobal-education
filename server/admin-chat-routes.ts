import type { Express, Request, Response } from "express";
import { db } from "./db";
import {
  chatConversations,
  chatMessages,
  adminTeamMembers,
  users,
  branches,
  crmContacts,
  tasks,
  applications,
} from "@shared/schema";
import { eq, and, lt, gte, lte, ne, sql, count, inArray } from "drizzle-orm";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function getUserId(req: any): string | null {
  return req.supabaseUser?.id || req.user?.id || null;
}

async function requireAdmin(req: any, res: any, next: any) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Authentication required" });

    const member = await db
      .select()
      .from(adminTeamMembers)
      .where(and(eq(adminTeamMembers.userId, userId), eq(adminTeamMembers.isActive, true)))
      .limit(1)
      .then((r) => r[0]);

    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1).then((r) => r[0]);

    // Non-student, non-university roles from the roles table are considered admin staff
    const ADMIN_ROLE_IDS = [
      'role_super_admin', 'role_ceo', 'role_cfo',
      'role_branch_manager', 'role_marketing_executive',
      'role_senior_consultant', 'role_junior_consultant',
    ];

    const isAdmin =
      !!member ||
      user?.userType === "admin" ||
      user?.userType === "platform_admin" ||
      user?.userType === "super_admin" ||
      (!!user?.roleId && ADMIN_ROLE_IDS.includes(user.roleId));

    if (!isAdmin) return res.status(403).json({ message: "Admin access required" });

    next();
  } catch (err) {
    console.error("[AdminChat] requireAdmin error:", err);
    res.status(500).json({ message: "Authentication check failed" });
  }
}

async function verifyConversationOwnership(req: any, res: any, next: any) {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const conv = await db
      .select()
      .from(chatConversations)
      .where(and(eq(chatConversations.id, id), eq(chatConversations.userId, userId!)))
      .limit(1)
      .then((r) => r[0]);
    if (!conv) return res.status(403).json({ error: "Access denied" });
    next();
  } catch (err) {
    res.status(500).json({ error: "Failed to verify access" });
  }
}

export interface AdminContext {
  firstName: string;
  lastName: string;
  role: string;
  branchName: string | null;
  contacts: {
    total: number;
    byStage: Record<string, number>;
  };
  tasks: {
    overdue: number;
    overdueItems: string[];
    dueToday: number;
    dueTodayItems: string[];
    upcomingWeek: number;
  };
  teammates: Array<{ name: string; role: string; contactCount: number }>;
  pendingApplications: number;
}

export async function getAdminContext(userId: string): Promise<AdminContext> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 86400000 - 1);
  const endOfWeek = new Date(startOfToday.getTime() + 7 * 86400000);

  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .then((r) => r[0]);

  const member = await db
    .select()
    .from(adminTeamMembers)
    .where(eq(adminTeamMembers.userId, userId))
    .limit(1)
    .then((r) => r[0]);

  const role = member?.role ?? user?.userType ?? "admin";
  const branchId = (user as any)?.branchId ?? null;

  let branchName: string | null = null;
  if (branchId) {
    const branch = await db
      .select({ name: branches.name })
      .from(branches)
      .where(eq(branches.id, branchId))
      .limit(1)
      .then((r) => r[0]);
    branchName = branch?.name ?? null;
  }

  const assignedContacts = await db
    .select({ leadStage: crmContacts.leadStage })
    .from(crmContacts)
    .where(eq(crmContacts.assignedTo, userId));

  const byStage: Record<string, number> = {};
  for (const c of assignedContacts) {
    const stage = c.leadStage ?? "unknown";
    byStage[stage] = (byStage[stage] ?? 0) + 1;
  }

  const overdueTasks = await db
    .select({ title: tasks.title })
    .from(tasks)
    .where(
      and(
        eq(tasks.assignedToId, userId),
        lt(tasks.dueDate, startOfToday),
        ne(tasks.status, "completed")
      )
    )
    .limit(5);

  const dueTodayTasks = await db
    .select({ title: tasks.title })
    .from(tasks)
    .where(
      and(
        eq(tasks.assignedToId, userId),
        gte(tasks.dueDate, startOfToday),
        lte(tasks.dueDate, endOfToday),
        ne(tasks.status, "completed")
      )
    )
    .limit(5);

  const upcomingCount = await db
    .select({ count: count() })
    .from(tasks)
    .where(
      and(
        eq(tasks.assignedToId, userId),
        gte(tasks.dueDate, endOfToday),
        lte(tasks.dueDate, endOfWeek),
        ne(tasks.status, "completed")
      )
    )
    .then((r) => r[0]?.count ?? 0);

  let teammates: AdminContext["teammates"] = [];
  if (branchId) {
    const samebranchUsers = await db
      .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(and(eq((users as any).branchId, branchId), ne(users.id, userId)));

    const branchUserIds = samebranchUsers.map((u) => u.id);

    const branchMembers = branchUserIds.length
      ? await db
          .select({ userId: adminTeamMembers.userId, role: adminTeamMembers.role })
          .from(adminTeamMembers)
          .where(
            and(
              inArray(adminTeamMembers.userId, branchUserIds),
              eq(adminTeamMembers.isActive, true)
            )
          )
      : [];

    const memberRoleMap = Object.fromEntries(branchMembers.map((m) => [m.userId, m.role]));

    for (const u of samebranchUsers) {
      const contactCount = await db
        .select({ count: count() })
        .from(crmContacts)
        .where(eq(crmContacts.assignedTo, u.id))
        .then((r) => Number(r[0]?.count ?? 0));

      teammates.push({
        name: `${u.firstName} ${u.lastName}`,
        role: memberRoleMap[u.id] ?? "admin",
        contactCount,
      });
    }
  }

  const pendingApplications = await db
    .select({ count: count() })
    .from(applications)
    .where(inArray(applications.status, ["pending", "reviewing"]))
    .then((r) => Number(r[0]?.count ?? 0));

  return {
    firstName: user?.firstName ?? "there",
    lastName: user?.lastName ?? "",
    role,
    branchName,
    contacts: { total: assignedContacts.length, byStage },
    tasks: {
      overdue: overdueTasks.length,
      overdueItems: overdueTasks.map((t) => t.title),
      dueToday: dueTodayTasks.length,
      dueTodayItems: dueTodayTasks.map((t) => t.title),
      upcomingWeek: Number(upcomingCount),
    },
    teammates,
    pendingApplications,
  };
}

function buildSystemPrompt(ctx: AdminContext): string {
  const stageList = Object.entries(ctx.contacts.byStage)
    .map(([s, n]) => `${n} ${s}`)
    .join(", ");

  const overdueList = ctx.tasks.overdueItems.length
    ? ctx.tasks.overdueItems.map((t) => `"${t}"`).join(", ")
    : "none";

  const todayList = ctx.tasks.dueTodayItems.length
    ? ctx.tasks.dueTodayItems.map((t) => `"${t}"`).join(", ")
    : "none";

  const teammateLines = ctx.teammates.length
    ? ctx.teammates.map((t) => `  - ${t.name} (${t.role}): ${t.contactCount} assigned contacts`).join("\n")
    : "  - No other team members in your branch";

  const roleGuide: Record<string, string> = {
    branch_manager: "You manage the branch, can reassign contacts, override decisions, and view all branch activity.",
    support_staff: "You handle student inquiries, follow-ups, and document collection.",
    operations_staff: "You manage applications, visa processing, and institution liaisons.",
    super_admin: "You have full platform access — policy and platform decisions.",
    platform_admin: "You have full platform access — policy and platform decisions.",
  };

  return `You are Zan, an AI operations assistant for the ANZ Global Education admin team. You are concise, direct, and action-oriented.

CURRENT USER:
- Name: ${ctx.firstName} ${ctx.lastName}
- Role: ${ctx.role}${ctx.branchName ? `\n- Branch: ${ctx.branchName}` : ""}

ROLE CONTEXT:
${roleGuide[ctx.role] ?? "You help manage the CRM, contacts, and operational tasks."}

THEIR CURRENT WORKLOAD:
- Assigned contacts: ${ctx.contacts.total} total${stageList ? ` (${stageList})` : ""}
- Overdue tasks: ${ctx.tasks.overdue} — ${overdueList}
- Due today: ${ctx.tasks.dueToday} — ${todayList}
- Upcoming this week: ${ctx.tasks.upcomingWeek} tasks

BRANCH TEAM:
${teammateLines}

PLATFORM:
- Applications awaiting action: ${ctx.pendingApplications}

COWORK GUIDANCE:
- You can suggest handing off contacts to specific colleagues by name and explain why based on their role.
- When ${ctx.firstName} asks about a task type that better fits a colleague's role, suggest them by name.
- You can flag when someone's load is unbalanced and suggest redistribution.
- Help ${ctx.firstName} prioritise by urgency: overdue tasks > due today > upcoming.

BEHAVIOUR:
- Keep responses short and actionable (2–3 paragraphs max, use bullet points for lists).
- Always suggest a clear next action.
- Only discuss topics relevant to CRM operations, contacts, applications, tasks, and team coordination.
- Do not discuss courses, visa policy, or student-facing content — refer those to the student portal.`;
}

export function registerAdminChatRoutes(app: Express) {
  app.post("/api/admin-chat/conversations", requireAdmin, async (req: any, res: Response) => {
    try {
      const userId = getUserId(req)!;
      const [conv] = await db
        .insert(chatConversations)
        .values({ userId })
        .returning();
      res.json({ id: conv.id });
    } catch (err) {
      console.error("[AdminChat] create conversation error:", err);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  app.get(
    "/api/admin-chat/conversations/:id/messages",
    requireAdmin,
    verifyConversationOwnership,
    async (req: Request, res: Response) => {
      try {
        const msgs = await db
          .select()
          .from(chatMessages)
          .where(eq(chatMessages.conversationId, req.params.id))
          .orderBy(chatMessages.createdAt);
        res.json(msgs);
      } catch (err) {
        console.error("[AdminChat] get messages error:", err);
        res.status(500).json({ message: "Failed to fetch messages" });
      }
    }
  );

  app.post(
    "/api/admin-chat/conversations/:id/messages",
    requireAdmin,
    verifyConversationOwnership,
    async (req: any, res: Response) => {
      try {
        const userId = getUserId(req)!;
        const { content } = req.body;
        if (!content?.trim()) return res.status(400).json({ message: "Message content required" });

        const ctx = await getAdminContext(userId);
        const systemPrompt = buildSystemPrompt(ctx);

        const history = await db
          .select()
          .from(chatMessages)
          .where(eq(chatMessages.conversationId, req.params.id))
          .orderBy(chatMessages.createdAt)
          .limit(20);

        const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
          { role: "system", content: systemPrompt },
          ...history.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          { role: "user", content },
        ];

        await db.insert(chatMessages).values({
          conversationId: req.params.id,
          role: "user",
          content,
          sources: null,
        });

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: openaiMessages,
          max_tokens: 500,
          temperature: 0.4,
        });

        const assistantContent = completion.choices[0]?.message?.content ?? "I'm not sure how to help with that. Could you rephrase?";

        const [saved] = await db
          .insert(chatMessages)
          .values({
            conversationId: req.params.id,
            role: "assistant",
            content: assistantContent,
            sources: null,
          })
          .returning();

        res.json(saved);
      } catch (err) {
        console.error("[AdminChat] send message error:", err);
        res.status(500).json({ message: "Failed to send message" });
      }
    }
  );

  app.post("/api/admin-chat/context", requireAdmin, async (req: any, res: Response) => {
    try {
      const userId = getUserId(req)!;
      const ctx = await getAdminContext(userId);
      res.json(ctx);
    } catch (err) {
      console.error("[AdminChat] context error:", err);
      res.status(500).json({ message: "Failed to fetch context" });
    }
  });

  console.log("[AdminChat] Admin chat routes registered");
}
