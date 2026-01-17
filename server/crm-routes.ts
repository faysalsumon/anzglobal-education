import { Router } from "express";
import { db } from "./db";
import { storage } from "./storage";
import { 
  crmLeads, 
  crmContacts, 
  leadStatusHistory, 
  leadNotes,
  leadHistory,
  users,
  courses,
  universities,
  institutionContacts,
  insertCrmLeadSchema,
  updateCrmLeadSchema,
  insertCrmContactSchema,
  updateCrmContactSchema,
  insertLeadNoteSchema,
  branches,
  studentProfiles,
  applications,
  applicationStageHistory,
} from "@shared/schema";
import { eq, desc, and, or, ilike, count, isNull, inArray, aliasedTable, ne } from "drizzle-orm";
import { logActivity } from "./activity-logger";
import { getUserAccessContext, checkCrudPermission, type UserAccessContext } from "./access-policy-service";
import { notifyLeadMention, notifyLeadAssigned } from "./notifications";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";

// Configure multer for CRM photo uploads
const crmUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for photos
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed.'));
    }
  },
});

const router = Router();

// Helper to get user id from request (supports Supabase auth)
function getUserId(req: any): string | null {
  // First check Supabase auth
  if (req.supabaseUser?.id) {
    return req.supabaseUser.id;
  }
  // Fallback to legacy passport auth
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

// Middleware to check admin access with proper error handling (supports Supabase auth)
async function requireAdmin(req: any, res: any, next: any) {
  try {
    // Check Supabase auth first, then fallback to legacy passport auth
    const hasSupabaseAuth = !!req.supabaseUser?.id;
    const hasPassportAuth = req.isAuthenticated?.() && req.user;
    
    if (!hasSupabaseAuth && !hasPassportAuth) {
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

// Get all leads with filtering and pagination (with hierarchy-based visibility)
router.get("/leads", requireAdmin, async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

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

    // Get user's access context for hierarchy-based filtering
    const accessContext = await getUserAccessContext(userId);
    
    // Check read permission for leads module
    const canRead = await checkCrudPermission(userId, 'leads', 'read');
    if (!canRead) {
      return res.status(403).json({ message: "You don't have permission to view leads" });
    }

    let conditions: any[] = [];

    // Apply hierarchy-based visibility filter
    if (accessContext) {
      if (accessContext.defaultScope === 'self') {
        // Self scope: only see leads assigned to you or owned by you
        conditions.push(
          or(
            eq(crmLeads.assignedTo, userId),
            eq(crmLeads.leadOwner, userId)
          )
        );
      } else if (accessContext.defaultScope === 'branch' || accessContext.defaultScope === 'region') {
        // Branch/Region scope: filter by branch names matching the user's allowed branches
        if (accessContext.allowedBranchIds.length > 0) {
          const allowedBranches = await db
            .select({ name: branches.name })
            .from(branches)
            .where(inArray(branches.id, accessContext.allowedBranchIds));
          
          const branchNames = allowedBranches.map(b => b.name);
          if (branchNames.length > 0) {
            conditions.push(
              or(
                inArray(crmLeads.branch, branchNames),
                eq(crmLeads.assignedTo, userId),
                eq(crmLeads.leadOwner, userId)
              )
            );
          }
        }
      }
      // Global scope: no additional filtering needed
    }

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
    
    // Get creator's name for history
    const [creator] = await db
      .select({ firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const creatorName = creator ? `${creator.firstName || ''} ${creator.lastName || ''}`.trim() : 'Unknown';
    
    const [newLead] = await db.insert(crmLeads).values({
      ...validated,
      leadOwner: userId,
      createdByUserId: userId, // Always use authenticated user ID (server-derived)
    }).returning();

    // Create initial status history
    await db.insert(leadStatusHistory).values({
      leadId: newLead.id,
      fromStatus: null,
      toStatus: newLead.leadStatus,
      changedBy: userId,
      notes: "Lead created",
    });

    // Create lead history entry for creation
    await db.insert(leadHistory).values({
      leadId: newLead.id,
      action: "created",
      description: `Lead created by ${creatorName}`,
      changedByUserId: userId,
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

    // Get user's name for history
    const [updater] = await db
      .select({ firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const updaterName = updater ? `${updater.firstName || ''} ${updater.lastName || ''}`.trim() : 'Unknown';

    // Track field changes for lead history
    const fieldLabelMap: Record<string, string> = {
      firstName: 'First Name',
      lastName: 'Last Name',
      email: 'Email',
      phone: 'Phone',
      mobile: 'Mobile',
      city: 'City',
      country: 'Country',
      nationality: 'Nationality',
      leadStatus: 'Status',
      leadRating: 'Rating',
      branch: 'Branch',
      assignedTo: 'Assigned To',
      leadOwner: 'Lead Owner',
      courseName: 'Course Name',
      courseId: 'Course',
      interestedIn: 'Interested In',
      intakeMonth: 'Intake Month',
      intakeYear: 'Intake Year',
      notes: 'Notes',
    };

    // Log each field change to lead_history
    const historyPromises: Promise<any>[] = [];
    for (const [key, value] of Object.entries(validated)) {
      const existingValue = (existingLead as any)[key];
      // Only log if value actually changed
      if (value !== existingValue && key !== 'statusChangeNotes') {
        const fieldLabel = fieldLabelMap[key] || key;
        historyPromises.push(
          db.insert(leadHistory).values({
            leadId: id,
            action: "updated",
            fieldName: key,
            oldValue: existingValue != null ? String(existingValue) : null,
            newValue: value != null ? String(value) : null,
            description: `${fieldLabel} changed by ${updaterName}`,
            changedByUserId: userId,
          })
        );
      }
    }
    
    // Execute all history inserts in parallel
    if (historyPromises.length > 0) {
      await Promise.all(historyPromises);
    }

    // Check if status is being changed (keep existing status history for backwards compatibility)
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

// Get lead status history (legacy)
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

// Get lead activity log (full field-level change history)
router.get("/leads/:id/activity-log", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const activityLog = await db
      .select({
        log: leadHistory,
        changedBy: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(leadHistory)
      .leftJoin(users, eq(leadHistory.changedByUserId, users.id))
      .where(eq(leadHistory.leadId, id))
      .orderBy(desc(leadHistory.createdAt));

    res.json({
      activityLog: activityLog.map(r => ({
        ...r.log,
        changedBy: r.changedBy,
      })),
    });
  } catch (error) {
    console.error("Error fetching lead activity log:", error);
    res.status(500).json({ message: "Failed to fetch lead activity log" });
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
      createdByUserId: userId,
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

// Find linked platform user by email
router.get("/contacts/linked-user", requireAdmin, async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.json({ user: null });
    }

    // Search for a user with matching email across different user tables
    const user = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        userType: users.userType,
        photo: users.photo,
      })
      .from(users)
      .where(eq(users.email, email as string))
      .limit(1)
      .then(rows => rows[0] || null);

    res.json({ user });
  } catch (error) {
    console.error("Error finding linked user:", error);
    res.status(500).json({ message: "Failed to find linked user" });
  }
});

// User type to Contact type mapping
export function mapUserTypeToContactType(userType: string): string | null {
  switch (userType) {
    case 'student':
      return 'clients';
    case 'institution_admin':
      return 'providers_rep';
    default:
      return null; // admin and platform_admin are not synced
  }
}

// Auto-create CRM contact for new platform users (students and institution_admins)
export async function createCrmContactForUser(user: {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  userType: string;
  phone?: string | null;
  country?: string | null;
  city?: string | null;
  stateProvince?: string | null;
  postalCode?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  photo?: string | null;
  profileImageUrl?: string | null;
}): Promise<{ success: boolean; contactId?: string; error?: string }> {
  try {
    const contactType = mapUserTypeToContactType(user.userType);
    if (!contactType) {
      console.log(`[CRM Sync] User ${user.id} type ${user.userType} not eligible for CRM contact`);
      return { success: false, error: 'User type not eligible for CRM contact' };
    }

    if (!user.email) {
      console.log(`[CRM Sync] User ${user.id} missing email, skipping CRM sync`);
      return { success: false, error: 'Missing required email field' };
    }
    
    // Use email prefix as fallback if firstName is missing
    const firstName = user.firstName || user.email.split('@')[0];

    // Check if contact already exists with this email or linkedUserId
    const existingContact = await db
      .select()
      .from(crmContacts)
      .where(
        or(
          eq(crmContacts.email, user.email),
          eq(crmContacts.linkedUserId, user.id)
        )
      )
      .limit(1)
      .then(rows => rows[0]);

    if (existingContact) {
      // If contact exists but not linked, link it and update basic fields
      if (!existingContact.linkedUserId) {
        await db
          .update(crmContacts)
          .set({ 
            linkedUserId: user.id,
            firstName: firstName,
            lastName: user.lastName || existingContact.lastName,
            photo: user.photo || user.profileImageUrl || existingContact.photo,
            updatedAt: new Date()
          })
          .where(eq(crmContacts.id, existingContact.id));
        console.log(`[CRM Sync] Linked existing contact ${existingContact.id} to user ${user.id}`);
        return { success: true, contactId: existingContact.id };
      }
      return { success: true, contactId: existingContact.id };
    }

    // Create new contact from user
    const [newContact] = await db.insert(crmContacts).values({
      firstName: firstName,
      lastName: user.lastName || '',
      email: user.email,
      mobile: user.phone || '',
      phone: user.phone,
      country: user.country,
      city: user.city,
      state: user.stateProvince,
      postcode: user.postalCode,
      street: user.addressLine1,
      unitNo: user.addressLine2,
      contactType: contactType as any,
      clientStatus: contactType === 'clients' ? 'lead' : null,
      entrySource: 'website',
      linkedUserId: user.id,
      photo: user.photo || user.profileImageUrl,
    }).returning();

    return { success: true, contactId: newContact.id };
  } catch (error: any) {
    console.error('Error creating CRM contact for user:', error);
    return { success: false, error: error.message };
  }
}

// Helper function to sync a user's profile data to their linked CRM contact
// This is called when a student updates their profile for real-time sync
export async function syncUserProfileToCrmContact(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Find the CRM contact linked to this user
    const linkedContact = await db
      .select()
      .from(crmContacts)
      .where(eq(crmContacts.linkedUserId, userId))
      .limit(1)
      .then(rows => rows[0]);

    if (!linkedContact) {
      console.log(`[CRM Sync] No linked CRM contact found for user ${userId}`);
      return { success: false, error: 'No linked CRM contact found' };
    }

    // Get user data
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .then(rows => rows[0]);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Get student profile data if user is a student
    let studentProfile = null;
    if (user.userType === 'student') {
      studentProfile = await db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, userId))
        .limit(1)
        .then(rows => rows[0]);
    }

    // Build update data from user and student profile
    const updateData: any = {
      firstName: studentProfile?.firstName || user.firstName || linkedContact.firstName,
      lastName: studentProfile?.lastName || user.lastName || linkedContact.lastName,
      email: user.email || linkedContact.email,
      mobile: studentProfile?.phone || user.phone || linkedContact.mobile,
      phone: studentProfile?.phone || user.phone || linkedContact.phone,
      photo: studentProfile?.profileImageUrl || user.profileImageUrl || linkedContact.photo,
      updatedAt: new Date(),
      updatedByUserId: userId,
    };

    // Add student profile fields if available
    if (studentProfile) {
      updateData.preferredName = studentProfile.preferredName || linkedContact.preferredName;
      updateData.gender = studentProfile.gender || linkedContact.gender;
      updateData.whatsapp = studentProfile.whatsapp || linkedContact.whatsapp;
      updateData.nationality = studentProfile.nationality || linkedContact.nationality;
      updateData.country = studentProfile.country || linkedContact.country;
      updateData.city = studentProfile.city || linkedContact.city;
      updateData.state = studentProfile.state || linkedContact.state;
      updateData.postcode = studentProfile.postcode || linkedContact.postcode;
      updateData.street = studentProfile.street || linkedContact.street;
      updateData.suburb = studentProfile.suburb || linkedContact.suburb;
      updateData.unitNo = studentProfile.unitNo || linkedContact.unitNo;
      
      // Emergency contact fields
      updateData.emergencyContactName = studentProfile.emergencyContactName || linkedContact.emergencyContactName;
      updateData.emergencyContactMobile = studentProfile.emergencyContactMobile || linkedContact.emergencyContactMobile;
      updateData.emergencyContactRelationship = studentProfile.emergencyContactRelationship || linkedContact.emergencyContactRelationship;
      updateData.emergencyContactAddress = studentProfile.emergencyContactAddress || linkedContact.emergencyContactAddress;
      
      // Map education fields
      if (studentProfile.educationLevel) {
        updateData.programType = studentProfile.educationLevel;
      }
      if (studentProfile.fieldOfStudy) {
        updateData.programDiscipline = studentProfile.fieldOfStudy;
      }
      if (studentProfile.careerGoals) {
        updateData.interestedIn = studentProfile.careerGoals;
      }
    }

    // Update the CRM contact
    await db
      .update(crmContacts)
      .set(updateData)
      .where(eq(crmContacts.id, linkedContact.id));

    console.log(`[CRM Sync] Updated CRM contact ${linkedContact.id} with user ${userId} profile data`);
    return { success: true };
  } catch (error: any) {
    console.error('[CRM Sync] Error syncing profile to CRM:', error);
    return { success: false, error: error.message };
  }
}

// Sync platform users to CRM contacts (students → clients, institution_admin → providers_rep)
router.post("/contacts/sync-users", requireAdmin, async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    // Get all users that should be synced (students and institution_admins only)
    const usersToSync = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.userType, 'student'),
          eq(users.userType, 'institution_admin')
        )
      );
    
    console.log(`[CRM Sync] Found ${usersToSync.length} users to sync`);

    let created = 0;
    let skipped = 0;
    let linked = 0;
    const errors: string[] = [];

    for (const user of usersToSync) {
      try {
        if (!user.email) {
          skipped++;
          continue;
        }
        
        // Use email prefix as fallback for firstName
        const firstName = user.firstName || user.email.split('@')[0];

        const contactType = mapUserTypeToContactType(user.userType);
        if (!contactType) {
          skipped++;
          continue;
        }

        // Get student profile data if user is a student
        let studentProfile = null;
        if (user.userType === 'student') {
          studentProfile = await db
            .select()
            .from(studentProfiles)
            .where(eq(studentProfiles.userId, user.id))
            .limit(1)
            .then(rows => rows[0]);
        }

        // Check if contact already exists with this email or linkedUserId
        const existingContact = await db
          .select()
          .from(crmContacts)
          .where(
            or(
              eq(crmContacts.email, user.email),
              eq(crmContacts.linkedUserId, user.id)
            )
          )
          .limit(1)
          .then(rows => rows[0]);

        if (existingContact) {
          // Build update data with latest profile information
          const updateData: any = { 
            linkedUserId: user.id,
            firstName: studentProfile?.firstName || firstName,
            lastName: studentProfile?.lastName || user.lastName || existingContact.lastName,
            photo: studentProfile?.profileImageUrl || user.profileImageUrl || existingContact.photo,
            mobile: studentProfile?.phone || user.phone || existingContact.mobile,
            updatedAt: new Date()
          };
          
          // Add all student profile fields
          if (studentProfile) {
            updateData.preferredName = studentProfile.preferredName;
            updateData.gender = studentProfile.gender;
            updateData.whatsapp = studentProfile.whatsapp;
            updateData.nationality = studentProfile.nationality;
            updateData.country = studentProfile.country;
            updateData.city = studentProfile.city;
            updateData.state = studentProfile.state;
            updateData.postcode = studentProfile.postcode;
            updateData.street = studentProfile.street;
            updateData.suburb = studentProfile.suburb;
            updateData.unitNo = studentProfile.unitNo;
            if (studentProfile.educationLevel) updateData.programType = studentProfile.educationLevel;
            if (studentProfile.fieldOfStudy) updateData.programDiscipline = studentProfile.fieldOfStudy;
            if (studentProfile.careerGoals) updateData.interestedIn = studentProfile.careerGoals;
          }
          
          // Always update with latest data (whether newly linking or already linked)
          await db
            .update(crmContacts)
            .set(updateData)
            .where(eq(crmContacts.id, existingContact.id));
          
          if (!existingContact.linkedUserId) {
            linked++;
          } else {
            // Already linked but updated with latest data
            skipped++;
          }
          continue;
        }

        // Create new contact from user with all profile fields
        const contactData: any = {
          firstName: studentProfile?.firstName || firstName,
          lastName: studentProfile?.lastName || user.lastName || '',
          email: user.email,
          mobile: studentProfile?.phone || user.phone || '',
          phone: studentProfile?.phone || user.phone,
          country: studentProfile?.country || user.country,
          city: studentProfile?.city || user.city,
          state: studentProfile?.state || user.stateProvince,
          postcode: studentProfile?.postcode || user.postalCode,
          street: studentProfile?.street || user.addressLine1,
          unitNo: studentProfile?.unitNo || user.addressLine2,
          contactType: contactType as any,
          clientStatus: contactType === 'clients' ? 'lead' : null,
          entrySource: 'website',
          linkedUserId: user.id,
          photo: studentProfile?.profileImageUrl || user.profileImageUrl,
          emergencyContactName: user.emergencyFirstName && user.emergencyLastName 
            ? `${user.emergencyFirstName} ${user.emergencyLastName}` 
            : user.emergencyFirstName,
          emergencyContactMobile: user.emergencyMobile,
          emergencyContactRelationship: user.emergencyRelationship,
        };
        
        // Add all student profile fields
        if (studentProfile) {
          contactData.preferredName = studentProfile.preferredName;
          contactData.gender = studentProfile.gender;
          contactData.whatsapp = studentProfile.whatsapp;
          contactData.nationality = studentProfile.nationality;
          contactData.suburb = studentProfile.suburb;
          if (studentProfile.educationLevel) contactData.programType = studentProfile.educationLevel;
          if (studentProfile.fieldOfStudy) contactData.programDiscipline = studentProfile.fieldOfStudy;
          if (studentProfile.careerGoals) contactData.interestedIn = studentProfile.careerGoals;
        }
        
        await db.insert(crmContacts).values(contactData);
        created++;
      } catch (err: any) {
        errors.push(`Failed to sync user ${user.email}: ${err.message}`);
      }
    }

    // Log activity
    await logActivity({
      userId,
      entityType: "crm_contact" as any,
      entityId: "sync",
      entityName: "User Sync",
      action: "imported",
      actionDescription: `Synced platform users to contacts: ${created} created, ${linked} linked, ${skipped} updated`,
    });

    res.json({
      message: "User sync completed",
      stats: {
        total: usersToSync.length,
        created,
        linked,
        updated: skipped, // renamed for clarity - these contacts were updated with latest data
        errors: errors.length,
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error syncing users to contacts:", error);
    res.status(500).json({ message: "Failed to sync users to contacts" });
  }
});

// Get all contacts with filtering and pagination
router.get("/contacts", requireAdmin, async (req, res) => {
  try {
    const { 
      type, 
      clientStatus,
      entrySource,
      ownerId,
      owner,
      assignedTo,
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
    if (clientStatus) {
      conditions.push(eq(crmContacts.clientStatus, clientStatus as any));
    }
    if (entrySource) {
      conditions.push(eq(crmContacts.entrySource, entrySource as any));
    }
    if (ownerId || owner) {
      conditions.push(eq(crmContacts.contactOwner, (ownerId || owner) as string));
    }
    if (assignedTo) {
      conditions.push(eq(crmContacts.assignedTo, assignedTo as string));
    }
    if (unassigned === "true") {
      conditions.push(isNull(crmContacts.assignedTo));
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

    // Create aliases for user joins
    const ownerUsers = aliasedTable(users, "owner_users");
    const assignedUsers = aliasedTable(users, "assigned_users");

    const [contacts, totalResult] = await Promise.all([
      db
        .select({
          contact: crmContacts,
          ownerUser: {
            id: ownerUsers.id,
            firstName: ownerUsers.firstName,
            lastName: ownerUsers.lastName,
            email: ownerUsers.email,
            profileImageUrl: ownerUsers.profileImageUrl,
          },
          assignedUser: {
            id: assignedUsers.id,
            firstName: assignedUsers.firstName,
            lastName: assignedUsers.lastName,
            email: assignedUsers.email,
            profileImageUrl: assignedUsers.profileImageUrl,
          },
        })
        .from(crmContacts)
        .leftJoin(ownerUsers, eq(crmContacts.contactOwner, ownerUsers.id))
        .leftJoin(assignedUsers, eq(crmContacts.assignedTo, assignedUsers.id))
        .where(whereClause)
        .orderBy(desc(crmContacts.createdAt))
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string)),
      db.select({ count: count() }).from(crmContacts).where(whereClause),
    ]);

    res.json({
      contacts: contacts.map(({ contact, ownerUser, assignedUser }) => ({
        ...contact,
        ownerUser: ownerUser?.id ? ownerUser : null,
        assignedUser: assignedUser?.id ? assignedUser : null,
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
    const [ownerUser, assignedUser, sourceLead, createdByUser, updatedByUser] = await Promise.all([
      contact.contactOwner
        ? db.select().from(users).where(eq(users.id, contact.contactOwner)).limit(1)
        : Promise.resolve([]),
      contact.assignedTo
        ? db.select().from(users).where(eq(users.id, contact.assignedTo)).limit(1)
        : Promise.resolve([]),
      contact.sourceLeadId
        ? db.select().from(crmLeads).where(eq(crmLeads.id, contact.sourceLeadId)).limit(1)
        : Promise.resolve([]),
      contact.createdByUserId
        ? db.select().from(users).where(eq(users.id, contact.createdByUserId)).limit(1)
        : Promise.resolve([]),
      contact.updatedByUserId
        ? db.select().from(users).where(eq(users.id, contact.updatedByUserId)).limit(1)
        : Promise.resolve([]),
    ]);

    res.json({
      ...contact,
      ownerUser: ownerUser[0] || null,
      assignedUser: assignedUser[0] || null,
      sourceLead: sourceLead[0] || null,
      createdByUser: createdByUser[0] || null,
      updatedByUser: updatedByUser[0] || null,
    });
  } catch (error) {
    console.error("Error fetching contact:", error);
    res.status(500).json({ message: "Failed to fetch contact" });
  }
});

// Get institution links for a contact
router.get("/contacts/:contactId/institutions", requireAdmin, async (req, res) => {
  try {
    const { contactId } = req.params;
    
    const links = await db
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
        institution: {
          id: universities.id,
          name: universities.name,
          logo: universities.logo,
          country: universities.country,
        },
      })
      .from(institutionContacts)
      .leftJoin(universities, eq(institutionContacts.institutionId, universities.id))
      .where(eq(institutionContacts.contactId, contactId))
      .orderBy(desc(institutionContacts.isPrimary), desc(institutionContacts.createdAt));
    
    res.json(links);
  } catch (error) {
    console.error("Error fetching contact institution links:", error);
    res.status(500).json({ message: "Failed to fetch institution links" });
  }
});

// Add institution link for a contact
router.post("/contacts/:contactId/institutions", requireAdmin, async (req: any, res) => {
  try {
    const { contactId } = req.params;
    const userId = getUserId(req);
    const { institutionId, contactRole, roleTitle, department, isPrimary, notes } = req.body;
    
    if (!institutionId) {
      return res.status(400).json({ message: "Institution ID is required" });
    }
    
    // Check if link already exists
    const existing = await db
      .select()
      .from(institutionContacts)
      .where(and(
        eq(institutionContacts.contactId, contactId),
        eq(institutionContacts.institutionId, institutionId)
      ))
      .limit(1);
    
    if (existing.length > 0) {
      return res.status(400).json({ message: "Contact is already linked to this institution" });
    }
    
    const [newLink] = await db
      .insert(institutionContacts)
      .values({
        contactId,
        institutionId,
        contactRole: contactRole || "other",
        roleTitle,
        department,
        isPrimary: isPrimary || false,
        notes,
        createdByUserId: userId,
      })
      .returning();
    
    res.status(201).json(newLink);
  } catch (error) {
    console.error("Error adding institution link:", error);
    res.status(500).json({ message: "Failed to add institution link" });
  }
});

// Update institution link for a contact
router.patch("/contacts/:contactId/institutions/:linkId", requireAdmin, async (req: any, res) => {
  try {
    const { linkId } = req.params;
    const { contactRole, roleTitle, department, isPrimary, notes } = req.body;
    
    const [updated] = await db
      .update(institutionContacts)
      .set({
        contactRole,
        roleTitle,
        department,
        isPrimary,
        notes,
        updatedAt: new Date(),
      })
      .where(eq(institutionContacts.id, linkId))
      .returning();
    
    if (!updated) {
      return res.status(404).json({ message: "Institution link not found" });
    }
    
    res.json(updated);
  } catch (error) {
    console.error("Error updating institution link:", error);
    res.status(500).json({ message: "Failed to update institution link" });
  }
});

// Delete institution link for a contact
router.delete("/contacts/:contactId/institutions/:linkId", requireAdmin, async (req: any, res) => {
  try {
    const { linkId } = req.params;
    
    const [deleted] = await db
      .delete(institutionContacts)
      .where(eq(institutionContacts.id, linkId))
      .returning();
    
    if (!deleted) {
      return res.status(404).json({ message: "Institution link not found" });
    }
    
    res.json({ message: "Institution link removed successfully" });
  } catch (error) {
    console.error("Error deleting institution link:", error);
    res.status(500).json({ message: "Failed to delete institution link" });
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
    
    // Check for duplicate email in CRM contacts
    if (validated.email) {
      const [existingContact] = await db
        .select({ id: crmContacts.id, firstName: crmContacts.firstName, lastName: crmContacts.lastName })
        .from(crmContacts)
        .where(eq(crmContacts.email, validated.email.toLowerCase().trim()))
        .limit(1);
      
      if (existingContact) {
        return res.status(409).json({ 
          message: `A contact with this email already exists: ${existingContact.firstName} ${existingContact.lastName}`,
          existingContactId: existingContact.id
        });
      }
    }
    
    // Check if email matches a platform user for auto-linking
    let linkedUserId = validated.linkedUserId;
    if (!linkedUserId && validated.email) {
      const [matchingUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, validated.email.toLowerCase().trim()))
        .limit(1);
      
      if (matchingUser) {
        linkedUserId = matchingUser.id;
      }
    }
    
    const [newContact] = await db.insert(crmContacts).values({
      ...validated,
      email: validated.email.toLowerCase().trim(),
      linkedUserId,
      contactOwner: validated.contactOwner || userId,
      createdByUserId: userId,
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

    // Check for duplicate email if email is being changed
    if (validated.email && validated.email.toLowerCase().trim() !== existingContact.email?.toLowerCase()) {
      const [duplicateContact] = await db
        .select({ id: crmContacts.id, firstName: crmContacts.firstName, lastName: crmContacts.lastName })
        .from(crmContacts)
        .where(and(
          eq(crmContacts.email, validated.email.toLowerCase().trim()),
          ne(crmContacts.id, id)
        ))
        .limit(1);
      
      if (duplicateContact) {
        return res.status(409).json({ 
          message: `A contact with this email already exists: ${duplicateContact.firstName} ${duplicateContact.lastName}`,
          existingContactId: duplicateContact.id
        });
      }
    }
    
    // Auto-link to platform user if email matches and not already linked
    // This runs when: email changes OR contact has no linkedUserId yet
    let linkedUserId = validated.linkedUserId;
    const emailToCheck = validated.email?.toLowerCase().trim() || existingContact.email;
    const shouldAutoLink = !linkedUserId && !existingContact.linkedUserId && emailToCheck;
    const emailChanged = validated.email && validated.email.toLowerCase().trim() !== existingContact.email?.toLowerCase();
    
    if (shouldAutoLink || emailChanged) {
      if (emailToCheck) {
        const [matchingUser] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, emailToCheck))
          .limit(1);
        
        if (matchingUser) {
          linkedUserId = matchingUser.id;
        }
      }
    }

    const updateData: any = {
      ...validated,
      updatedAt: new Date(),
      updatedByUserId: userId,
    };
    
    if (validated.email) {
      updateData.email = validated.email.toLowerCase().trim();
    }
    
    if (linkedUserId !== undefined) {
      updateData.linkedUserId = linkedUserId;
    }

    const [updatedContact] = await db
      .update(crmContacts)
      .set(updateData)
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

// Upload contact photo
router.post("/contacts/:id/upload-photo", requireAdmin, crmUpload.single('photo'), async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    const [contact] = await db
      .select()
      .from(crmContacts)
      .where(eq(crmContacts.id, id))
      .limit(1);

    if (!contact) {
      return res.status(404).json({ message: "Contact not found" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    let resizedBuffer: Buffer;
    try {
      // Validate that the buffer is actually a valid image
      await sharp(req.file.buffer).metadata();
      
      // Resize to 200x200 with cover
      resizedBuffer = await sharp(req.file.buffer)
        .resize(200, 200, { fit: 'cover' })
        .jpeg({ quality: 85 })
        .toBuffer();
    } catch (sharpError: any) {
      console.error("Sharp processing error:", sharpError);
      return res.status(400).json({ 
        message: "Invalid or corrupted image file. Please try a different image." 
      });
    }

    // Save to public directory
    const filename = `crm-contact-${id}-${Date.now()}.jpg`;
    const localPath = path.join(process.cwd(), 'public', 'contacts');
    await fs.mkdir(localPath, { recursive: true });
    await fs.writeFile(path.join(localPath, filename), resizedBuffer);
    
    const photoPath = `/contacts/${filename}`;

    // Update contact with new photo
    await db
      .update(crmContacts)
      .set({ photo: photoPath, updatedAt: new Date() })
      .where(eq(crmContacts.id, id));

    // Log activity
    await logActivity({
      userId,
      entityType: "crm_contact" as any,
      entityId: id,
      entityName: `${contact.firstName} ${contact.lastName}`,
      action: "updated",
      actionDescription: `Updated photo for contact: ${contact.firstName} ${contact.lastName}`,
    });

    res.json({ photoPath });
  } catch (error) {
    console.error("Error uploading contact photo:", error);
    res.status(500).json({ message: "Failed to upload photo" });
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

// ============================================
// LEAD NOTES ROUTES
// ============================================

// Get notes for a lead with visibility filtering
router.get("/leads/:id/notes", requireAdmin, async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    const { id: leadId } = req.params;

    // Get user's access context for hierarchy-based filtering
    const viewerContext = await getUserAccessContext(userId);
    const hierarchyLevel = viewerContext?.hierarchyLevel ?? 100;
    
    // Fetch all notes for this lead with author details
    const notes = await db
      .select({
        id: leadNotes.id,
        leadId: leadNotes.leadId,
        title: leadNotes.title,
        content: leadNotes.content,
        mentions: leadNotes.mentions,
        visibility: leadNotes.visibility,
        visibleTo: leadNotes.visibleTo,
        createdById: leadNotes.createdById,
        createdAt: leadNotes.createdAt,
        authorFirstName: users.firstName,
        authorLastName: users.lastName,
        authorEmail: users.email,
        authorProfileImage: users.profileImageUrl,
      })
      .from(leadNotes)
      .leftJoin(users, eq(leadNotes.createdById, users.id))
      .where(eq(leadNotes.leadId, leadId))
      .orderBy(desc(leadNotes.createdAt));

    // Filter notes based on visibility and user's hierarchy
    // Top-level managers (hierarchyLevel <= 2) can see all notes
    const isTopManager = hierarchyLevel <= 2;
    
    const filteredNotes = notes.filter(note => {
      // Top managers see everything
      if (isTopManager) return true;
      
      // Public notes visible to all
      if (note.visibility === 'public') return true;
      
      // Author can always see their own notes
      if (note.createdById === userId) return true;
      
      // Private notes only visible to author (already handled above)
      if (note.visibility === 'private') return false;
      
      // Selected visibility - check if user is in visibleTo list
      if (note.visibility === 'selected') {
        return note.visibleTo?.includes(userId) || false;
      }
      
      return false;
    });

    // Transform to include nested author object
    const transformedNotes = filteredNotes.map(note => ({
      id: note.id,
      leadId: note.leadId,
      title: note.title,
      content: note.content,
      mentions: note.mentions,
      visibility: note.visibility,
      visibleTo: note.visibleTo,
      createdById: note.createdById,
      createdAt: note.createdAt,
      author: {
        id: note.createdById,
        firstName: note.authorFirstName,
        lastName: note.authorLastName,
        email: note.authorEmail,
        profileImageUrl: note.authorProfileImage,
      }
    }));

    res.json(transformedNotes);
  } catch (error) {
    console.error("Error fetching lead notes:", error);
    res.status(500).json({ message: "Failed to fetch lead notes" });
  }
});

// Create a new note for a lead
router.post("/leads/:id/notes", requireAdmin, async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    const { id: leadId } = req.params;
    const { title, content, mentions, visibility, visibleTo } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ message: "Note content is required" });
    }

    // Insert the note
    const [newNote] = await db
      .insert(leadNotes)
      .values({
        leadId,
        title: title || null,
        content,
        mentions: mentions || [],
        visibility: visibility || 'public',
        visibleTo: visibleTo || [],
        createdById: userId,
      })
      .returning();

    // Create notifications for mentioned users using centralized notification system
    if (mentions && mentions.length > 0) {
      const lead = await db.select().from(crmLeads).where(eq(crmLeads.id, leadId)).limit(1);
      const leadName = lead[0] ? `${lead[0].firstName} ${lead[0].lastName}` : 'a lead';
      
      const notifier = await storage.getUser(userId);
      const notifierName = notifier ? `${notifier.firstName || ''} ${notifier.lastName || ''}`.trim() : 'Someone';
      
      for (const mentionedUserId of mentions) {
        await notifyLeadMention({
          userId: mentionedUserId,
          leadId,
          leadName,
          noteId: newNote.id,
          mentionedByName: notifierName,
          mentionedById: userId,
        });
      }
    }

    // Fetch author details for response
    const author = await storage.getUser(userId);

    res.status(201).json({
      ...newNote,
      author: {
        id: userId,
        firstName: author?.firstName || null,
        lastName: author?.lastName || null,
        email: author?.email || null,
        profileImageUrl: author?.profileImageUrl || null,
      }
    });
  } catch (error) {
    console.error("Error creating lead note:", error);
    res.status(500).json({ message: "Failed to create lead note" });
  }
});

// Update a note
router.put("/leads/:leadId/notes/:noteId", requireAdmin, async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    const { leadId, noteId } = req.params;
    const { title, content, mentions, visibility, visibleTo } = req.body;

    // Get the existing note
    const [existingNote] = await db
      .select()
      .from(leadNotes)
      .where(and(eq(leadNotes.id, noteId), eq(leadNotes.leadId, leadId)));

    if (!existingNote) {
      return res.status(404).json({ message: "Note not found" });
    }

    // Only the author can edit their own notes
    if (existingNote.createdById !== userId) {
      return res.status(403).json({ message: "You can only edit your own notes" });
    }

    if (!content || content.trim() === '') {
      return res.status(400).json({ message: "Note content is required" });
    }

    // Update the note
    const [updatedNote] = await db
      .update(leadNotes)
      .set({
        title: title || null,
        content,
        mentions: mentions || [],
        visibility: visibility || 'public',
        visibleTo: visibleTo || [],
      })
      .where(eq(leadNotes.id, noteId))
      .returning();

    // Create notifications for newly mentioned users
    const oldMentions = existingNote.mentions || [];
    const newMentions = (mentions || []).filter((m: string) => !oldMentions.includes(m));
    
    if (newMentions.length > 0) {
      const lead = await db.select().from(crmLeads).where(eq(crmLeads.id, leadId)).limit(1);
      const leadName = lead[0] ? `${lead[0].firstName} ${lead[0].lastName}` : 'a lead';
      
      const notifier = await storage.getUser(userId);
      const notifierName = notifier ? `${notifier.firstName || ''} ${notifier.lastName || ''}`.trim() : 'Someone';
      
      for (const mentionedUserId of newMentions) {
        await notifyLeadMention({
          userId: mentionedUserId,
          leadId,
          leadName,
          noteId: updatedNote.id,
          mentionedByName: notifierName,
          mentionedById: userId,
        });
      }
    }

    // Fetch author details for response
    const author = await storage.getUser(userId);

    res.json({
      ...updatedNote,
      author: {
        id: userId,
        firstName: author?.firstName || null,
        lastName: author?.lastName || null,
        email: author?.email || null,
        profileImageUrl: author?.profileImageUrl || null,
      }
    });
  } catch (error) {
    console.error("Error updating lead note:", error);
    res.status(500).json({ message: "Failed to update lead note" });
  }
});

// Delete a note
router.delete("/leads/:leadId/notes/:noteId", requireAdmin, async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    const { leadId, noteId } = req.params;

    // Get the existing note
    const [existingNote] = await db
      .select()
      .from(leadNotes)
      .where(and(eq(leadNotes.id, noteId), eq(leadNotes.leadId, leadId)));

    if (!existingNote) {
      return res.status(404).json({ message: "Note not found" });
    }

    // Only the author can delete their own notes
    if (existingNote.createdById !== userId) {
      return res.status(403).json({ message: "You can only delete your own notes" });
    }

    // Delete the note
    await db.delete(leadNotes).where(eq(leadNotes.id, noteId));

    res.json({ message: "Note deleted successfully" });
  } catch (error) {
    console.error("Error deleting lead note:", error);
    res.status(500).json({ message: "Failed to delete lead note" });
  }
});

// Get team members for mention autocomplete
router.get("/team-members", requireAdmin, async (req: any, res) => {
  try {
    const { search } = req.query;
    
    let conditions: any[] = [
      or(
        eq(users.userType, 'admin'),
        eq(users.userType, 'platform_admin')
      )
    ];

    if (search && typeof search === 'string' && search.length > 0) {
      conditions.push(
        or(
          ilike(users.firstName, `%${search}%`),
          ilike(users.lastName, `%${search}%`),
          ilike(users.email, `%${search}%`)
        )
      );
    }

    const teamMembers = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        profileImageUrl: users.profileImageUrl,
      })
      .from(users)
      .where(and(...conditions))
      .limit(20);

    res.json(teamMembers);
  } catch (error) {
    console.error("Error fetching team members:", error);
    res.status(500).json({ message: "Failed to fetch team members" });
  }
});

