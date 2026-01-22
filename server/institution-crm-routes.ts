import { Router } from "express";
import { db } from "./db";
import { storage } from "./storage";
import { 
  institutionContacts, 
  institutionBusinessTerms, 
  institutionDocuments,
  crmContacts,
  users,
  universities,
  insertInstitutionContactSchema,
  updateInstitutionContactSchema,
  insertInstitutionBusinessTermsSchema,
  updateInstitutionBusinessTermsSchema,
  insertInstitutionDocumentSchema,
  updateInstitutionDocumentSchema,
} from "@shared/schema";
import { eq, desc, and, asc } from "drizzle-orm";
import { logActivity } from "./activity-logger";
import multer from "multer";
import path from "path";
import fs from "fs/promises";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

function getUserId(req: any): string | null {
  if (!req.user) return null;
  return req.user.claims?.sub || req.user.id || null;
}

async function isAdminTeamMember(userId: string): Promise<{ isAdmin: boolean; role: string | null }> {
  const adminMember = await storage.getAdminTeamMemberByUserId(userId);
  if (adminMember && adminMember.isActive) {
    return { isAdmin: true, role: adminMember.role };
  }
  
  const user = await storage.getUser(userId);
  if (user?.userType === 'admin' || user?.userType === 'platform_admin') {
    return { isAdmin: true, role: user.userType };
  }
  
  return { isAdmin: false, role: null };
}

async function requireAdmin(req: any, res: any, next: any) {
  try {
    // Support both Supabase and session-based auth
    // isAuthenticated middleware from supabase-middleware.ts already validates auth
    // and sets up req.user with claims.sub
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const { isAdmin } = await isAdminTeamMember(userId);
    if (!isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    next();
  } catch (error) {
    console.error("Error in admin authentication:", error);
    next(error);
  }
}

// ============================================
// INSTITUTION CONTACTS ROUTES
// ============================================

router.get("/institutions/:institutionId/contacts", requireAdmin, async (req: any, res) => {
  try {
    const { institutionId } = req.params;
    
    const contacts = await db
      .select({
        id: institutionContacts.id,
        institutionId: institutionContacts.institutionId,
        contactId: institutionContacts.contactId,
        contactRole: institutionContacts.contactRole,
        roleTitle: institutionContacts.roleTitle,
        department: institutionContacts.department,
        isPrimary: institutionContacts.isPrimary,
        notes: institutionContacts.notes,
        createdAt: institutionContacts.createdAt,
        updatedAt: institutionContacts.updatedAt,
        createdByUserId: institutionContacts.createdByUserId,
        contact: {
          id: crmContacts.id,
          firstName: crmContacts.firstName,
          lastName: crmContacts.lastName,
          email: crmContacts.email,
          phone: crmContacts.phone,
          mobile: crmContacts.mobile,
          contactType: crmContacts.contactType,
        },
      })
      .from(institutionContacts)
      .leftJoin(crmContacts, eq(institutionContacts.contactId, crmContacts.id))
      .where(eq(institutionContacts.institutionId, institutionId))
      .orderBy(desc(institutionContacts.isPrimary), asc(institutionContacts.contactRole));
    
    res.json(contacts);
  } catch (error) {
    console.error("Error fetching institution contacts:", error);
    res.status(500).json({ message: "Failed to fetch institution contacts" });
  }
});

router.post("/institutions/:institutionId/contacts", requireAdmin, async (req: any, res) => {
  try {
    const { institutionId } = req.params;
    const userId = getUserId(req);
    
    const parsed = insertInstitutionContactSchema.safeParse({
      ...req.body,
      institutionId,
      createdByUserId: userId,
    });
    
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    }
    
    const institution = await db
      .select({ id: universities.id, name: universities.name })
      .from(universities)
      .where(eq(universities.id, institutionId))
      .limit(1);
    
    if (institution.length === 0) {
      return res.status(404).json({ message: "Institution not found" });
    }
    
    const contact = await db
      .select({ id: crmContacts.id })
      .from(crmContacts)
      .where(eq(crmContacts.id, parsed.data.contactId))
      .limit(1);
    
    if (contact.length === 0) {
      return res.status(404).json({ message: "Contact not found" });
    }
    
    const [newContact] = await db
      .insert(institutionContacts)
      .values(parsed.data)
      .returning();
    
    if (userId) {
      await logActivity({
        userId,
        action: 'created',
        entityType: 'institution' as any,
        entityId: newContact.id,
        entityName: institution[0].name,
        actionDescription: `Added contact (${parsed.data.contactRole}) to institution`,
      });
    }
    
    res.status(201).json(newContact);
  } catch (error: any) {
    console.error("Error adding institution contact:", error);
    if (error.code === '23505') {
      return res.status(409).json({ message: "This contact is already linked to this institution" });
    }
    res.status(500).json({ message: "Failed to add institution contact" });
  }
});

