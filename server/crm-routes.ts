import { Router } from "express";
import { db } from "./db";
import { storage } from "./storage";
import { 
  crmContacts, 
  contactStatusHistory,
  users,
  courses,
  universities,
  institutionContacts,
  insertCrmContactSchema,
  updateCrmContactSchema,
  studentProfiles,
  applications,
  applicationCourses,
  contactNotes,
  leadCoursePreferences,
} from "@shared/schema";
import { eq, desc, and, or, ilike, count, isNull, aliasedTable, ne, sql, type SQL } from "drizzle-orm";
import { logActivity } from "./activity-logger";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { buildRegionScopedFilter } from "./access-policy-service";

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
    default:
      return null; // admin and platform_admin are not synced
  }
}

// Auto-create CRM contact for new platform users (students only)
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
  entrySource?: string | null;
  branchId?: string | null;
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

    // Determine entry source - use provided or default to 'website'
    const resolvedEntrySource = user.entrySource || 'website';

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
      entrySource: resolvedEntrySource as any,
      branchId: user.branchId || null,
      linkedUserId: user.id,
      photo: user.photo || user.profileImageUrl,
    }).returning();

    if (resolvedEntrySource === 'walk_in' && user.branchId) {
      console.log(`[CRM Sync] Walk-in lead created for branch ${user.branchId}, contact ${newContact.id}`);
      // Auto-assign to branch manager
      try {
        const branchManager = await db
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              eq(users.branchId, user.branchId),
              eq(users.isActive, true),
              or(
                eq(users.userType, 'admin'),
                eq(users.userType, 'platform_admin')
              )
            )
          )
          .orderBy(sql`CASE WHEN ${users.roleId} IN (
            SELECT id FROM roles WHERE name ILIKE '%branch%manager%' OR name ILIKE '%manager%'
          ) THEN 0 ELSE 1 END`)
          .limit(1)
          .then(rows => rows[0]);

        if (branchManager) {
          await db
            .update(crmContacts)
            .set({ assignedTo: branchManager.id, updatedAt: new Date() })
            .where(eq(crmContacts.id, newContact.id));
          console.log(`[CRM Sync] Walk-in contact ${newContact.id} auto-assigned to branch manager ${branchManager.id}`);
        }
      } catch (assignError) {
        console.error(`[CRM Sync] Failed to auto-assign walk-in contact to branch manager:`, assignError);
      }
    }

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