// Get applications linked to a contact (via linkedUserId -> studentProfiles -> applications)
router.get("/contacts/:id/applications", requireAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;

    // Get the contact
    const contact = await db
      .select()
      .from(crmContacts)
      .where(eq(crmContacts.id, id))
      .limit(1)
      .then(rows => rows[0]);

    if (!contact) {
      return res.status(404).json({ message: "Contact not found" });
    }

    // Only allow fetching applications for client-type contacts
    if (contact.contactType !== 'clients') {
      return res.json({ applications: [], studentProfile: null, message: "Applications are only available for client contacts" });
    }

    // If no linked user, return empty array
    if (!contact.linkedUserId) {
      return res.json({ applications: [], studentProfile: null });
    }

    // Get the student profile for this user
    const studentProfile = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, contact.linkedUserId))
      .limit(1)
      .then(rows => rows[0]);

    if (!studentProfile) {
      return res.json({ applications: [], studentProfile: null });
    }

    // Get all applications for this student with course details
    const contactApplications = await db
      .select({
        id: applications.id,
        courseId: applications.courseId,
        currentStage: applications.currentStage,
        status: applications.status,
        submittedAt: applications.submittedAt,
        createdAt: applications.createdAt,
        updatedAt: applications.updatedAt,
        assignedConsultantId: applications.assignedConsultantId,
        courseName: courses.title,
        courseLevel: courses.level,
        universityName: universities.name,
        universityLogo: universities.logo,
      })
      .from(applications)
      .leftJoin(courses, eq(applications.courseId, courses.id))
      .leftJoin(universities, eq(courses.universityId, universities.id))
      .where(eq(applications.studentId, studentProfile.id))
      .orderBy(desc(applications.createdAt));

    // Get assigned consultant details
    const applicationsWithConsultants = await Promise.all(
      contactApplications.map(async (app) => {
        let assignedConsultant = null;
        if (app.assignedConsultantId) {
          const consultant = await db
            .select({
              id: users.id,
              firstName: users.firstName,
              lastName: users.lastName,
              profileImageUrl: users.profileImageUrl,
            })
            .from(users)
            .where(eq(users.id, app.assignedConsultantId))
            .limit(1)
            .then(rows => rows[0]);
          assignedConsultant = consultant || null;
        }
        return { ...app, assignedConsultant };
      })
    );

    res.json({ 
      applications: applicationsWithConsultants, 
      studentProfile: {
        id: studentProfile.id,
        maxApplicationSlots: studentProfile.maxApplicationSlots,
      }
    });
  } catch (error) {
    console.error("Error fetching contact applications:", error);
    res.status(500).json({ message: "Failed to fetch contact applications" });
  }
});

