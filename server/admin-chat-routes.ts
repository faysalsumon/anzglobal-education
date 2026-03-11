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
  universities,
  courses,
} from "@shared/schema";
import { eq, and, lt, gte, lte, ne, sql, count, inArray, ilike } from "drizzle-orm";
import OpenAI from "openai";
import { checkAdminAccess } from "./routes";
import { storage } from "./storage";

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

    const isAdmin =
      !!member ||
      user?.userType === "admin" ||
      user?.userType === "platform_admin" ||
      user?.userType === "super_admin";

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

function buildSystemPrompt(ctx: AdminContext, pendingDraft: DataEntryDraft | null): string {
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
    marketing_executive: "You manage institution and course content, SEO, testimonials, and marketing material.",
    education_consultant: "You handle student inquiries, CRM contacts, follow-ups, and document collection.",
    operations_staff: "You manage applications, visa processing, and institution liaisons.",
    super_admin: "You have full platform access — policy and platform decisions.",
    platform_admin: "You have full platform access — policy and platform decisions.",
    cto: "You have full platform access — policy, platform decisions, and technical oversight.",
  };

  const canDoDataEntry = DATA_ENTRY_ROLES.includes(ctx.role);

  let draftContext = '';
  if (pendingDraft) {
    const collected = Object.entries(pendingDraft.fields)
      .filter(([, v]) => v != null && v !== "")
      .map(([k, v]) => `  ${k}: ${v}`)
      .join("\n");
    const missing = pendingDraft.missingRequired.join(", ");
    draftContext = `
PENDING DRAFT (${pendingDraft.type}):
The user is currently building a ${pendingDraft.type}. Fields collected so far:
${collected || "  (none yet)"}
Still missing required fields: ${missing || "none — ready for confirmation"}
When the user provides more info, call the tool again with ALL fields (merged with what you already have).
If all required fields are filled, present the preview for confirmation.`;
  }

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
${canDoDataEntry ? `
DATA ENTRY:
- ${ctx.firstName} can create new institutions and courses by telling you about them in natural language.
- When they want to add an institution or course, use the appropriate tool to extract the structured data.
- For institutions: required fields are name, country, and description (minimum 50 characters). Ask for any missing required fields one at a time.
- For courses: required fields are title, subject, level, and institution (by name). Duration and fees are recommended.
- Always present extracted details for user confirmation before saving.
- If the user says "confirm", "save", "looks good", "yes", or similar affirmation after seeing a preview, that means they approve saving.` : `
DATA ENTRY:
- This user's role (${ctx.role}) does not have permission to create institutions or courses.
- If they ask to add/create an institution or course, politely inform them that only CTO and Marketing Executive roles can use the data entry feature.`}
${draftContext}