// Sync platform users to CRM contacts (students → clients)
router.post("/contacts/sync-users", requireAdmin, async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    // Get all users that should be synced (students only)
    const usersToSync = await db
      .select()
      .from(users)
      .where(eq(users.userType, 'student'));
    
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
      leadStage,
      entrySource,
      ownerId,
      owner,
      assignedTo,
      search,
      country,
      nationality,
      unassigned,
      branchId,
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
    if (leadStage) {
      conditions.push(eq(crmContacts.leadStage, leadStage as any));
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
    if (branchId) {
      conditions.push(eq(crmContacts.branchId, branchId as string));
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

    if (req.accessContext) {
      const regionFilter = buildRegionScopedFilter(req.accessContext, {
        regionIdColumn: crmContacts.regionId,
        branchIdColumn: crmContacts.branchId,
        assignedToColumn: crmContacts.assignedTo,
        createdByColumn: crmContacts.createdByUserId,
      });
      if (regionFilter) {
        conditions.push(regionFilter);
      }
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
    const [ownerUser, assignedUser, createdByUser, updatedByUser] = await Promise.all([
      contact.contactOwner
        ? db.select().from(users).where(eq(users.id, contact.contactOwner)).limit(1)
        : Promise.resolve([]),
      contact.assignedTo
        ? db.select().from(users).where(eq(users.id, contact.assignedTo)).limit(1)
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

    const body = { ...req.body };
    for (const [key, value] of Object.entries(body)) {
      if (value && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(T|\s)/.test(value)) {
        const parsed = new Date(value);
        if (!isNaN(parsed.getTime())) {
          body[key] = parsed;
        }
      }
    }

    const validated = insertCrmContactSchema.parse(body);

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
    
    // Safety guard: lead/client fields only apply to 'clients' contact type
    const clientOnlyOverride = validated.contactType !== 'clients'
      ? { clientStatus: null, leadRating: null, leadStage: null }
      : {};

    const [newContact] = await db.insert(crmContacts).values({
      ...validated,
      ...clientOnlyOverride,
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

    const body = { ...req.body };
    for (const [key, value] of Object.entries(body)) {
      if (value && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(T|\s)/.test(value)) {
        const parsed = new Date(value);
        if (!isNaN(parsed.getTime())) {
          body[key] = parsed;
        }
      }
    }

    const validated = updateCrmContactSchema.parse(body);

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

    // Safety guard: lead/client fields only apply to 'clients' contact type
    const effectiveContactType = validated.contactType ?? existingContact.contactType;
    if (effectiveContactType !== 'clients') {
      updateData.clientStatus = null;
      updateData.leadRating = null;
      updateData.leadStage = null;
    }

    // Handle lead stage transitions with auto client status changes (clients only)
    const leadStageChanged = effectiveContactType === 'clients' &&
      validated.leadStage && validated.leadStage !== existingContact.leadStage;
    
    if (leadStageChanged) {
      // If moving to "converted", auto-set clientStatus to "applicant"
      if (validated.leadStage === 'converted' && existingContact.clientStatus === 'lead') {
        updateData.clientStatus = 'applicant';
      }
      // If moving to "lost", auto-set clientStatus to "inactive"
      if (validated.leadStage === 'lost' && existingContact.clientStatus === 'lead') {
        updateData.clientStatus = 'inactive';
      }
    }

    // Track client status change in history
    const clientStatusChanged = updateData.clientStatus && updateData.clientStatus !== existingContact.clientStatus;

    const [updatedContact] = await db
      .update(crmContacts)
      .set(updateData)
      .where(eq(crmContacts.id, id))
      .returning();

    // Log status transition history
    if (clientStatusChanged) {
      await db.insert(contactStatusHistory).values({
        contactId: id,
        fromStatus: existingContact.clientStatus,
        toStatus: updateData.clientStatus,
        changedBy: userId,
        notes: leadStageChanged 
          ? `Lead stage changed to ${validated.leadStage}` 
          : `Status manually updated`,
      });
    }

    // Log activity
    const actionParts = [];
    if (leadStageChanged) {
      actionParts.push(`lead stage to ${validated.leadStage}`);
    }
    if (clientStatusChanged) {
      actionParts.push(`status to ${updateData.clientStatus}`);
    }
    
    await logActivity({
      userId,
      entityType: "crm_contact" as any,
      entityId: id,
      entityName: `${updatedContact.firstName} ${updatedContact.lastName}`,
      action: "updated",
      actionDescription: actionParts.length > 0
        ? `Updated ${actionParts.join(' and ')} for ${updatedContact.firstName} ${updatedContact.lastName}`
        : `Updated contact: ${updatedContact.firstName} ${updatedContact.lastName}`,
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
      const sharp = (await import('sharp')).default;
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

    if (req.accessContext) {
      const regionFilter = buildRegionScopedFilter(req.accessContext, {
        regionIdColumn: users.regionId,
        branchIdColumn: users.branchId,
      });
      if (regionFilter) {
        conditions.push(regionFilter);
      }
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

// Create application on behalf of a contact (admin only)
router.post("/contacts/:id/applications", requireAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { courseId, notes } = req.body;

    // Validate required fields
    if (!courseId || typeof courseId !== 'string') {
      return res.status(400).json({ message: "Course ID is required and must be a string" });
    }
    if (notes && typeof notes !== 'string') {
      return res.status(400).json({ message: "Notes must be a string" });
    }

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

    // Only allow creating applications for client-type contacts
    if (contact.contactType !== 'clients') {
      return res.status(400).json({ message: "Applications can only be created for client contacts" });
    }

    // Check if contact has a linked user - if not, we need to create a minimal user and student profile
    let userId = contact.linkedUserId;
    
    // Get or create the student profile for this user
    let studentProfile;
    
    if (userId) {
      // Try to find existing student profile
      studentProfile = await db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, userId))
        .limit(1)
        .then(rows => rows[0]);
    }
    
    // If no student profile exists, create one automatically
    if (!studentProfile) {
      // If no linked user, we need to create one first
      if (!userId) {
        // Create a minimal user record for this contact
        const [newUser] = await db
          .insert(users)
          .values({
            email: contact.email || `contact-${contact.id}@placeholder.local`,
            name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unknown Contact',
            userType: 'student',
          } as any)
          .returning();
        
        userId = newUser.id;
        
        // Link the contact to the new user
        await db
          .update(crmContacts)
          .set({ linkedUserId: userId })
          .where(eq(crmContacts.id, contact.id));
        
        console.log(`[CRM] Created user ${userId} for contact ${contact.id}`);
      }
      
      // Now create the student profile
      const [newProfile] = await db
        .insert(studentProfiles)
        .values({
          userId: userId!,
          firstName: contact.firstName || null,
          lastName: contact.lastName || null,
          email: contact.email || null,
          phone: contact.phone || null,
          nationality: contact.nationality || null,
          countryOfResidence: contact.country || null,
          maxApplicationSlots: 3,
        } as any)
        .returning();
      studentProfile = newProfile;
      
      console.log(`[CRM] Created student profile ${studentProfile.id} for contact ${contact.id}`);
    }

    // Check application slot limit
    const existingApplications = await db
      .select({ id: applications.id })
      .from(applications)
      .where(eq(applications.studentId, studentProfile.id));

    const maxSlots = studentProfile.maxApplicationSlots || 3;
    
    if (existingApplications.length >= maxSlots) {
      return res.status(403).json({
        message: `Student has reached their maximum of ${maxSlots} applications. You can increase their slots in their student profile.`,
        currentCount: existingApplications.length,
        maxSlots: maxSlots,
      });
    }

    // Verify the course exists and is published
    const course = await db
      .select()
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1)
      .then(rows => rows[0]);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Ensure the course is published (admins can only create applications for published courses)
    if (course.publishStatus !== 'published') {
      return res.status(400).json({ message: "Can only create applications for published courses" });
    }

    // Check if student already applied to this course
    const existingApplication = await db
      .select({ id: applications.id })
      .from(applications)
      .where(and(
        eq(applications.studentId, studentProfile.id),
        eq(applications.courseId, courseId)
      ))
      .limit(1)
      .then(rows => rows[0]);

    if (existingApplication) {
      return res.status(400).json({ message: "Student has already applied to this course" });
    }

    // Generate application number
    const year = new Date().getFullYear();
    const prefix = `APP-${year}-`;
    const latestApp = await db
      .select({ applicationNumber: applications.applicationNumber })
      .from(applications)
      .where(sql`application_number LIKE ${prefix + '%'}`)
      .orderBy(sql`application_number DESC`)
      .limit(1)
      .then(rows => rows[0]);
    
    let nextNumber = 1;
    if (latestApp?.applicationNumber) {
      const currentNumber = parseInt(latestApp.applicationNumber.split('-')[2], 10);
      nextNumber = currentNumber + 1;
    }
    const applicationNumber = `${prefix}${String(nextNumber).padStart(5, '0')}`;

    // Create the application
    const [newApplication] = await db
      .insert(applications)
      .values({
        studentId: studentProfile.id,
        courseId: courseId,
        status: 'pending',
        currentStage: 'Assessment',
        additionalInfo: notes || null,
        applicationNumber,
      })
      .returning();
    
    // Also add course to applicationCourses junction table
    await db.insert(applicationCourses).values({
      applicationId: newApplication.id,
      courseId: courseId,
      isPrimary: true,
      displayOrder: 0,
      addedBy: req.user?.claims?.sub || null,
    });

    // Update contact status to 'applicant' and lead stage to 'converted' if this is the first application
    if (existingApplications.length === 0) {
      // Set lead stage to converted
      await db
        .update(crmContacts)
        .set({ 
          leadStage: 'converted',
          clientStatus: 'applicant',
          updatedAt: new Date()
        })
        .where(eq(crmContacts.id, id));
      
      // Log the status transition
      await db.insert(contactStatusHistory).values({
        contactId: id,
        fromStatus: contact.clientStatus,
        toStatus: 'applicant',
        changedBy: req.user?.claims?.sub || null,
        notes: 'Lead converted via application creation',
      });
    }

    console.log(`[CRM] Admin created application ${newApplication.id} for contact ${id} (course: ${courseId})`);

    res.json({ 
      success: true, 
      application: newApplication,
      message: "Application created successfully"
    });
  } catch (error) {
    console.error("Error creating application for contact:", error);
    res.status(500).json({ message: "Failed to create application" });
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

// ============================
// CRM LEADS CRUD ROUTES
// ============================

function mapStageToStatus(stage: string | null): string {
  switch (stage) {
    case 'new': return 'not_contacted';
    case 'contacted': return 'contacted';
    case 'qualified': return 'qualified';
    case 'counselling': return 'contacted';
    case 'ready_to_apply': return 'qualified';
    case 'converted': return 'converted';
    case 'lost': return 'lost';
    default: return 'not_contacted';
  }
}

function mapStatusToStage(status: string): string {
  switch (status) {
    case 'not_contacted': return 'new';
    case 'contacted': return 'contacted';
    case 'qualified': return 'qualified';
    case 'unqualified': return 'lost';
    case 'converted': return 'converted';
    case 'lost': return 'lost';
    default: return 'new';
  }
}

function mapEntrySourceToCreationMethod(source: string | null): string | null {
  switch (source) {
    case 'website': return 'website_form';
    case 'consultant': return 'manually';
    case 'sub_agent': return 'recruitment_agent';
    case 'affiliate': return 'manually';
    case 'import': return 'database_import';
    case 'referral': return 'referral';
    case 'facebook_ads': return 'facebook_ads';
    case 'walk_in': return 'campus_walk_in';
    case 'other': return 'manually';
    default: return null;
  }
}

function mapCreationMethodToEntrySource(method: string | null): string {
  switch (method) {
    case 'manually': return 'consultant';
    case 'website_form': return 'website';
    case 'facebook_ads': return 'facebook_ads';
    case 'google_ads': return 'other';
    case 'education_fair': return 'other';
    case 'referral': return 'referral';
    case 'recruitment_agent': return 'sub_agent';
    case 'campus_walk_in': return 'walk_in';
    case 'database_import': return 'import';
    case 'ai_web_scrape': return 'other';
    default: return 'consultant';
  }
}

function formatAsLead(contact: any, ownerUser: any, assignedUser: any, createdByUser?: any, updatedByUser?: any): any {
  return {
    id: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    preferredName: contact.preferredName,
    gender: contact.gender,
    photo: contact.photo,
    email: contact.email,
    phone: contact.phone,
    mobile: contact.mobile,
    whatsapp: contact.whatsapp,
    leadStatus: mapStageToStatus(contact.leadStage),
    leadStage: contact.leadStage,
    leadRating: contact.leadRating,
    leadSource: contact.referenceSource,
    leadCreationMethod: mapEntrySourceToCreationMethod(contact.entrySource),
    entrySource: contact.entrySource,
    branch: null,
    branchId: contact.branchId,
    nationality: contact.nationality,
    country: contact.country,
    city: contact.city,
    // Address
    unitNo: contact.unitNo,
    street: contact.street,
    suburb: contact.suburb,
    state: contact.state,
    postcode: contact.postcode,
    // Emergency Contact
    emergencyContactName: contact.emergencyContactName,
    emergencyContactMobile: contact.emergencyContactMobile,
    emergencyContactRelationship: contact.emergencyContactRelationship,
    emergencyContactAddress: contact.emergencyContactAddress,
    // Student fields
    courseId: contact.courseId,
    universityId: contact.universityId,
    courseName: contact.courseName,
    interestedIn: contact.interestedIn,
    productInterest: contact.programDiscipline,
    visaStatus: contact.visaStatus,
    intakeMonth: null,
    intakeYear: null,
    // Contact type
    contactType: contact.contactType,
    clientStatus: contact.clientStatus,
    // Visit tracking
    firstVisit: contact.firstVisit,
    firstPageVisited: contact.firstPageVisited,
    referrer: contact.referrer,
    notes: contact.notes,
    assignedTo: contact.assignedTo,
    leadOwner: contact.contactOwner,
    convertedContactId: null,
    convertedAt: null,
    lastActivityTime: contact.lastActivityTime,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
    assignedToUser: assignedUser?.id ? assignedUser : null,
    ownerUser: ownerUser?.id ? ownerUser : null,
    createdByUser: createdByUser?.id ? createdByUser : null,
    updatedByUser: updatedByUser?.id ? updatedByUser : null,
  };
}

// GET /leads - list all leads (crmContacts with clientStatus='lead')
router.get("/leads", requireAdmin, async (req: any, res) => {
  try {
    const { status, rating, branch, source, country, assignedTo, search } = req.query;

    const conditions: any[] = [eq(crmContacts.clientStatus, 'lead')];

    if (status) {
      const stage = mapStatusToStage(status as string);
      conditions.push(eq(crmContacts.leadStage, stage as any));
    }
    if (rating) {
      conditions.push(eq(crmContacts.leadRating, rating as any));
    }
    if (branch) {
      conditions.push(eq(crmContacts.branchId, branch as string));
    }
    if (country) {
      conditions.push(eq(crmContacts.country, country as string));
    }
    if (assignedTo) {
      conditions.push(eq(crmContacts.assignedTo, assignedTo as string));
    }
    if (source) {
      const entrySource = mapCreationMethodToEntrySource(source as string);
      conditions.push(eq(crmContacts.entrySource, entrySource as any));
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

    if (req.accessContext) {
      const regionFilter = buildRegionScopedFilter(req.accessContext, {
        regionIdColumn: crmContacts.regionId,
        branchIdColumn: crmContacts.branchId,
        assignedToColumn: crmContacts.assignedTo,
        createdByColumn: crmContacts.createdByUserId,
      });
      if (regionFilter) conditions.push(regionFilter);
    }

    const whereClause = and(...conditions);

    const ownerUsers = aliasedTable(users, "lead_owner_u");
    const assignedUsers = aliasedTable(users, "lead_assigned_u");

    const [leads, totalResult] = await Promise.all([
      db.select({
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
        .limit(200),
      db.select({ count: count() }).from(crmContacts).where(whereClause),
    ]);

    res.json({
      leads: leads.map(({ contact, ownerUser, assignedUser }) =>
        formatAsLead(contact, ownerUser, assignedUser)
      ),
      total: totalResult[0]?.count || 0,
    });
  } catch (error) {
    console.error("Error fetching leads:", error);
    res.status(500).json({ message: "Failed to fetch leads" });
  }
});

// GET /leads/:id - get single lead with status history
router.get("/leads/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const ownerUsers = aliasedTable(users, "sl_owner_u");
    const assignedUsers = aliasedTable(users, "sl_assigned_u");
    const createdByUsers = aliasedTable(users, "sl_created_u");
    const updatedByUsers = aliasedTable(users, "sl_updated_u");

    const result = await db
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
        createdByUser: {
          id: createdByUsers.id,
          firstName: createdByUsers.firstName,
          lastName: createdByUsers.lastName,
          profileImageUrl: createdByUsers.profileImageUrl,
        },
        updatedByUser: {
          id: updatedByUsers.id,
          firstName: updatedByUsers.firstName,
          lastName: updatedByUsers.lastName,
          profileImageUrl: updatedByUsers.profileImageUrl,
        },
      })
      .from(crmContacts)
      .leftJoin(ownerUsers, eq(crmContacts.contactOwner, ownerUsers.id))
      .leftJoin(assignedUsers, eq(crmContacts.assignedTo, assignedUsers.id))
      .leftJoin(createdByUsers, eq(crmContacts.createdByUserId, createdByUsers.id))
      .leftJoin(updatedByUsers, eq(crmContacts.updatedByUserId, updatedByUsers.id))
      .where(eq(crmContacts.id, id))
      .limit(1)
      .then((rows) => rows[0]);

    if (!result) return res.status(404).json({ message: "Lead not found" });

    const statusHistory = await db
      .select()
      .from(contactStatusHistory)
      .where(eq(contactStatusHistory.contactId, id))
      .orderBy(desc(contactStatusHistory.createdAt))
      .limit(20);

    res.json({
      ...formatAsLead(result.contact, result.ownerUser, result.assignedUser, result.createdByUser, result.updatedByUser),
      statusHistory,
    });
  } catch (error) {
    console.error("Error fetching lead:", error);
    res.status(500).json({ message: "Failed to fetch lead" });
  }
});

// POST /leads - create new lead
router.post("/leads", requireAdmin, async (req: any, res) => {
  try {
    const userId = getUserId(req);
    const {
      firstName, lastName, email, phone, mobile,
      leadStatus, leadRating, leadCreationMethod, leadSource,
      branchId, nationality, country, city,
      courseId, universityId, courseName, interestedIn, productInterest,
      notes, referrer, assignedTo, leadOwner,
    } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ message: "First name, last name, and email are required" });
    }

    const [contact] = await db.insert(crmContacts).values({
      firstName,
      lastName,
      email: email.trim().toLowerCase(),
      phone: phone || null,
      mobile: mobile || null,
      contactType: 'clients',
      clientStatus: 'lead',
      leadStage: mapStatusToStage(leadStatus || 'not_contacted') as any,
      leadRating: (leadRating || 'cold') as any,
      entrySource: mapCreationMethodToEntrySource(leadCreationMethod || 'manually') as any,
      referenceSource: leadSource || null,
      branchId: branchId || null,
      nationality: nationality || null,
      country: country || null,
      city: city || null,
      courseId: courseId || null,
      universityId: universityId || null,
      courseName: courseName || null,
      interestedIn: interestedIn || null,
      programDiscipline: productInterest || null,
      notes: notes || null,
      referrer: referrer || null,
      assignedTo: assignedTo || null,
      contactOwner: leadOwner || userId,
      createdByUserId: userId || undefined,
    } as any).returning();

    res.status(201).json(formatAsLead(contact, null, null));
  } catch (error) {
    console.error("Error creating lead:", error);
    res.status(500).json({ message: "Failed to create lead" });
  }
});

// PATCH /leads/:id - update lead
router.patch("/leads/:id", requireAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const existing = await db
      .select()
      .from(crmContacts)
      .where(eq(crmContacts.id, id))
      .limit(1)
      .then((r) => r[0]);
    if (!existing) return res.status(404).json({ message: "Lead not found" });

    const updates: any = { updatedAt: new Date() };
    if (userId) updates.updatedByUserId = userId;

    const {
      firstName, lastName, email, phone, mobile, whatsapp,
      leadStatus, leadStage, leadRating, leadCreationMethod, leadSource,
      branchId, nationality, country, city,
      unitNo, street, suburb, state, postcode,
      emergencyContactName, emergencyContactMobile, emergencyContactRelationship, emergencyContactAddress,
      courseId, universityId, courseName, interestedIn, productInterest,
      notes, referrer, assignedTo, leadOwner,
    } = req.body;

    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (email !== undefined) updates.email = email.trim().toLowerCase();
    if (phone !== undefined) updates.phone = phone;
    if (mobile !== undefined) updates.mobile = mobile;
    if (whatsapp !== undefined) updates.whatsapp = whatsapp;
    if (leadStatus !== undefined) updates.leadStage = mapStatusToStage(leadStatus);
    if (leadStage !== undefined) updates.leadStage = leadStage;
    if (leadRating !== undefined) updates.leadRating = leadRating;
    if (leadCreationMethod !== undefined) updates.entrySource = mapCreationMethodToEntrySource(leadCreationMethod);
    if (leadSource !== undefined) updates.referenceSource = leadSource;
    if (branchId !== undefined) updates.branchId = branchId;
    if (nationality !== undefined) updates.nationality = nationality;
    if (country !== undefined) updates.country = country;
    if (city !== undefined) updates.city = city;
    if (unitNo !== undefined) updates.unitNo = unitNo;
    if (street !== undefined) updates.street = street;
    if (suburb !== undefined) updates.suburb = suburb;
    if (state !== undefined) updates.state = state;
    if (postcode !== undefined) updates.postcode = postcode;
    if (emergencyContactName !== undefined) updates.emergencyContactName = emergencyContactName;
    if (emergencyContactMobile !== undefined) updates.emergencyContactMobile = emergencyContactMobile;
    if (emergencyContactRelationship !== undefined) updates.emergencyContactRelationship = emergencyContactRelationship;
    if (emergencyContactAddress !== undefined) updates.emergencyContactAddress = emergencyContactAddress;
    if (courseId !== undefined) updates.courseId = courseId;
    if (universityId !== undefined) updates.universityId = universityId;
    if (courseName !== undefined) updates.courseName = courseName;
    if (interestedIn !== undefined) updates.interestedIn = interestedIn;
    if (productInterest !== undefined) updates.programDiscipline = productInterest;
    if (notes !== undefined) updates.notes = notes;
    if (referrer !== undefined) updates.referrer = referrer;
    if (assignedTo !== undefined) updates.assignedTo = assignedTo;
    if (leadOwner !== undefined) updates.contactOwner = leadOwner;

    const [updated] = await db
      .update(crmContacts)
      .set(updates)
      .where(eq(crmContacts.id, id))
      .returning();

    res.json(formatAsLead(updated, null, null));
  } catch (error) {
    console.error("Error updating lead:", error);
    res.status(500).json({ message: "Failed to update lead" });
  }
});

// DELETE /leads/:id - delete lead
router.delete("/leads/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(crmContacts).where(eq(crmContacts.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting lead:", error);
    res.status(500).json({ message: "Failed to delete lead" });
  }
});