// Update contact clientStatus when application is created or accepted
// Enforces proper transition rules: lead → applicant → enrolled
// Does not regress status (e.g., won't overwrite completed/inactive)
export async function updateContactStatusOnApplication(userId: string, newStatus: 'applicant' | 'enrolled'): Promise<void> {
  try {
    // Find the contact linked to this user
    const contact = await db
      .select()
      .from(crmContacts)
      .where(eq(crmContacts.linkedUserId, userId))
      .limit(1)
      .then(rows => rows[0]);

    if (!contact) {
      console.log(`[CRM] No contact found for user ${userId}`);
      return;
    }

    // Only update if contact is a client type
    if (contact.contactType !== 'clients') {
      return;
    }

    const currentStatus = contact.clientStatus;
    
    // Only progress forward in the journey, never regress status
    // Valid progression: lead/null → applicant → enrolled → completed
    // Inactive is terminal - don't modify
    if (newStatus === 'applicant') {
      // Only set to applicant if current status is lead or null
      if (currentStatus && currentStatus !== 'lead') {
        console.log(`[CRM] Skipping status update: contact ${contact.id} already at status ${currentStatus}`);
        return;
      }
    } else if (newStatus === 'enrolled') {
      // Only set to enrolled if current status is lead or applicant
      if (currentStatus && currentStatus !== 'lead' && currentStatus !== 'applicant') {
        console.log(`[CRM] Skipping status update: contact ${contact.id} already at status ${currentStatus}`);
        return;
      }
    }

    // Update the client status
    await db
      .update(crmContacts)
      .set({ 
        clientStatus: newStatus,
        updatedAt: new Date()
      })
      .where(eq(crmContacts.id, contact.id));

    console.log(`[CRM] Updated contact ${contact.id} clientStatus from ${currentStatus || 'null'} to ${newStatus}`);
  } catch (error) {
    console.error('[CRM] Error updating contact status:', error);
  }
}

export default router;