router.put("/institutions/:institutionId/contacts/:contactLinkId", requireAdmin, async (req: any, res) => {
  try {
    const { institutionId, contactLinkId } = req.params;
    const userId = getUserId(req);
    
    const parsed = updateInstitutionContactSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    }
    
    const [updated] = await db
      .update(institutionContacts)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(institutionContacts.id, contactLinkId),
          eq(institutionContacts.institutionId, institutionId)
        )
      )
      .returning();
    
    if (!updated) {
      return res.status(404).json({ message: "Contact link not found" });
    }
    
    if (userId) {
      await logActivity({
        userId,
        action: 'updated',
        entityType: 'institution' as any,
        entityId: contactLinkId,
        actionDescription: `Updated institution contact`,
      });
    }
    
    res.json(updated);
  } catch (error) {
    console.error("Error updating institution contact:", error);
    res.status(500).json({ message: "Failed to update institution contact" });
  }
});

router.delete("/institutions/:institutionId/contacts/:contactLinkId", requireAdmin, async (req: any, res) => {
  try {
    const { institutionId, contactLinkId } = req.params;
    const userId = getUserId(req);
    
    const [deleted] = await db
      .delete(institutionContacts)
      .where(
        and(
          eq(institutionContacts.id, contactLinkId),
          eq(institutionContacts.institutionId, institutionId)
        )
      )
      .returning();
    
    if (!deleted) {
      return res.status(404).json({ message: "Contact link not found" });
    }
    
    if (userId) {
      await logActivity({
        userId,
        action: 'deleted',
        entityType: 'institution' as any,
        entityId: contactLinkId,
        actionDescription: `Removed contact from institution`,
      });
    }
    
    res.json({ message: "Contact removed from institution" });
  } catch (error) {
    console.error("Error removing institution contact:", error);
    res.status(500).json({ message: "Failed to remove institution contact" });
  }
});

// ============================================
// INSTITUTION BUSINESS TERMS ROUTES
// ============================================

router.get("/institutions/:institutionId/business-terms", requireAdmin, async (req: any, res) => {
  try {
    const { institutionId } = req.params;
    
    const [terms] = await db
      .select()
      .from(institutionBusinessTerms)
      .where(eq(institutionBusinessTerms.institutionId, institutionId))
      .limit(1);
    
    if (!terms) {
      return res.json(null);
    }
    
    res.json(terms);
  } catch (error) {
    console.error("Error fetching business terms:", error);
    res.status(500).json({ message: "Failed to fetch business terms" });
  }
});

router.post("/institutions/:institutionId/business-terms", requireAdmin, async (req: any, res) => {
  try {
    const { institutionId } = req.params;
    const userId = getUserId(req);
    
    const existing = await db
      .select({ id: institutionBusinessTerms.id })
      .from(institutionBusinessTerms)
      .where(eq(institutionBusinessTerms.institutionId, institutionId))
      .limit(1);
    
    if (existing.length > 0) {
      return res.status(409).json({ message: "Business terms already exist for this institution. Use PUT to update." });
    }
    
    const parsed = insertInstitutionBusinessTermsSchema.safeParse({
      ...req.body,
      institutionId,
      createdByUserId: userId,
      updatedByUserId: userId,
    });
    
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    }
    
    const [newTerms] = await db
      .insert(institutionBusinessTerms)
      .values(parsed.data)
      .returning();
    
    if (userId) {
      await logActivity({
        userId,
        action: 'created',
        entityType: 'institution' as any,
        entityId: newTerms.id,
        actionDescription: `Created business terms for institution`,
      });
    }
    
    res.status(201).json(newTerms);
  } catch (error) {
    console.error("Error creating business terms:", error);
    res.status(500).json({ message: "Failed to create business terms" });
  }
});