// POST /leads/:id/convert - convert lead to a full contact
router.post("/leads/:id/convert", requireAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { contactType } = req.body;

    const existing = await db
      .select()
      .from(crmContacts)
      .where(eq(crmContacts.id, id))
      .limit(1)
      .then((r) => r[0]);
    if (!existing) return res.status(404).json({ message: "Lead not found" });

    const [updated] = await db
      .update(crmContacts)
      .set({
        contactType: (contactType || 'clients') as any,
        clientStatus: 'applicant',
        leadStage: 'converted',
        updatedAt: new Date(),
      })
      .where(eq(crmContacts.id, id))
      .returning();

    res.json({ success: true, contact: updated });
  } catch (error) {
    console.error("Error converting lead:", error);
    res.status(500).json({ message: "Failed to convert lead" });
  }
});

// ============================
// LEAD / CONTACT NOTES ROUTES
// ============================

router.get("/leads/:id/notes", requireAdmin, async (req: any, res) => {
  try {
    const contactId = req.params.id;
    const contact = await db.select().from(crmContacts).where(eq(crmContacts.id, contactId)).limit(1).then(r => r[0]);
    if (!contact) return res.status(404).json({ message: "Contact not found" });

    const notes = await db
      .select({
        id: contactNotes.id,
        contactId: contactNotes.contactId,
        title: contactNotes.title,
        content: contactNotes.content,
        mentions: contactNotes.mentions,
        visibility: contactNotes.visibility,
        visibleTo: contactNotes.visibleTo,
        createdById: contactNotes.createdById,
        createdAt: contactNotes.createdAt,
        authorFirstName: users.firstName,
        authorLastName: users.lastName,
        authorEmail: users.email,
        authorProfileImageUrl: users.profileImageUrl,
      })
      .from(contactNotes)
      .leftJoin(users, eq(contactNotes.createdById, users.id))
      .where(eq(contactNotes.contactId, contactId))
      .orderBy(desc(contactNotes.createdAt));

    const userId = getUserId(req) || "";
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
      leadId: n.contactId,
      title: n.title,
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
  } catch (error) {
    console.error("Error fetching lead notes:", error);
    res.status(500).json({ message: "Failed to fetch notes" });
  }
});

