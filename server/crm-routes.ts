import { Router } from "express";
import { db } from "./db";
import { storage } from "./storage";
import { 
  crmLeads, 
  crmContacts, 
  leadStatusHistory, 
  users,
  courses,
  universities,
  insertCrmLeadSchema,
  updateCrmLeadSchema,
  insertCrmContactSchema,
  updateCrmContactSchema,
} from "@shared/schema";
import { eq, desc, and, or, ilike, count, isNull } from "drizzle-orm";
import { logActivity } from "./activity-logger";

const router = Router();

// Helper to get user id from request
function getUserId(req: any): string | null {
  if (!req.user) return null;
  return req.user.claims?.sub || req.user.id || null;
}

// Helper to check if user is an admin team member (uses storage layer)
async function isAdminTeamMember(userId: string): Promise<{ isAdmin: boolean; role: string | null }> {
  const adminMember = await storage.getAdminTeamMemberByUserId(userId);
  if (adminMember && adminMember.isActive) {
    return { isAdmin: true, role: adminMember.role };
  }
  
  const user = await storage.getUser(userId);
  if (user?.userType === 'admin' || user?.userType === 'super_admin') {
    return { isAdmin: true, role: user.userType };
  }
  
  return { isAdmin: false, role: null };
}

// Middleware to check admin access with proper error handling
async function requireAdmin(req: any, res: any, next: any) {
  try {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
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
// CRM LEADS ROUTES
// ============================================

// Get all leads with filtering and pagination
router.get("/leads", requireAdmin, async (req, res) => {
  try {
    const { 
      status, 
      rating,
      branch, 
      ownerId, 
      assignedToId,
      assignedTo,
      source,
      country,
      search,
      limit = "50",
      offset = "0"
    } = req.query;

    let conditions: any[] = [];

    if (status) {
      conditions.push(eq(crmLeads.leadStatus, status as any));
    }
    if (rating) {
      conditions.push(eq(crmLeads.leadRating, rating as any));
    }
    if (branch) {
      conditions.push(eq(crmLeads.branch, branch as string));
    }
    if (ownerId) {
      conditions.push(eq(crmLeads.leadOwner, ownerId as string));
    }
    // Support both assignedToId and assignedTo parameter names
    const assignedFilter = assignedToId || assignedTo;
    if (assignedFilter) {
      if (assignedFilter === 'unassigned') {
        const { isNull } = await import("drizzle-orm");
        conditions.push(isNull(crmLeads.assignedTo));
      } else {
        conditions.push(eq(crmLeads.assignedTo, assignedFilter as string));
      }
    }
    if (source) {
      conditions.push(eq(crmLeads.leadCreationMethod, source as any));
    }
    if (country) {
      conditions.push(eq(crmLeads.country, country as string));
    }
    if (search) {
      conditions.push(
        or(
          ilike(crmLeads.firstName, `%${search}%`),
          ilike(crmLeads.lastName, `%${search}%`),
          ilike(crmLeads.email, `%${search}%`),
          ilike(crmLeads.phone, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [leads, totalResult] = await Promise.all([
      db
        .select({
          lead: crmLeads,
          assignedToUser: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            profileImageUrl: users.profileImageUrl,
          },
        })
        .from(crmLeads)
        .leftJoin(users, eq(crmLeads.assignedTo, users.id))
        .where(whereClause)
        .orderBy(desc(crmLeads.createdAt))
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string)),
      db.select({ count: count() }).from(crmLeads).where(whereClause),
    ]);

    // Get owner info for each lead
    const leadsWithOwners = await Promise.all(
      leads.map(async ({ lead, assignedToUser }) => {
        let ownerUser = null;
        if (lead.leadOwner) {
          const owner = await db
            .select({
              id: users.id,
              firstName: users.firstName,
              lastName: users.lastName,
              email: users.email,
              profileImageUrl: users.profileImageUrl,
            })
            .from(users)
            .where(eq(users.id, lead.leadOwner))
            .limit(1);
          ownerUser = owner[0] || null;
        }
        return {
          ...lead,
          assignedToUser,
          ownerUser,
        };
      })
    );

    res.json({
      leads: leadsWithOwners,
      total: totalResult[0]?.count || 0,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error("Error fetching leads:", error);
    res.status(500).json({ message: "Failed to fetch leads" });
  }
});

// Get single lead with all relations
router.get("/leads/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [lead] = await db
      .select()
      .from(crmLeads)
      .where(eq(crmLeads.id, id))
      .limit(1);

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    // Get related data
    const [assignedToUser, ownerUser, course, university, statusHistoryRecords] = await Promise.all([
      lead.assignedTo
        ? db.select().from(users).where(eq(users.id, lead.assignedTo)).limit(1)
        : Promise.resolve([]),
      lead.leadOwner
        ? db.select().from(users).where(eq(users.id, lead.leadOwner)).limit(1)
        : Promise.resolve([]),
      lead.courseId
        ? db.select({ id: courses.id, title: courses.title }).from(courses).where(eq(courses.id, lead.courseId)).limit(1)
        : Promise.resolve([]),
      lead.universityId
        ? db.select({ id: universities.id, name: universities.name }).from(universities).where(eq(universities.id, lead.universityId)).limit(1)
        : Promise.resolve([]),
      db
        .select({
          history: leadStatusHistory,
          changedByUser: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
          },
        })
        .from(leadStatusHistory)
        .leftJoin(users, eq(leadStatusHistory.changedBy, users.id))
        .where(eq(leadStatusHistory.leadId, id))
        .orderBy(desc(leadStatusHistory.createdAt)),
    ]);

    res.json({
      ...lead,
      assignedToUser: assignedToUser[0] || null,
      ownerUser: ownerUser[0] || null,
      course: course[0] || null,
      university: university[0] || null,
      statusHistory: statusHistoryRecords.map(r => ({
        ...r.history,
        changedByUser: r.changedByUser,
      })),
    });
  } catch (error) {
    console.error("Error fetching lead:", error);
    res.status(500).json({ message: "Failed to fetch lead" });
  }
});

// Create new lead
router.post("/leads", requireAdmin, async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    const validated = insertCrmLeadSchema.parse(req.body);
    
    const [newLead] = await db.insert(crmLeads).values({
      ...validated,
      leadOwner: userId,
    }).returning();

    // Create initial status history
    await db.insert(leadStatusHistory).values({
      leadId: newLead.id,
      fromStatus: null,
      toStatus: newLead.leadStatus,
      changedBy: userId,
      notes: "Lead created",
    });

    // Log activity
    await logActivity({
      userId,
      entityType: "crm_lead" as any,
      entityId: newLead.id,
      entityName: `${newLead.firstName} ${newLead.lastName}`,
      action: "created",
      actionDescription: `Created lead: ${newLead.firstName} ${newLead.lastName}`,
    });

    res.status(201).json(newLead);
  } catch (error: any) {
    console.error("Error creating lead:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({ message: "Invalid lead data", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to create lead" });
  }
});

