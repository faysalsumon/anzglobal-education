import type { Express, Request, Response } from "express";
import path from "path";
import fs from "fs/promises";
import multer from "multer";
import { db } from "./db";
import { isUnifiedAuthenticated } from "./supabase-middleware";
import { checkAdminAccess } from "./routes";
import {
  accounts,
  accountProducts,
  accountRestrictedDetails,
  crmContacts,
  insertAccountSchema,
  insertAccountProductSchema,
  insertAccountRestrictedDetailsSchema,
} from "@shared/schema";
import { eq, and, ilike, or, sql } from "drizzle-orm";

const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

export function registerAccountsRoutes(app: Express) {

  // GET /api/admin/accounts — list all accounts with optional ?type= and ?search= filters
  app.get("/api/admin/accounts", isUnifiedAuthenticated, async (req: any, res: Response) => {
    try {
      const user = req.user as any;
      const userId = user.id || user.claims?.sub;
      const adminCheck = await checkAdminAccess(userId);
      if (!adminCheck) return res.status(403).json({ message: "Forbidden" });

      const { type, search, active } = req.query as any;

      let query = db.select().from(accounts);
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
      const user = req.user as any;
      const userId = user.id || user.claims?.sub;
      const adminCheck = await checkAdminAccess(userId);
      if (!adminCheck) return res.status(403).json({ message: "Forbidden" });

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
      const user = req.user as any;
      const userId = user.id || user.claims?.sub;
      const adminCheck = await checkAdminAccess(userId);
      if (!adminCheck) return res.status(403).json({ message: "Forbidden" });

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
      const user = req.user as any;
      const userId = user.id || user.claims?.sub;
      const adminCheck = await checkAdminAccess(userId);
      if (!adminCheck) return res.status(403).json({ message: "Forbidden" });

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
      const user = req.user as any;
      const userId = user.id || user.claims?.sub;
      const adminCheck = await checkAdminAccess(userId);
      if (!adminCheck) return res.status(403).json({ message: "Forbidden" });

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
      const user = req.user as any;
      const userId = user.id || user.claims?.sub;
      const adminCheck = await checkAdminAccess(userId);
      if (!adminCheck) return res.status(403).json({ message: "Forbidden" });

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

  // GET /api/admin/accounts/:id/products
  app.get("/api/admin/accounts/:id/products", isUnifiedAuthenticated, async (req: any, res: Response) => {
    try {
      const user = req.user as any;
      const userId = user.id || user.claims?.sub;
      const adminCheck = await checkAdminAccess(userId);
      if (!adminCheck) return res.status(403).json({ message: "Forbidden" });

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

  // POST /api/admin/accounts/:id/products
  app.post("/api/admin/accounts/:id/products", isUnifiedAuthenticated, async (req: any, res: Response) => {
    try {
      const user = req.user as any;
      const userId = user.id || user.claims?.sub;
      const adminCheck = await checkAdminAccess(userId);
      if (!adminCheck) return res.status(403).json({ message: "Forbidden" });

      const parsed = insertAccountProductSchema.safeParse({ ...req.body, accountId: req.params.id });
      if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.issues });

      const [created] = await db.insert(accountProducts).values(parsed.data).returning();
      res.status(201).json(created);
    } catch (err: any) {
      console.error("[Accounts] POST /:id/products error:", err);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  // PATCH /api/admin/accounts/:id/products/:productId
  app.patch("/api/admin/accounts/:id/products/:productId", isUnifiedAuthenticated, async (req: any, res: Response) => {
    try {
      const user = req.user as any;
      const userId = user.id || user.claims?.sub;
      const adminCheck = await checkAdminAccess(userId);
      if (!adminCheck) return res.status(403).json({ message: "Forbidden" });

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

  // DELETE /api/admin/accounts/:id/products/:productId
  app.delete("/api/admin/accounts/:id/products/:productId", isUnifiedAuthenticated, async (req: any, res: Response) => {
    try {
      const user = req.user as any;
      const userId = user.id || user.claims?.sub;
      const adminCheck = await checkAdminAccess(userId);
      if (!adminCheck) return res.status(403).json({ message: "Forbidden" });

      await db
        .delete(accountProducts)
        .where(and(eq(accountProducts.id, req.params.productId), eq(accountProducts.accountId, req.params.id)));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // ─── Restricted Details (Banking / Contract) ───────────────────────────────

  // GET /api/admin/accounts/:id/restricted
  app.get("/api/admin/accounts/:id/restricted", isUnifiedAuthenticated, async (req: any, res: Response) => {
    try {
      const user = req.user as any;
      const userId = user.id || user.claims?.sub;
      const adminCheck = await checkAdminAccess(userId);
      if (!adminCheck) return res.status(403).json({ message: "Forbidden" });

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

  // PUT /api/admin/accounts/:id/restricted — upsert
  app.put("/api/admin/accounts/:id/restricted", isUnifiedAuthenticated, async (req: any, res: Response) => {
    try {
      const user = req.user as any;
      const userId = user.id || user.claims?.sub;
      const adminCheck = await checkAdminAccess(userId);
      if (!adminCheck) return res.status(403).json({ message: "Forbidden" });

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

  // POST /api/admin/accounts/upload-logo — upload account logo to object storage
  app.post("/api/admin/accounts/upload-logo", isUnifiedAuthenticated, logoUpload.single("logo"), async (req: any, res: Response) => {
    try {
      const user = req.user as any;
      const userId = user.id || user.claims?.sub;
      const adminCheck = await checkAdminAccess(userId);
      if (!adminCheck) return res.status(403).json({ message: "Forbidden" });

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
      const localDir = path.join(process.cwd(), "public", "account-logos");
      await fs.mkdir(localDir, { recursive: true });
      await fs.writeFile(path.join(localDir, filename), req.file.buffer);

      const logoUrl = `/account-logos/${filename}`;

      try {
        const { Client: ObjClient } = await import("@replit/object-storage");
        const objClient = new ObjClient();
        await objClient.uploadFromBytes(`public/account-logos/${filename}`, req.file.buffer, { contentType: req.file.mimetype });
      } catch (_) { /* object storage optional */ }

      res.json({ logoUrl });
    } catch (err: any) {
      console.error("[Accounts] POST /upload-logo error:", err);
      res.status(500).json({ message: "Failed to upload logo" });
    }
  });

  console.log("[Accounts] Routes registered");
}