router.post("/leads/:id/notes", requireAdmin, async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const contactId = req.params.id;
    const { title, content, mentions, visibility, visibleTo } = req.body;
    if (!content) return res.status(400).json({ message: "Content is required" });

    const contact = await db.select().from(crmContacts).where(eq(crmContacts.id, contactId)).limit(1).then(r => r[0]);
    if (!contact) return res.status(404).json({ message: "Contact not found" });

    const [newNote] = await db.insert(contactNotes).values({
      contactId,
      title: title || null,
      content,
      mentions: mentions || [],
      visibility: visibility || 'public',
      visibleTo: visibleTo || [],
      createdById: userId,
    }).returning();

    const author = await db.select().from(users).where(eq(users.id, userId)).limit(1).then(r => r[0]);

    res.status(201).json({
      ...newNote,
      leadId: newNote.contactId,
      author: author ? {
        id: author.id,
        firstName: author.firstName,
        lastName: author.lastName,
        email: author.email,
        profileImageUrl: author.profileImageUrl,
      } : null,
    });
  } catch (error) {
    console.error("Error creating lead note:", error);
    res.status(500).json({ message: "Failed to create note" });
  }
});

router.put("/leads/:id/notes/:noteId", requireAdmin, async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { noteId } = req.params;
    const { title, content, mentions, visibility, visibleTo } = req.body;

    const existing = await db.select().from(contactNotes).where(eq(contactNotes.id, noteId)).limit(1).then(r => r[0]);
    if (!existing) return res.status(404).json({ message: "Note not found" });

    if (existing.createdById !== userId) {
      const { isAdmin: admin } = await isAdminTeamMember(userId);
      if (!admin) return res.status(403).json({ message: "Cannot edit this note" });
    }

    const [updated] = await db
      .update(contactNotes)
      .set({
        title: title !== undefined ? title : existing.title,
        content: content || existing.content,
        mentions: mentions !== undefined ? mentions : existing.mentions,
        visibility: visibility || existing.visibility,
        visibleTo: visibleTo !== undefined ? visibleTo : existing.visibleTo,
      })
      .where(eq(contactNotes.id, noteId))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("Error updating lead note:", error);
    res.status(500).json({ message: "Failed to update note" });
  }
});

