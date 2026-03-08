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
} from "@shared/schema";
import { eq, desc, and, or, ilike, count, isNull, aliasedTable, ne, sql, type SQL } from "drizzle-orm";
import { logActivity } from "./activity-logger";
import multer from "multer";
import sharp from "sharp";
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

    // Handle lead stage transitions with auto client status changes
    const leadStageChanged = validated.leadStage && validated.leadStage !== existingContact.leadStage;
    
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

    res.json(notes.map(n => ({
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

export default router;