router.put("/institutions/:institutionId/business-terms", requireAdmin, async (req: any, res) => {
  try {
    const { institutionId } = req.params;
    const userId = getUserId(req);
    
    const parsed = updateInstitutionBusinessTermsSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    }
    
    const existing = await db
      .select({ id: institutionBusinessTerms.id })
      .from(institutionBusinessTerms)
      .where(eq(institutionBusinessTerms.institutionId, institutionId))
      .limit(1);
    
    if (existing.length === 0) {
      const createParsed = insertInstitutionBusinessTermsSchema.safeParse({
        ...req.body,
        institutionId,
        createdByUserId: userId,
        updatedByUserId: userId,
      });
      
      if (!createParsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: createParsed.error.errors });
      }
      
      const [newTerms] = await db
        .insert(institutionBusinessTerms)
        .values(createParsed.data)
        .returning();
      
      if (userId) {
        await logActivity({
          userId,
          action: 'created',
          entityType: 'institution' as any,
          entityId: newTerms.id,
          actionDescription: `Created business terms for institution`,
        });
      }
      
      return res.status(201).json(newTerms);
    }
    
    const [updated] = await db
      .update(institutionBusinessTerms)
      .set({
        ...parsed.data,
        updatedByUserId: userId,
        updatedAt: new Date(),
      })
      .where(eq(institutionBusinessTerms.institutionId, institutionId))
      .returning();
    
    if (userId) {
      await logActivity({
        userId,
        action: 'updated',
        entityType: 'institution' as any,
        entityId: updated.id,
        actionDescription: `Updated business terms for institution`,
      });
    }
    
    res.json(updated);
  } catch (error) {
    console.error("Error updating business terms:", error);
    res.status(500).json({ message: "Failed to update business terms" });
  }
});

// ============================================
// INSTITUTION DOCUMENTS ROUTES
// ============================================

