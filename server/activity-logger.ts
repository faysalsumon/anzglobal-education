import { db } from "../db";
import { activityLogs, type ActivityLog, type InsertActivityLog } from "../shared/schema";
import type { Request } from "express";

// Type for field-level change tracking
export interface FieldChange {
  before: any;
  after: any;
}

export interface ActivityChanges {
  [fieldName: string]: FieldChange;
}

// Type for activity metadata
export interface ActivityMetadata {
  ipAddress?: string;
  userAgent?: string;
  [key: string]: any;
}

// Extract user info from authenticated request
function getUserInfoFromRequest(req: Request) {
  const user = req.user as any;
  
  if (!user) {
    return {
      userId: null,
      userEmail: "System",
      userName: "System",
      userProfilePicture: null,
      userType: null,
    };
  }

  // Handle both OIDC and email/password authentication
  const userId = user.id || user.claims?.sub;
  const email = user.email || user.claims?.email;
  const firstName = user.firstName || user.claims?.first_name;
  const lastName = user.lastName || user.claims?.last_name;
  const profilePicture = user.profileImageUrl || user.claims?.profile_image;
  const userType = user.userType;

  return {
    userId: userId || null,
    userEmail: email || "Unknown",
    userName: firstName && lastName ? `${firstName} ${lastName}` : (firstName || email || "Unknown User"),
    userProfilePicture: profilePicture || null,
    userType: userType || null,
  };
}

// Generate human-readable action description based on changes
function generateActionDescription(
  action: string,
  entityType: string,
  entityName: string | null | undefined,
  changes?: ActivityChanges
): string {
  const displayName = entityName || `${entityType}`;
  
  switch (action) {
    case 'created':
      return `Created ${entityType}: ${displayName}`;
    
    case 'updated':
      if (changes && Object.keys(changes).length > 0) {
        const changedFields = Object.keys(changes).slice(0, 3); // Show first 3 fields
        const fieldList = changedFields.map(field => {
          const change = changes[field];
          // For simple values, show before/after
          if (typeof change.after === 'string' || typeof change.after === 'number') {
            return `${field} from "${change.before || 'empty'}" to "${change.after}"`;
          }
          return field;
        }).join(', ');
        
        const moreFields = Object.keys(changes).length > 3 ? ` and ${Object.keys(changes).length - 3} more fields` : '';
        return `Updated ${entityType} ${displayName}: Changed ${fieldList}${moreFields}`;
      }
      return `Updated ${entityType}: ${displayName}`;
    
    case 'deleted':
      return `Deleted ${entityType}: ${displayName}`;
    
    case 'approved':
      return `Approved ${entityType}: ${displayName}`;
    
    case 'rejected':
      return `Rejected ${entityType}: ${displayName}`;
    
    case 'activated':
      return `Activated ${entityType}: ${displayName}`;
    
    case 'deactivated':
      return `Deactivated ${entityType}: ${displayName}`;
    
    case 'assigned':
      return `Assigned ${entityType}: ${displayName}`;
    
    case 'unassigned':
      return `Unassigned ${entityType}: ${displayName}`;
    
    case 'status_changed':
      if (changes?.status) {
        return `Changed ${entityType} ${displayName} status from "${changes.status.before}" to "${changes.status.after}"`;
      }
      return `Changed status of ${entityType}: ${displayName}`;
    
    case 'imported':
      return `Imported ${entityType}: ${displayName}`;
    
    case 'exported':
      return `Exported ${entityType}: ${displayName}`;
    
    case 'login':
      return `Logged in`;
    
    case 'logout':
      return `Logged out`;
    
    default:
      return `Performed ${action} on ${entityType}: ${displayName}`;
  }
}

