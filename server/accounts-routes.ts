import type { Express, Request, Response } from "express";
import multer from "multer";
import { db } from "./db";
import { isUnifiedAuthenticated } from "./supabase-middleware";
import { checkAdminAccess } from "./routes";
import {
  accounts,
  accountProducts,
  accountRestrictedDetails,
  accountNotes,
  crmContacts,
  accInvoices,
  applications,
  courses,
  universities,
  users,
  insertAccountSchema,
  insertAccountProductSchema,
  insertAccountRestrictedDetailsSchema,
} from "@shared/schema";
import { eq, and, ilike, or, sql, desc, sum } from "drizzle-orm";

const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

function getUserId(req: any): string | null {
  return req.user?.id || req.user?.claims?.sub || null;
}

async function requireAdmin(req: any, res: Response): Promise<string | null> {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ message: "Not authenticated" }); return null; }
  const ok = await checkAdminAccess(userId);
  if (!ok) { res.status(403).json({ message: "Forbidden" }); return null; }
  return userId;
}

export function registerAccountsRoutes(app: Express) {

  // GET /api/admin/accounts — list all accounts with optional ?type= and ?search= filters
  app.get("/api/admin/accounts", isUnifiedAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = await requireAdmin(req, res);
      if (!userId) return;

      const { type, search, active } = req.query as any;

      const conditions: any[] = [];
      if (type) conditions.push(eq(accounts.accountType, type));
      if (active !== undefined) conditions.push(eq(accounts.isActive, active !== 'false'));
      if (search) {
        conditions.push(
          or(
            ilike(accounts.name, `%${search}%`),
            ilike(accounts.email, `%${search}%`),
            ilike(accounts.country, `%${search}%`)
          )
        );
      }

      const rows = conditions.length > 0
        ? await db.select().from(accounts).where(and(...conditions)).orderBy(accounts.name)
        : await db.select().from(accounts).orderBy(accounts.name);

      res.json(rows);
    } catch (err: any) {
      console.error("[Accounts] GET / error:", err);
      res.status(500).json({ message: "Failed to fetch accounts" });
    }
  });

  // GET /api/admin/accounts/by-type/:type — used by dropdowns
  app.get("/api/admin/accounts/by-type/:type", isUnifiedAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = await requireAdmin(req, res);
      if (!userId) return;

      const { type } = req.params;
      const rows = await db
        .select({ id: accounts.id, name: accounts.name, country: accounts.country, logoUrl: accounts.logoUrl })
        .from(accounts)
        .where(and(eq(accounts.accountType, type as any), eq(accounts.isActive, true)))
        .orderBy(accounts.name);

      res.json(rows);
    } catch (err: any) {
      console.error("[Accounts] GET /by-type error:", err);
      res.status(500).json({ message: "Failed to fetch accounts" });
    }
  });

  // GET /api/admin/accounts/:id — single account with products and linked primary contact
  app.get("/api/admin/accounts/:id", isUnifiedAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = await requireAdmin(req, res);
      if (!userId) return;

      const { id } = req.params;

      const rows = await db
        .select({
          account: accounts,
          primaryContact: {
            id: crmContacts.id,
            firstName: crmContacts.firstName,
            lastName: crmContacts.lastName,
            email: crmContacts.email,
            contactType: crmContacts.contactType,
            photo: crmContacts.photo,
          },
        })
        .from(accounts)
        .leftJoin(crmContacts, eq(accounts.primaryContactId, crmContacts.id))
        .where(eq(accounts.id, id))
        .limit(1);

      if (!rows.length) return res.status(404).json({ message: "Account not found" });

      const { account, primaryContact } = rows[0];

      const products = await db
        .select()
        .from(accountProducts)
        .where(eq(accountProducts.accountId, id))
        .orderBy(accountProducts.name);

      res.json({ ...account, primaryContact: primaryContact?.id ? primaryContact : null, products });
    } catch (err: any) {
      console.error("[Accounts] GET /:id error:", err);
      res.status(500).json({ message: "Failed to fetch account" });
    }
  });

  // POST /api/admin/accounts — create
  app.post("/api/admin/accounts", isUnifiedAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = await requireAdmin(req, res);
      if (!userId) return;

      const parsed = insertAccountSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.issues });

      const [created] = await db.insert(accounts).values(parsed.data).returning();
      res.status(201).json(created);
    } catch (err: any) {
      console.error("[Accounts] POST / error:", err);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  // PATCH /api/admin/accounts/:id — update
  app.patch("/api/admin/accounts/:id", isUnifiedAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = await requireAdmin(req, res);
      if (!userId) return;

      const { id } = req.params;
      const updateData = { ...req.body, updatedAt: new Date() };
      delete updateData.id;
      delete updateData.createdAt;

      const [updated] = await db
        .update(accounts)
        .set(updateData)
        .where(eq(accounts.id, id))
        .returning();

      if (!updated) return res.status(404).json({ message: "Account not found" });
      res.json(updated);
    } catch (err: any) {
      console.error("[Accounts] PATCH /:id error:", err);
      res.status(500).json({ message: "Failed to update account" });
    }
  });

  // DELETE /api/admin/accounts/:id — soft delete
  app.delete("/api/admin/accounts/:id", isUnifiedAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = await requireAdmin(req, res);
      if (!userId) return;

      const { id } = req.params;
      const [updated] = await db
        .update(accounts)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(accounts.id, id))
        .returning();

      if (!updated) return res.status(404).json({ message: "Account not found" });
      res.json({ success: true });
    } catch (err: any) {
      console.error("[Accounts] DELETE /:id error:", err);
      res.status(500).json({ message: "Failed to deactivate account" });
    }
  });

  // ─── Products ─────────────────────────────────────────────────────────────

  app.get("/api/admin/accounts/:id/products", isUnifiedAuthenticated, async (req: any, res: Response) => {
    try {
      if (!await requireAdmin(req, res)) return;
      const rows = await db
        .select()
        .from(accountProducts)
        .where(eq(accountProducts.accountId, req.params.id))
        .orderBy(accountProducts.name);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post("/api/admin/accounts/:id/products", isUnifiedAuthenticated, async (req: any, res: Response) => {
    try {
      if (!await requireAdmin(req, res)) return;
      const parsed = insertAccountProductSchema.safeParse({ ...req.body, accountId: req.params.id });
      if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.issues });
      const [created] = await db.insert(accountProducts).values(parsed.data).returning();
      res.status(201).json(created);
    } catch (err: any) {
      console.error("[Accounts] POST /:id/products error:", err);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.patch("/api/admin/accounts/:id/products/:productId", isUnifiedAuthenticated, async (req: any, res: Response) => {
    try {
      if (!await requireAdmin(req, res)) return;
      const updateData = { ...req.body };
      delete updateData.id;
      delete updateData.accountId;
      delete updateData.createdAt;
      const [updated] = await db
        .update(accountProducts)
        .set(updateData)
        .where(and(eq(accountProducts.id, req.params.productId), eq(accountProducts.accountId, req.params.id)))
        .returning();
      if (!updated) return res.status(404).json({ message: "Product not found" });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete("/api/admin/accounts/:id/products/:productId", isUnifiedAuthenticated, async (req: any, res: Response) => {
    try {
      if (!await requireAdmin(req, res)) return;
      await db
        .delete(accountProducts)
        .where(and(eq(accountProducts.id, req.params.productId), eq(accountProducts.accountId, req.params.id)));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // ─── Restricted Details (Banking / Contract) ───────────────────────────────

  app.get("/api/admin/accounts/:id/restricted", isUnifiedAuthenticated, async (req: any, res: Response) => {
    try {
      if (!await requireAdmin(req, res)) return;
      const [row] = await db
        .select()
        .from(accountRestrictedDetails)
        .where(eq(accountRestrictedDetails.accountId, req.params.id))
        .limit(1);
      res.json(row || null);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to fetch restricted details" });
    }
  });

  app.put("/api/admin/accounts/:id/restricted", isUnifiedAuthenticated, async (req: any, res: Response) => {
    try {
      if (!await requireAdmin(req, res)) return;
      const accountId = req.params.id;
      const updateData = { ...req.body, accountId, updatedAt: new Date() };
      delete updateData.id;

      const [existing] = await db
        .select({ id: accountRestrictedDetails.id })
        .from(accountRestrictedDetails)
        .where(eq(accountRestrictedDetails.accountId, accountId))
        .limit(1);

      let result;
      if (existing) {
        [result] = await db
          .update(accountRestrictedDetails)
          .set(updateData)
          .where(eq(accountRestrictedDetails.accountId, accountId))
          .returning();
      } else {
        [result] = await db
          .insert(accountRestrictedDetails)
          .values(updateData)
          .returning();
      }
      res.json(result);
    } catch (err: any) {
      console.error("[Accounts] PUT /:id/restricted error:", err);
      res.status(500).json({ message: "Failed to save restricted details" });
    }
  });

  // ─── Account Notes ─────────────────────────────────────────────────────────

  app.get("/api/admin/accounts/:id/notes", isUnifiedAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = await requireAdmin(req, res);
      if (!userId) return;

      const accountId = req.params.id;
      const notes = await db
        .select({
          id: accountNotes.id,
          accountId: accountNotes.accountId,
          content: accountNotes.content,
          mentions: accountNotes.mentions,
          visibility: accountNotes.visibility,
          visibleTo: accountNotes.visibleTo,
          createdById: accountNotes.createdById,
          createdAt: accountNotes.createdAt,
          authorFirstName: users.firstName,
          authorLastName: users.lastName,
          authorEmail: users.email,
          authorProfileImageUrl: users.profileImageUrl,
        })
        .from(accountNotes)
        .leftJoin(users, eq(accountNotes.createdById, users.id))
        .where(eq(accountNotes.accountId, accountId))
        .orderBy(desc(accountNotes.createdAt));

      const canSeeNote = (authorId: string, vis: string, mentions: string[] | null, visibleTo: string[] | null) => {
        if (vis === "public") return true;
        if (userId === authorId) return true;
        if (vis === "private") return (mentions || []).includes(userId);
        if (vis === "selected") return (visibleTo || []).includes(userId);
        return true;
      };

      res.json(notes
        .filter(n => canSeeNote(n.createdById, n.visibility ?? "public", n.mentions, n.visibleTo))
        .map(n => ({
          id: n.id,
          accountId: n.accountId,
          content: n.content,
          mentions: n.mentions,
          visibility: n.visibility,
          visibleTo: n.visibleTo,
          createdById: n.createdById,
          createdAt: n.createdAt,
          author: {
            id: n.createdById,
            firstName: n.authorFirstName,
            lastName: n.authorLastName,
            email: n.authorEmail,
            profileImageUrl: n.authorProfileImageUrl,
          },
        })));
    } catch (err: any) {
      console.error("[Accounts] GET /:id/notes error:", err);
      res.status(500).json({ message: "Failed to fetch notes" });
    }
  });

  app.post("/api/admin/accounts/:id/notes", isUnifiedAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = await requireAdmin(req, res);
      if (!userId) return;

      const accountId = req.params.id;
      const { content, mentions, visibility, visibleTo } = req.body;
      if (!content) return res.status(400).json({ message: "Content is required" });

      const [newNote] = await db.insert(accountNotes).values({
        accountId,
        content,
        mentions: mentions || [],
        visibility: visibility || "public",
        visibleTo: visibleTo || [],
        createdById: userId,
      }).returning();

      const author = await db.select().from(users).where(eq(users.id, userId)).limit(1).then(r => r[0]);

      res.status(201).json({
        ...newNote,
        author: author ? {
          id: author.id,
          firstName: author.firstName,
          lastName: author.lastName,
          email: author.email,
          profileImageUrl: author.profileImageUrl,
        } : null,
      });
    } catch (err: any) {
      console.error("[Accounts] POST /:id/notes error:", err);
      res.status(500).json({ message: "Failed to create note" });
    }
  });

  app.put("/api/admin/accounts/:id/notes/:noteId", isUnifiedAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = await requireAdmin(req, res);
      if (!userId) return;

      const { noteId } = req.params;
      const { content, mentions, visibility, visibleTo } = req.body;

      const [existing] = await db
        .select()
        .from(accountNotes)
        .where(eq(accountNotes.id, noteId))
        .limit(1);
      if (!existing) return res.status(404).json({ message: "Note not found" });

      const [updated] = await db
        .update(accountNotes)
        .set({
          content: content || existing.content,
          mentions: mentions !== undefined ? mentions : existing.mentions,
          visibility: visibility || existing.visibility,
          visibleTo: visibleTo !== undefined ? visibleTo : existing.visibleTo,
        })
        .where(eq(accountNotes.id, noteId))
        .returning();

      res.json(updated);
    } catch (err: any) {
      console.error("[Accounts] PUT /:id/notes/:noteId error:", err);
      res.status(500).json({ message: "Failed to update note" });
    }
  });

  app.delete("/api/admin/accounts/:id/notes/:noteId", isUnifiedAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = await requireAdmin(req, res);
      if (!userId) return;

      const { noteId } = req.params;
      const [existing] = await db
        .select()
        .from(accountNotes)
        .where(eq(accountNotes.id, noteId))
        .limit(1);
      if (!existing) return res.status(404).json({ message: "Note not found" });

      await db.delete(accountNotes).where(eq(accountNotes.id, noteId));
      res.json({ success: true });
    } catch (err: any) {
      console.error("[Accounts] DELETE /:id/notes/:noteId error:", err);
      res.status(500).json({ message: "Failed to delete note" });
    }
  });

  // ─── Related Panel Routes ──────────────────────────────────────────────────

  // GET /api/admin/accounts/:id/related/invoices
  app.get("/api/admin/accounts/:id/related/invoices", isUnifiedAuthenticated, async (req: any, res: Response) => {
    try {
      if (!await requireAdmin(req, res)) return;
      const accountId = req.params.id;

      const invoices = await db
        .select({
          id: accInvoices.id,
          invoiceNumber: accInvoices.invoiceNumber,
          status: accInvoices.status,
          total: accInvoices.total,
          amountPaid: accInvoices.amountPaid,
          dueDate: accInvoices.dueDate,
          issueDate: accInvoices.issueDate,
        })
        .from(accInvoices)
        .where(eq(accInvoices.accountId, accountId))
        .orderBy(desc(accInvoices.createdAt))
        .limit(5);

      const [totals] = await db
        .select({
          totalOutstanding: sql<string>`COALESCE(SUM(CAST(${accInvoices.total} AS NUMERIC) - CAST(${accInvoices.amountPaid} AS NUMERIC)), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(accInvoices)
        .where(and(
          eq(accInvoices.accountId, accountId),
          sql`${accInvoices.status} NOT IN ('paid', 'void', 'draft')`
        ));

      res.json({
        invoices,
        totalOutstanding: totals?.totalOutstanding || "0",
        totalCount: Number(totals?.count || 0),
      });
    } catch (err: any) {
      console.error("[Accounts] GET /:id/related/invoices error:", err);
      res.status(500).json({ message: "Failed to fetch related invoices" });
    }
  });

  // GET /api/admin/accounts/:id/related/contacts
  app.get("/api/admin/accounts/:id/related/contacts", isUnifiedAuthenticated, async (req: any, res: Response) => {
    try {
      if (!await requireAdmin(req, res)) return;
      const accountId = req.params.id;

      const contacts = await db
        .select({
          id: crmContacts.id,
          firstName: crmContacts.firstName,
          lastName: crmContacts.lastName,
          email: crmContacts.email,
          contactType: crmContacts.contactType,
          photo: crmContacts.photo,
          clientStatus: crmContacts.clientStatus,
        })
        .from(crmContacts)
        .where(eq(crmContacts.accountId, accountId))
        .orderBy(crmContacts.firstName);

      res.json({ contacts, totalCount: contacts.length });
    } catch (err: any) {
      console.error("[Accounts] GET /:id/related/contacts error:", err);
      res.status(500).json({ message: "Failed to fetch related contacts" });
    }
  });

  // GET /api/admin/accounts/:id/related/applications
  app.get("/api/admin/accounts/:id/related/applications", isUnifiedAuthenticated, async (req: any, res: Response) => {
    try {
      if (!await requireAdmin(req, res)) return;
      const accountId = req.params.id;

      // Find institution linked to this account, then count applications via courses
      const linkedInstitution = await db
        .select({ institutionCmsId: accounts.institutionCmsId })
        .from(accounts)
        .where(eq(accounts.id, accountId))
        .limit(1)
        .then(r => r[0]);

      if (!linkedInstitution?.institutionCmsId) {
        return res.json({ pending: 0, active: 0, completed: 0, total: 0 });
      }

      const instId = linkedInstitution.institutionCmsId;

      const counts = await db
        .select({
          status: applications.status,
          count: sql<number>`COUNT(*)`,
        })
        .from(applications)
        .innerJoin(courses, eq(courses.id, applications.courseId))
        .where(eq(courses.universityId, instId))
        .groupBy(applications.status);

      const result = { pending: 0, active: 0, completed: 0, total: 0 };
      for (const row of counts) {
        const n = Number(row.count);
        result.total += n;
        if (row.status === "pending") result.pending += n;
        else if (row.status === "reviewing") result.active += n;
        else if (row.status === "accepted") result.completed += n;
      }

      res.json(result);
    } catch (err: any) {
      console.error("[Accounts] GET /:id/related/applications error:", err);
      res.status(500).json({ message: "Failed to fetch related applications" });
    }
  });

  // GET /api/admin/accounts/:id/related/institutions
  app.get("/api/admin/accounts/:id/related/institutions", isUnifiedAuthenticated, async (req: any, res: Response) => {
    try {
      if (!await requireAdmin(req, res)) return;
      const accountId = req.params.id;

      const linked = await db
        .select({
          id: universities.id,
          name: universities.name,
          country: universities.country,
          logo: universities.logo,
        })
        .from(accounts)
        .innerJoin(universities, eq(universities.id, accounts.institutionCmsId))
        .where(eq(accounts.id, accountId))
        .limit(10);

      res.json({ institutions: linked, totalCount: linked.length });
    } catch (err: any) {
      console.error("[Accounts] GET /:id/related/institutions error:", err);
      res.status(500).json({ message: "Failed to fetch related institutions" });
    }
  });

  // POST /api/admin/accounts/upload-logo — upload account logo to object storage
  app.post("/api/admin/accounts/upload-logo", isUnifiedAuthenticated, logoUpload.single("logo"), async (req: any, res: Response) => {
    try {
      const userId = await requireAdmin(req, res);
      if (!userId) return;

      if (!req.file) return res.status(400).json({ message: "No file uploaded" });

      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ message: "Only image files are accepted (JPEG, PNG, GIF, WebP)" });
      }
      if (req.file.size > 5 * 1024 * 1024) {
        return res.status(400).json({ message: "Logo file must be under 5MB" });
      }

      const ext = req.file.mimetype === "image/png" ? "png"
        : req.file.mimetype === "image/gif" ? "gif"
        : req.file.mimetype === "image/webp" ? "webp"
        : "jpg";
      const filename = `account-logo-${Date.now()}.${ext}`;
      const { uploadFile: osUpload } = await import("./file-storage");
      const osResult = await osUpload(`public/account-logos/${filename}`, req.file.buffer, req.file.mimetype);
      if (!osResult.ok) {
        console.error(`[Accounts] Failed to upload account logo to Object Storage: ${filename}`);
        return res.status(500).json({ message: "Failed to upload logo to storage" });
      }
      const logoUrl = `/account-logos/${filename}`;

      res.json({ logoUrl });
    } catch (err: any) {
      console.error("[Accounts] POST /upload-logo error:", err);
      res.status(500).json({ message: "Failed to upload logo" });
    }
  });

  console.log("[Accounts] Routes registered");
}