BEHAVIOUR:
- Keep responses short and actionable (2-3 paragraphs max, use bullet points for lists).
- Always suggest a clear next action.
- Only discuss topics relevant to CRM operations, contacts, applications, tasks, team coordination${canDoDataEntry ? ', and data entry for institutions/courses' : ''}.
- Do not discuss visa policy or student-facing content — refer those to the student portal.`;
}

const DATA_ENTRY_ROLES = ['cto', 'marketing_executive'];

const dataEntryTools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "create_institution",
      description: "Extract structured institution data from the user's message to create a new institution record. Call this when the user wants to add/create a new institution, university, TAFE, or school. Also call this when the user provides additional fields for an institution draft in progress. Always include ALL fields collected so far (from the PENDING DRAFT context) merged with new info from the latest message.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Institution name" },
          country: { type: "string", description: "Country where the institution is located" },
          description: { type: "string", description: "Description of the institution (minimum 50 characters required)" },
          website: { type: "string", description: "Institution website URL" },
          contactEmail: { type: "string", description: "Contact email address" },
          contactPhone: { type: "string", description: "Contact phone number" },
          providerType: { type: "string", enum: ["University", "Institution", "Tafe", "School"], description: "Type of education provider" },
          establishedYear: { type: "number", description: "Year the institution was established" },
          numberOfCampuses: { type: "number", description: "Number of campuses" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_course",
      description: "Extract structured course data from the user's message to create a new course record. Call this when the user wants to add/create a new course for an institution. Also call this when the user provides additional fields for a course draft in progress. Always include ALL fields collected so far (from the PENDING DRAFT context) merged with new info from the latest message.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Course title" },
          institutionName: { type: "string", description: "Name of the institution this course belongs to (will be looked up)" },
          subject: { type: "string", description: "Course subject area" },
          level: { type: "string", description: "Qualification level (e.g. Bachelor Degree, Diploma, Certificate IV, Masters Degree)" },
          discipline: { type: "string", description: "Discipline category for filtering" },
          duration: { type: "string", description: "Duration text (e.g. '3 years', '6 months')" },
          fees: { type: "number", description: "Tuition fees amount" },
          currency: { type: "string", description: "Currency code (default AUD)" },
          country: { type: "string", description: "Country where the course is offered" },
          location: { type: "string", description: "City or campus location" },
          startDate: { type: "string", description: "Course start date or intake period" },
          deliveryMode: { type: "string", enum: ["on-campus", "online", "hybrid"], description: "How the course is delivered" },
          description: { type: "string", description: "Course description" },
        },
        required: ["title"],
      },
    },
  },
];

interface DataEntryPreview {
  type: "institution" | "course";
  fields: Record<string, any>;
  missingRequired: string[];
  institutionId?: string;
  institutionName?: string;
}

interface DataEntryDraft {
  type: "institution" | "course";
  fields: Record<string, any>;
  missingRequired: string[];
  institutionId?: string;
  institutionName?: string;
}

const conversationDrafts = new Map<string, DataEntryDraft>();

async function findInstitutionByName(name: string): Promise<{ id: string; name: string } | null> {
  try {
    const results = await db
      .select({ id: universities.id, name: universities.name })
      .from(universities)
      .where(ilike(universities.name, `%${name}%`))
      .limit(5);
    if (results.length === 1) return results[0];
    const exact = results.find((r) => r.name.toLowerCase() === name.toLowerCase());
    if (exact) return exact;
    return results[0] ?? null;
  } catch {
    return null;
  }
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200);
}

function mergeFields(existing: Record<string, any>, incoming: Record<string, any>): Record<string, any> {
  const merged = { ...existing };
  for (const [k, v] of Object.entries(incoming)) {
    if (v != null && v !== "") {
      merged[k] = v;
    }
  }
  return merged;
}

async function handleDataEntryToolCall(
  toolCall: OpenAI.Chat.ChatCompletionMessageToolCall,
  conversationId: string,
): Promise<{ preview: DataEntryPreview | null; draft: DataEntryDraft | null; message: string }> {
  const args = JSON.parse(toolCall.function.arguments);
  const fnName = toolCall.function.name;
  const existingDraft = conversationDrafts.get(conversationId);

  if (fnName === "create_institution") {
    const priorFields = (existingDraft?.type === "institution" ? existingDraft.fields : {});
    const fields = mergeFields(priorFields, {
      name: args.name || null,
      country: args.country || null,
      description: args.description || null,
      website: args.website || null,
      contactEmail: args.contactEmail || null,
      contactPhone: args.contactPhone || null,
      providerType: args.providerType || null,
      establishedYear: args.establishedYear || null,
      numberOfCampuses: args.numberOfCampuses || null,
    });

    const missingRequired: string[] = [];
    if (!fields.name) missingRequired.push("name");
    if (!fields.country) missingRequired.push("country");
    if (!fields.description || String(fields.description).length < 50) missingRequired.push("description (minimum 50 characters)");

    if (missingRequired.length > 0) {
      const nextMissing = missingRequired[0];
      const draft: DataEntryDraft = { type: "institution", fields, missingRequired };
      conversationDrafts.set(conversationId, draft);
      return {
        preview: null,
        draft,
        message: `I'm building the institution record. Could you provide the **${nextMissing}**?`,
      };
    }

    const preview: DataEntryPreview = { type: "institution", fields, missingRequired: [] };
    const draft: DataEntryDraft = { type: "institution", fields, missingRequired: [] };
    conversationDrafts.set(conversationId, draft);
    return {
      preview,
      draft,
      message: `I've prepared the institution details for **${fields.name}**. Please review the information below and click "Save as Draft" to create it, or "Cancel" to discard.`,
    };
  }

  if (fnName === "create_course") {
    const priorFields = (existingDraft?.type === "course" ? existingDraft.fields : {});
    const incoming: Record<string, any> = {
      title: args.title || null,
      subject: args.subject || null,
      level: args.level || null,
      discipline: args.discipline || null,
      duration: args.duration || null,
      fees: args.fees || null,
      currency: args.currency || null,
      country: args.country || null,
      location: args.location || null,
      startDate: args.startDate || null,
      deliveryMode: args.deliveryMode || null,
      description: args.description || null,
    };
    if (args.institutionName) incoming.institutionName = args.institutionName;

    const fields = mergeFields(priorFields, incoming);
    const institutionName = fields.institutionName || (existingDraft?.type === "course" ? existingDraft.institutionName : null);

    const missingRequired: string[] = [];
    if (!fields.title) missingRequired.push("title");
    if (!fields.subject) missingRequired.push("subject");
    if (!fields.level) missingRequired.push("level");
    if (!institutionName) missingRequired.push("institution name");

    if (missingRequired.length > 0) {
      const nextMissing = missingRequired[0];
      const draft: DataEntryDraft = {
        type: "course",
        fields,
        missingRequired,
        institutionId: existingDraft?.institutionId,
        institutionName: institutionName || undefined,
      };
      conversationDrafts.set(conversationId, draft);
      return {
        preview: null,
        draft,
        message: `I'm building the course record. Could you provide the **${nextMissing}**?`,
      };
    }

    const institution = await findInstitutionByName(institutionName);
    if (!institution) {
      const draft: DataEntryDraft = {
        type: "course",
        fields,
        missingRequired: ["institution name"],
        institutionName: institutionName || undefined,
      };
      conversationDrafts.set(conversationId, draft);
      return {
        preview: null,
        draft,
        message: `I couldn't find an institution matching "${institutionName}" in the system. Could you double-check the name, or would you like to create the institution first?`,
      };
    }

    delete fields.institutionName;
    if (!fields.currency) fields.currency = "AUD";

    const preview: DataEntryPreview = {
      type: "course",
      fields,
      missingRequired: [],
      institutionId: institution.id,
      institutionName: institution.name,
    };
    const draft: DataEntryDraft = {
      type: "course",
      fields,
      missingRequired: [],
      institutionId: institution.id,
      institutionName: institution.name,
    };
    conversationDrafts.set(conversationId, draft);
    return {
      preview,
      draft,
      message: `I've prepared the course details for **${fields.title}** at **${institution.name}**. Please review the information below and click "Save as Draft" to create it, or "Cancel" to discard.`,
    };
  }

  return { preview: null, draft: null, message: "I couldn't process that request." };
}