// Main logging function
export async function logActivity(params: {
  req?: Request; // Optional - for extracting user info automatically
  userId?: string | null;
  userEmail?: string;
  userName?: string;
  userProfilePicture?: string | null;
  userType?: string | null;
  entityType: InsertActivityLog['entityType'];
  entityId: string;
  entityName?: string | null;
  action: InsertActivityLog['action'];
  changes?: ActivityChanges;
  metadata?: ActivityMetadata;
  actionDescription?: string; // Optional - will auto-generate if not provided
}): Promise<ActivityLog> {
  // Extract user info from request or use provided values
  const userInfo = params.req 
    ? getUserInfoFromRequest(params.req)
    : {
        userId: params.userId || null,
        userEmail: params.userEmail || "System",
        userName: params.userName || "System",
        userProfilePicture: params.userProfilePicture || null,
        userType: params.userType || null,
      };

  // Generate action description if not provided
  const actionDescription = params.actionDescription || generateActionDescription(
    params.action,
    params.entityType,
    params.entityName,
    params.changes
  );

  // Prepare metadata
  const metadata: ActivityMetadata = {
    ...params.metadata,
  };

  if (params.req) {
    metadata.ipAddress = params.req.ip || params.req.socket.remoteAddress;
    metadata.userAgent = params.req.get('user-agent');
  }

  // Insert activity log
  const [activityLog] = await db.insert(activityLogs).values({
    userId: userInfo.userId,
    userEmail: userInfo.userEmail,
    userName: userInfo.userName,
    userProfilePicture: userInfo.userProfilePicture,
    userType: userInfo.userType,
    entityType: params.entityType,
    entityId: params.entityId,
    entityName: params.entityName || null,
    action: params.action,
    actionDescription,
    changes: params.changes || null,
    metadata,
  }).returning();

  return activityLog;
}

// Helper function to compute field-level changes between old and new objects
export function computeChanges(
  oldData: Record<string, any>,
  newData: Record<string, any>,
  fieldsToTrack?: string[] // Optional - only track specific fields
): ActivityChanges {
  const changes: ActivityChanges = {};
  
  const fields = fieldsToTrack || Object.keys(newData);
  
  for (const field of fields) {
    // Skip internal/system fields
    if (['id', 'createdAt', 'updatedAt', 'password'].includes(field)) {
      continue;
    }
    
    const oldValue = oldData[field];
    const newValue = newData[field];
    
    // Check if values are different
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes[field] = {
        before: oldValue,
        after: newValue,
      };
    }
  }
  
  return changes;
}

// Convenience functions for common operations

export async function logCreate(params: {
  req?: Request;
  entityType: InsertActivityLog['entityType'];
  entityId: string;
  entityName?: string;
  metadata?: ActivityMetadata;
}) {
  return logActivity({
    ...params,
    action: 'created',
  });
}

export async function logUpdate(params: {
  req?: Request;
  entityType: InsertActivityLog['entityType'];
  entityId: string;
  entityName?: string;
  oldData: Record<string, any>;
  newData: Record<string, any>;
  fieldsToTrack?: string[];
  metadata?: ActivityMetadata;
}) {
  const changes = computeChanges(params.oldData, params.newData, params.fieldsToTrack);
  
  // Only log if there are actual changes
  if (Object.keys(changes).length === 0) {
    return null;
  }
  
  return logActivity({
    req: params.req,
    entityType: params.entityType,
    entityId: params.entityId,
    entityName: params.entityName,
    action: 'updated',
    changes,
    metadata: params.metadata,
  });
}

export async function logDelete(params: {
  req?: Request;
  entityType: InsertActivityLog['entityType'];
  entityId: string;
  entityName?: string;
  metadata?: ActivityMetadata;
}) {
  return logActivity({
    ...params,
    action: 'deleted',
  });
}

export async function logApprove(params: {
  req?: Request;
  entityType: InsertActivityLog['entityType'];
  entityId: string;
  entityName?: string;
  metadata?: ActivityMetadata;
}) {
  return logActivity({
    ...params,
    action: 'approved',
  });
}

export async function logReject(params: {
  req?: Request;
  entityType: InsertActivityLog['entityType'];
  entityId: string;
  entityName?: string;
  reason?: string;
  metadata?: ActivityMetadata;
}) {
  return logActivity({
    ...params,
    action: 'rejected',
    metadata: {
      ...params.metadata,
      reason: params.reason,
    },
  });
}

export async function logStatusChange(params: {
  req?: Request;
  entityType: InsertActivityLog['entityType'];
  entityId: string;
  entityName?: string;
  oldStatus: string;
  newStatus: string;
  metadata?: ActivityMetadata;
}) {
  return logActivity({
    req: params.req,
    entityType: params.entityType,
    entityId: params.entityId,
    entityName: params.entityName,
    action: 'status_changed',
    changes: {
      status: {
        before: params.oldStatus,
        after: params.newStatus,
      },
    },
    metadata: params.metadata,
  });
}