// Update lead
router.patch("/leads/:id", requireAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    const validated = updateCrmLeadSchema.parse(req.body);

    // Get existing lead for comparison
    const [existingLead] = await db
      .select()
      .from(crmLeads)
      .where(eq(crmLeads.id, id))
      .limit(1);

    if (!existingLead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    // Check if status is being changed
    if (validated.leadStatus && validated.leadStatus !== existingLead.leadStatus) {
      await db.insert(leadStatusHistory).values({
        leadId: id,
        fromStatus: existingLead.leadStatus,
        toStatus: validated.leadStatus,
        changedBy: userId,
        notes: req.body.statusChangeNotes || null,
      });
    }

    const [updatedLead] = await db
      .update(crmLeads)
      .set({
        ...validated,
        updatedAt: new Date(),
        lastActivityTime: new Date(),
      })
      .where(eq(crmLeads.id, id))
      .returning();

    // Log activity
    await logActivity({
      userId,
      entityType: "crm_lead" as any,
      entityId: id,
      entityName: `${updatedLead.firstName} ${updatedLead.lastName}`,
      action: "updated",
      actionDescription: `Updated lead: ${updatedLead.firstName} ${updatedLead.lastName}`,
    });

    res.json(updatedLead);
  } catch (error: any) {
    console.error("Error updating lead:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({ message: "Invalid lead data", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to update lead" });
  }
});

// Delete lead
router.delete("/leads/:id", requireAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    const [existingLead] = await db
      .select()
      .from(crmLeads)
      .where(eq(crmLeads.id, id))
      .limit(1);

    if (!existingLead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    await db.delete(crmLeads).where(eq(crmLeads.id, id));

    // Log activity
    await logActivity({
      userId,
      entityType: "crm_lead" as any,
      entityId: id,
      entityName: `${existingLead.firstName} ${existingLead.lastName}`,
      action: "deleted",
      actionDescription: `Deleted lead: ${existingLead.firstName} ${existingLead.lastName}`,
    });

    res.json({ message: "Lead deleted successfully" });
  } catch (error) {
    console.error("Error deleting lead:", error);
    res.status(500).json({ message: "Failed to delete lead" });
  }
});