function isConfirmationMessage(content: string): boolean {
  const normalized = content.trim().toLowerCase();
  const confirmPatterns = [
    'confirm', 'save', 'yes', 'looks good', 'go ahead', 'do it',
    'approved', 'approve', 'ok', 'okay', 'yep', 'yeah', 'sure',
    'save it', 'create it', 'submit', 'lgtm',
  ];
  return confirmPatterns.some((p) => normalized === p || normalized.startsWith(p + ' ') || normalized.startsWith(p + '.') || normalized.startsWith(p + '!'));
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

        const conversationId = req.params.id;
        const ctx = await getAdminContext(userId);
        const canDoDataEntry = DATA_ENTRY_ROLES.includes(ctx.role);
        const pendingDraft = conversationDrafts.get(conversationId) ?? null;

        await db.insert(chatMessages).values({
          conversationId,
          role: "user",
          content,
          sources: null,
        });

        if (canDoDataEntry && pendingDraft && pendingDraft.missingRequired.length === 0 && isConfirmationMessage(content)) {
          const draft = pendingDraft;
          conversationDrafts.delete(conversationId);

          let savedResult: any;
          try {
            if (draft.type === "institution") {
              const slug = generateSlug(draft.fields.name);
              savedResult = await storage.createUniversity({
                name: draft.fields.name,
                country: draft.fields.country,
                description: draft.fields.description || null,
                website: draft.fields.website || null,
                contactEmail: draft.fields.contactEmail || null,
                contactPhone: draft.fields.contactPhone || null,
                providerType: draft.fields.providerType || null,
                establishedYear: draft.fields.establishedYear ? Number(draft.fields.establishedYear) : null,
                numberOfCampuses: draft.fields.numberOfCampuses ? Number(draft.fields.numberOfCampuses) : null,
                slug,
                approvalStatus: "pending",
                publishStatus: "draft",
                createdByUserId: userId,
                updatedByUserId: userId,
                assignedToUserId: userId,
              });
              console.log(`[AdminChat] Institution created via confirm: "${draft.fields.name}" (id: ${savedResult.id}) by user ${userId}`);
            } else {
              const slug = generateSlug(`${draft.fields.title}-${draft.institutionName}`);
              savedResult = await storage.createCourse({
                title: draft.fields.title,
                universityId: draft.institutionId!,
                subject: draft.fields.subject,
                level: draft.fields.level,
                slug,
                discipline: draft.fields.discipline || null,
                duration: draft.fields.duration || null,
                fees: draft.fields.fees ? String(draft.fields.fees) : null,
                currency: draft.fields.currency || "AUD",
                country: draft.fields.country || null,
                location: draft.fields.location || null,
                startDate: draft.fields.startDate || null,
                deliveryMode: draft.fields.deliveryMode || null,
                description: draft.fields.description || null,
                approvalStatus: "pending",
                publishStatus: "draft",
                createdByUserId: userId,
                assignedToUserId: userId,
              } as any);
              console.log(`[AdminChat] Course created via confirm: "${draft.fields.title}" (id: ${savedResult.id}) by user ${userId}`);
            }

            const savedName = savedResult.name || savedResult.title;
            const assistantContent = `Done! **${savedName}** has been saved as a draft ${draft.type}. It will need approval before it goes live.`;
            const savedInfo = { type: draft.type, name: savedName, id: savedResult.id };
            const sourcesPayload = JSON.stringify({ dataEntrySaved: savedInfo });

            const [saved] = await db
              .insert(chatMessages)
              .values({ conversationId, role: "assistant", content: assistantContent, sources: sourcesPayload })
              .returning();

            return res.json({ ...saved, dataEntrySaved: savedInfo });
          } catch (err: any) {
            console.error("[AdminChat] confirm-save error:", err);
            const errorMsg = err.code === "23505"
              ? `A ${draft.type} with this name already exists. Please use a different name.`
              : `I encountered an error saving the ${draft.type}. Please try again.`;
            const [saved] = await db
              .insert(chatMessages)
              .values({ conversationId, role: "assistant", content: errorMsg, sources: null })
              .returning();
            return res.json(saved);
          }
        }

        const systemPrompt = buildSystemPrompt(ctx, pendingDraft);

        const history = await db
          .select()
          .from(chatMessages)
          .where(eq(chatMessages.conversationId, conversationId))
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

        const completionParams: OpenAI.Chat.ChatCompletionCreateParams = {
          model: "gpt-4o-mini",
          messages: openaiMessages,
          max_tokens: 500,
          temperature: 0.4,
        };

        if (canDoDataEntry) {
          completionParams.tools = dataEntryTools;
          completionParams.tool_choice = "auto";
        }

        const completion = await openai.chat.completions.create(completionParams);

        const choice = completion.choices[0];
        let assistantContent: string;
        let dataEntryPreview: DataEntryPreview | null = null;

        if (choice?.message?.tool_calls?.length) {
          const toolCall = choice.message.tool_calls[0];
          const result = await handleDataEntryToolCall(toolCall, conversationId);
          assistantContent = result.message;
          dataEntryPreview = result.preview;
        } else {
          assistantContent = choice?.message?.content ?? "I'm not sure how to help with that. Could you rephrase?";
        }

        const sourcesPayload = dataEntryPreview
          ? JSON.stringify({ dataEntryPreview })
          : null;

        const [saved] = await db
          .insert(chatMessages)
          .values({
            conversationId,
            role: "assistant",
            content: assistantContent,
            sources: sourcesPayload,
          })
          .returning();

        const response: any = { ...saved };
        if (dataEntryPreview) {
          response.dataEntryPreview = dataEntryPreview;
        }

        res.json(response);
      } catch (err) {
        console.error("[AdminChat] send message error:", err);
        res.status(500).json({ message: "Failed to send message" });
      }
    }
  );

  app.post("/api/admin-chat/data-entry/institutions", requireAdmin, async (req: any, res: Response) => {
    try {
      const userId = getUserId(req)!;
      const access = await checkAdminAccess(userId, ['cto', 'marketing_executive']);
      if (!access) {
        return res.status(403).json({ message: "Only CTO and Marketing Executive roles can create institutions via Zan" });
      }

      const { name, country, description, website, contactEmail, contactPhone, providerType, establishedYear, numberOfCampuses } = req.body;

      if (!name || !country) {
        return res.status(400).json({ message: "Name and country are required" });
      }

      if (!description || String(description).length < 50) {
        return res.status(400).json({ message: "Description is required and must be at least 50 characters" });
      }

      const slug = generateSlug(name);

      const newInstitution = await storage.createUniversity({
        name,
        country,
        description,
        website: website || null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        providerType: providerType || null,
        establishedYear: establishedYear ? Number(establishedYear) : null,
        numberOfCampuses: numberOfCampuses ? Number(numberOfCampuses) : null,
        slug,
        approvalStatus: "pending",
        publishStatus: "draft",
        createdByUserId: userId,
        updatedByUserId: userId,
        assignedToUserId: userId,
      });

      console.log(`[AdminChat] Institution created via Zan: "${name}" (id: ${newInstitution.id}) by user ${userId}`);

      res.status(201).json({
        id: newInstitution.id,
        name: newInstitution.name,
        slug: (newInstitution as any).slug,
      });
    } catch (err: any) {
      console.error("[AdminChat] data-entry institution error:", err);
      if (err.code === "23505") {
        return res.status(409).json({ message: "An institution with this name already exists" });
      }
      res.status(500).json({ message: "Failed to create institution" });
    }
  });

  app.post("/api/admin-chat/data-entry/courses", requireAdmin, async (req: any, res: Response) => {
    try {
      const userId = getUserId(req)!;
      const access = await checkAdminAccess(userId, ['cto', 'marketing_executive']);
      if (!access) {
        return res.status(403).json({ message: "Only CTO and Marketing Executive roles can create courses via Zan" });
      }

      const { title, institutionId, subject, level, discipline, duration, fees, currency, country, location, startDate, deliveryMode, description } = req.body;

      if (!title || !institutionId || !subject || !level) {
        return res.status(400).json({ message: "Title, institution, subject, and level are required" });
      }

      const institution = await storage.getUniversityById(institutionId);
      if (!institution) {
        return res.status(404).json({ message: "Institution not found" });
      }

      const slug = generateSlug(`${title}-${institution.name}`);

      const courseData: any = {
        title,
        universityId: institutionId,
        subject,
        level,
        slug,
        discipline: discipline || null,
        duration: duration || null,
        fees: fees ? String(fees) : null,
        currency: currency || "AUD",
        country: country || institution.country || null,
        location: location || null,
        startDate: startDate || null,
        deliveryMode: deliveryMode || null,
        description: description || null,
        approvalStatus: "pending",
        publishStatus: "draft",
        createdByUserId: userId,
        assignedToUserId: userId,
      };

      const newCourse = await storage.createCourse(courseData);

      console.log(`[AdminChat] Course created via Zan: "${title}" (id: ${newCourse.id}) at "${institution.name}" by user ${userId}`);

      res.status(201).json({
        id: newCourse.id,
        title: newCourse.title,
        institutionName: institution.name,
        slug: (newCourse as any).slug,
      });
    } catch (err: any) {
      console.error("[AdminChat] data-entry course error:", err);
      if (err.code === "23505") {
        return res.status(409).json({ message: "A course with this title at this institution already exists" });
      }
      res.status(500).json({ message: "Failed to create course" });
    }
  });

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

  console.log("[AdminChat] Admin chat routes registered (with data entry)");
}