router.delete("/leads/:id/notes/:noteId", requireAdmin, async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { noteId } = req.params;
    const existing = await db.select().from(contactNotes).where(eq(contactNotes.id, noteId)).limit(1).then(r => r[0]);
    if (!existing) return res.status(404).json({ message: "Note not found" });

    if (existing.createdById !== userId) {
      const { isAdmin: admin } = await isAdminTeamMember(userId);
      if (!admin) return res.status(403).json({ message: "Cannot delete this note" });
    }

    await db.delete(contactNotes).where(eq(contactNotes.id, noteId));
    res.json({ message: "Note deleted" });
  } catch (error) {
    console.error("Error deleting lead note:", error);
    res.status(500).json({ message: "Failed to delete note" });
  }
});

// ─── Lead Course Preferences ───────────────────────────────────────────────

// GET /api/crm/leads/:id/preferences
router.get("/leads/:id/preferences", requireAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;
    const rows = await db
      .select({
        preferenceRank: leadCoursePreferences.preferenceRank,
        country: leadCoursePreferences.country,
        universityId: leadCoursePreferences.universityId,
        universityName: universities.name,
        courseId: leadCoursePreferences.courseId,
        courseName: leadCoursePreferences.courseName,
      })
      .from(leadCoursePreferences)
      .leftJoin(universities, eq(leadCoursePreferences.universityId, universities.id))
      .where(eq(leadCoursePreferences.leadId, id))
      .orderBy(leadCoursePreferences.preferenceRank);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching lead preferences:", error);
    res.status(500).json({ message: "Failed to fetch preferences" });
  }
});