router.get("/institutions/:institutionId/documents", requireAdmin, async (req: any, res) => {
  try {
    const { institutionId } = req.params;
    const { category } = req.query;
    
    let conditions = [eq(institutionDocuments.institutionId, institutionId)];
    
    if (category) {
      conditions.push(eq(institutionDocuments.category, category as any));
    }
    
    const documents = await db
      .select({
        id: institutionDocuments.id,
        institutionId: institutionDocuments.institutionId,
        fileName: institutionDocuments.fileName,
        originalFileName: institutionDocuments.originalFileName,
        filePath: institutionDocuments.filePath,
        fileSize: institutionDocuments.fileSize,
        mimeType: institutionDocuments.mimeType,
        category: institutionDocuments.category,
        description: institutionDocuments.description,
        isConfidential: institutionDocuments.isConfidential,
        createdAt: institutionDocuments.createdAt,
        uploadedBy: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(institutionDocuments)
      .leftJoin(users, eq(institutionDocuments.uploadedByUserId, users.id))
      .where(and(...conditions))
      .orderBy(desc(institutionDocuments.createdAt));
    
    res.json(documents);
  } catch (error) {
    console.error("Error fetching institution documents:", error);
    res.status(500).json({ message: "Failed to fetch documents" });
  }
});

router.post(
  "/institutions/:institutionId/documents",
  requireAdmin,
  upload.single("file"),
  async (req: any, res) => {
    try {
      const { institutionId } = req.params;
      const userId = getUserId(req);
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const institution = await db
        .select({ id: universities.id, name: universities.name })
        .from(universities)
        .where(eq(universities.id, institutionId))
        .limit(1);
      
      if (institution.length === 0) {
        return res.status(404).json({ message: "Institution not found" });
      }
      
      const { category = "other", description, isConfidential = true } = req.body;
      
      const timestamp = Date.now();
      const ext = path.extname(file.originalname);
      const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, "_");
      const fileName = `${baseName}_${timestamp}${ext}`;
      
      // Use local file storage (like testimonials) for reliability
      const localDir = path.join(process.cwd(), 'private', 'institutions', institutionId, category);
      await fs.mkdir(localDir, { recursive: true });
      const storagePath = path.join(localDir, fileName);
      await fs.writeFile(storagePath, file.buffer);
      
      const [newDocument] = await db
        .insert(institutionDocuments)
        .values({
          institutionId,
          fileName,
          originalFileName: file.originalname,
          filePath: storagePath,
          fileSize: file.size,
          mimeType: file.mimetype,
          category: category as any,
          description,
          isConfidential: isConfidential === "true" || isConfidential === true,
          uploadedByUserId: userId,
        })
        .returning();
      
      if (userId) {
        await logActivity({
          userId,
          action: 'created',
          entityType: 'document' as any,
          entityId: newDocument.id,
          entityName: file.originalname,
          actionDescription: `Uploaded document to institution (${category})`,
        });
      }
      
      res.status(201).json(newDocument);
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  }
);

router.get("/institutions/:institutionId/documents/:documentId/download", requireAdmin, async (req: any, res) => {
  try {
    const { institutionId, documentId } = req.params;
    
    const [document] = await db
      .select()
      .from(institutionDocuments)
      .where(
        and(
          eq(institutionDocuments.id, documentId),
          eq(institutionDocuments.institutionId, institutionId)
        )
      )
      .limit(1);
    
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }
    
    // Read from local file storage
    try {
      const fileBuffer = await fs.readFile(document.filePath);
      
      res.setHeader("Content-Type", document.mimeType || "application/octet-stream");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(document.originalFileName)}"`
      );
      res.setHeader("Content-Length", fileBuffer.length);
      
      res.send(fileBuffer);
    } catch (fileError) {
      console.error("File not found:", document.filePath);
      return res.status(404).json({ message: "File not found in storage" });
    }
  } catch (error) {
    console.error("Error downloading document:", error);
    res.status(500).json({ message: "Failed to download document" });
  }
});

router.put("/institutions/:institutionId/documents/:documentId", requireAdmin, async (req: any, res) => {
  try {
    const { institutionId, documentId } = req.params;
    const userId = getUserId(req);
    
    const parsed = updateInstitutionDocumentSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    }
    
    const [updated] = await db
      .update(institutionDocuments)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(institutionDocuments.id, documentId),
          eq(institutionDocuments.institutionId, institutionId)
        )
      )
      .returning();
    
    if (!updated) {
      return res.status(404).json({ message: "Document not found" });
    }
    
    if (userId) {
      await logActivity({
        userId,
        action: 'updated',
        entityType: 'document' as any,
        entityId: documentId,
        actionDescription: `Updated institution document`,
      });
    }
    
    res.json(updated);
  } catch (error) {
    console.error("Error updating document:", error);
    res.status(500).json({ message: "Failed to update document" });
  }
});

router.delete("/institutions/:institutionId/documents/:documentId", requireAdmin, async (req: any, res) => {
  try {
    const { institutionId, documentId } = req.params;
    const userId = getUserId(req);
    
    const [document] = await db
      .select()
      .from(institutionDocuments)
      .where(
        and(
          eq(institutionDocuments.id, documentId),
          eq(institutionDocuments.institutionId, institutionId)
        )
      )
      .limit(1);
    
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }
    
    // Delete from local file storage
    try {
      await fs.unlink(document.filePath);
    } catch (storageError) {
      console.error("Error deleting file from storage:", storageError);
    }
    
    await db
      .delete(institutionDocuments)
      .where(eq(institutionDocuments.id, documentId));
    
    if (userId) {
      await logActivity({
        userId,
        action: 'deleted',
        entityType: 'document' as any,
        entityId: documentId,
        entityName: document.originalFileName,
        actionDescription: `Deleted institution document`,
      });
    }
    
    res.json({ message: "Document deleted successfully" });
  } catch (error) {
    console.error("Error deleting document:", error);
    res.status(500).json({ message: "Failed to delete document" });
  }
});

export default router;