// Get lead status history
router.get("/leads/:id/history", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const history = await db
      .select({
        history: leadStatusHistory,
        changedByUser: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(leadStatusHistory)
      .leftJoin(users, eq(leadStatusHistory.changedBy, users.id))
      .where(eq(leadStatusHistory.leadId, id))
      .orderBy(desc(leadStatusHistory.createdAt));

    res.json({
      history: history.map(r => ({
        ...r.history,
        changedByUser: r.changedByUser,
      })),
    });
  } catch (error) {
    console.error("Error fetching lead history:", error);
    res.status(500).json({ message: "Failed to fetch lead history" });
  }
});

// Convert lead to contact
router.post("/leads/:id/convert", requireAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    const { contactType = "clients" } = req.body;

    const [lead] = await db
      .select()
      .from(crmLeads)
      .where(eq(crmLeads.id, id))
      .limit(1);

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    if (lead.convertedContactId) {
      return res.status(400).json({ message: "Lead has already been converted" });
    }

    // Create contact from lead
    const [newContact] = await db.insert(crmContacts).values({
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      mobile: lead.phone,
      phone: lead.mobile,
      nationality: lead.nationality,
      country: lead.country,
      contactType: contactType as any,
      contactOwner: lead.leadOwner || userId,
      sourceLeadId: lead.id,
      notes: lead.notes,
    }).returning();

    // Update lead with conversion info
    await db
      .update(crmLeads)
      .set({
        leadStatus: "converted",
        convertedContactId: newContact.id,
        convertedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(crmLeads.id, id));

    // Add status history
    await db.insert(leadStatusHistory).values({
      leadId: id,
      fromStatus: lead.leadStatus,
      toStatus: "converted",
      changedBy: userId,
      notes: `Converted to contact: ${newContact.firstName} ${newContact.lastName}`,
    });

    // Log activity
    await logActivity({
      userId,
      entityType: "crm_lead" as any,
      entityId: id,
      entityName: `${lead.firstName} ${lead.lastName}`,
      action: "status_changed",
      actionDescription: `Converted lead to contact: ${newContact.firstName} ${newContact.lastName}`,
    });

    res.json({
      message: "Lead converted successfully",
      contact: newContact,
    });
  } catch (error) {
    console.error("Error converting lead:", error);
    res.status(500).json({ message: "Failed to convert lead" });
  }
});

// ============================================
// CRM CONTACTS ROUTES
// ============================================

// Get all contacts with filtering and pagination
router.get("/contacts", requireAdmin, async (req, res) => {
  try {
    const { 
      type, 
      ownerId,
      owner,
      search,
      country,
      nationality,
      unassigned,
      limit = "50",
      offset = "0"
    } = req.query;

    let conditions: any[] = [];

    if (type) {
      conditions.push(eq(crmContacts.contactType, type as any));
    }
    if (ownerId || owner) {
      conditions.push(eq(crmContacts.contactOwner, (ownerId || owner) as string));
    }
    if (unassigned === "true") {
      conditions.push(isNull(crmContacts.contactOwner));
    }
    if (country) {
      conditions.push(eq(crmContacts.country, country as string));
    }
    if (nationality) {
      conditions.push(eq(crmContacts.nationality, nationality as string));
    }
    if (search) {
      conditions.push(
        or(
          ilike(crmContacts.firstName, `%${search}%`),
          ilike(crmContacts.lastName, `%${search}%`),
          ilike(crmContacts.email, `%${search}%`),
          ilike(crmContacts.mobile, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [contacts, totalResult] = await Promise.all([
      db
        .select({
          contact: crmContacts,
          ownerUser: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            profileImageUrl: users.profileImageUrl,
          },
        })
        .from(crmContacts)
        .leftJoin(users, eq(crmContacts.contactOwner, users.id))
        .where(whereClause)
        .orderBy(desc(crmContacts.createdAt))
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string)),
      db.select({ count: count() }).from(crmContacts).where(whereClause),
    ]);

    res.json({
      contacts: contacts.map(({ contact, ownerUser }) => ({
        ...contact,
        ownerUser,
      })),
      total: totalResult[0]?.count || 0,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    res.status(500).json({ message: "Failed to fetch contacts" });
  }
});

// Get single contact with relations
router.get("/contacts/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [contact] = await db
      .select()
      .from(crmContacts)
      .where(eq(crmContacts.id, id))
      .limit(1);

    if (!contact) {
      return res.status(404).json({ message: "Contact not found" });
    }

    // Get related data
    const [ownerUser, sourceLead] = await Promise.all([
      contact.contactOwner
        ? db.select().from(users).where(eq(users.id, contact.contactOwner)).limit(1)
        : Promise.resolve([]),
      contact.sourceLeadId
        ? db.select().from(crmLeads).where(eq(crmLeads.id, contact.sourceLeadId)).limit(1)
        : Promise.resolve([]),
    ]);

    res.json({
      ...contact,
      ownerUser: ownerUser[0] || null,
      sourceLead: sourceLead[0] || null,
    });
  } catch (error) {
    console.error("Error fetching contact:", error);
    res.status(500).json({ message: "Failed to fetch contact" });
  }
});

// Create new contact
router.post("/contacts", requireAdmin, async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    const validated = insertCrmContactSchema.parse(req.body);
    
    const [newContact] = await db.insert(crmContacts).values({
      ...validated,
      contactOwner: validated.contactOwner || userId,
    }).returning();

    // Log activity
    await logActivity({
      userId,
      entityType: "crm_contact" as any,
      entityId: newContact.id,
      entityName: `${newContact.firstName} ${newContact.lastName}`,
      action: "created",
      actionDescription: `Created contact: ${newContact.firstName} ${newContact.lastName}`,
    });

    res.status(201).json(newContact);
  } catch (error: any) {
    console.error("Error creating contact:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({ message: "Invalid contact data", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to create contact" });
  }
});