// PUT /api/crm/leads/:id/preferences — bulk replace
router.put("/leads/:id/preferences", requireAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;

    // Verify lead exists
    const lead = await db
      .select({ id: crmContacts.id })
      .from(crmContacts)
      .where(eq(crmContacts.id, id))
      .limit(1)
      .then(r => r[0]);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    const payload = req.body;
    if (!Array.isArray(payload)) {
      return res.status(400).json({ message: "Body must be an array of preferences" });
    }

    // Delete existing and re-insert
    await db.delete(leadCoursePreferences).where(eq(leadCoursePreferences.leadId, id));

    if (payload.length > 0) {
      const toInsert = payload
        .slice(0, 3)
        .map((p: any) => ({
          leadId: id,
          preferenceRank: p.rank ?? p.preferenceRank ?? 1,
          country: p.country ?? null,
          universityId: p.universityId ?? null,
          courseId: p.courseId ?? null,
          courseName: p.courseName ?? null,
        }));
      await db.insert(leadCoursePreferences).values(toInsert);
    }

    const saved = await db
      .select()
      .from(leadCoursePreferences)
      .where(eq(leadCoursePreferences.leadId, id))
      .orderBy(leadCoursePreferences.preferenceRank);
    res.json(saved);
  } catch (error) {
    console.error("Error saving lead preferences:", error);
    res.status(500).json({ message: "Failed to save preferences" });
  }
});

// Note attachment upload route
const noteAttachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only images (JPEG, PNG, GIF, WebP) and PDFs are allowed."));
    }
  },
});

router.post(
  "/notes/upload-attachment",
  requireAdmin,
  noteAttachmentUpload.single("file"),
  async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const file = req.file;
      if (!file) return res.status(400).json({ message: "No file uploaded" });

      const timestamp = Date.now();
      const ext = path.extname(file.originalname);
      const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, "_");
      const sanitizedFilename = `${baseName}_${timestamp}${ext}`;
      const objectPath = `public/note-attachments/${userId}/${sanitizedFilename}`;

      if (!process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID) {
        return res.status(503).json({ message: "Object storage not configured" });
      }

      const { Client } = await import("@replit/object-storage");
      const storageClient = new Client();
      const uploadResult = await storageClient.uploadFromBytes(objectPath, file.buffer, {
        contentType: file.mimetype,
      });

      if (!uploadResult.ok) {
        console.error("Object storage upload failed:", uploadResult.error);
        return res.status(500).json({ message: "Failed to upload file" });
      }

      const url = `/api/public-storage/public/note-attachments/${userId}/${sanitizedFilename}`;

      res.json({
        url,
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      });
    } catch (error) {
      console.error("Error uploading note attachment:", error);
      res.status(500).json({ message: "Failed to upload attachment" });
    }
  }
);

router.get("/notes/attachment/:encodedPath(*)", async (req: any, res) => {
  try {
    const objectPath = decodeURIComponent(req.params.encodedPath);

    if (!objectPath.startsWith("public/note-attachments/")) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (!process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID) {
      return res.status(503).json({ message: "Object storage not configured" });
    }

    const { Client } = await import("@replit/object-storage");
    const storageClient = new Client();
    const result = await storageClient.downloadAsBytes(objectPath);

    if (!result.ok || !result.value) {
      return res.status(404).json({ message: "File not found" });
    }

    const ext = path.extname(objectPath).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".pdf": "application/pdf",
    };
    const contentType = contentTypeMap[ext] || "application/octet-stream";

    const buffer = Buffer.concat(
      (result.value as Buffer[]).map((c) => (Buffer.isBuffer(c) ? c : Buffer.from(c)))
    );

    res.set("Content-Type", contentType);
    res.set("Cache-Control", "private, max-age=3600");
    if (contentType === "application/pdf") {
      res.set("Content-Disposition", `inline; filename="${path.basename(objectPath)}"`);
    }
    res.send(buffer);
  } catch (error) {
    console.error("Error serving note attachment:", error);
    res.status(500).json({ message: "Failed to serve file" });
  }
});

export default router;