// Update contact
router.patch("/contacts/:id", requireAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    const validated = updateCrmContactSchema.parse(req.body);

    const [existingContact] = await db
      .select()
      .from(crmContacts)
      .where(eq(crmContacts.id, id))
      .limit(1);

    if (!existingContact) {
      return res.status(404).json({ message: "Contact not found" });
    }

    const [updatedContact] = await db
      .update(crmContacts)
      .set({
        ...validated,
        updatedAt: new Date(),
      })
      .where(eq(crmContacts.id, id))
      .returning();

    // Log activity
    await logActivity({
      userId,
      entityType: "crm_contact" as any,
      entityId: id,
      entityName: `${updatedContact.firstName} ${updatedContact.lastName}`,
      action: "updated",
      actionDescription: `Updated contact: ${updatedContact.firstName} ${updatedContact.lastName}`,
    });

    res.json(updatedContact);
  } catch (error: any) {
    console.error("Error updating contact:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({ message: "Invalid contact data", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to update contact" });
  }
});

// Delete contact
router.delete("/contacts/:id", requireAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    const [existingContact] = await db
      .select()
      .from(crmContacts)
      .where(eq(crmContacts.id, id))
      .limit(1);

    if (!existingContact) {
      return res.status(404).json({ message: "Contact not found" });
    }

    await db.delete(crmContacts).where(eq(crmContacts.id, id));

    // Log activity
    await logActivity({
      userId,
      entityType: "crm_contact" as any,
      entityId: id,
      entityName: `${existingContact.firstName} ${existingContact.lastName}`,
      action: "deleted",
      actionDescription: `Deleted contact: ${existingContact.firstName} ${existingContact.lastName}`,
    });

    res.json({ message: "Contact deleted successfully" });
  } catch (error) {
    console.error("Error deleting contact:", error);
    res.status(500).json({ message: "Failed to delete contact" });
  }
});

// Get contact types for dropdown
router.get("/contact-types", requireAdmin, async (req, res) => {
  const types = [
    { value: "none", label: "None" },
    { value: "clients", label: "Clients" },
    { value: "employee", label: "Employee" },
    { value: "external", label: "External" },
    { value: "internal", label: "Internal" },
    { value: "others", label: "Others" },
    { value: "partner", label: "Partner" },
    { value: "providers_rep", label: "Providers Rep" },
  ];
  res.json(types);
});

// Get lead statuses for dropdown
router.get("/lead-statuses", requireAdmin, async (req, res) => {
  const statuses = [
    { value: "not_contacted", label: "Not Contacted", color: "green" },
    { value: "contacted", label: "Contacted", color: "purple" },
    { value: "qualified", label: "Qualified", color: "blue" },
    { value: "unqualified", label: "Unqualified", color: "gray" },
    { value: "converted", label: "Converted", color: "emerald" },
    { value: "lost", label: "Lost", color: "red" },
  ];
  res.json(statuses);
});

// Get lead ratings for dropdown
router.get("/lead-ratings", requireAdmin, async (req, res) => {
  const ratings = [
    { value: "cold", label: "Cold", color: "blue" },
    { value: "warm", label: "Warm", color: "orange" },
    { value: "hot", label: "Hot", color: "red" },
  ];
  res.json(ratings);
});

// Get branches for dropdown
router.get("/branches", requireAdmin, async (req, res) => {
  const branches = [
    { value: "Melbourne", label: "Melbourne" },
    { value: "Sydney", label: "Sydney" },
    { value: "Brisbane", label: "Brisbane" },
    { value: "Perth", label: "Perth" },
    { value: "Adelaide", label: "Adelaide" },
    { value: "Hobart", label: "Hobart" },
    { value: "Darwin", label: "Darwin" },
    { value: "Canberra", label: "Canberra" },
  ];
  res.json(branches);
});

export default router;
