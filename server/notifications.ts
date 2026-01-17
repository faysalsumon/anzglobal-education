import { db } from "./db";
import { notifications } from "@shared/schema";
import { sendToUser } from "./websocket-clients";

export type NotificationType = 
  | "application_submitted"
  | "application_status_changed"
  | "application_assigned"
  | "new_course_published"
  | "team_member_added"
  | "profile_update"
  | "document_uploaded"
  | "document_verified"
  | "document_rejected"
  | "document_requested"
  | "message_received"
  | "institution_approval_request"
  | "institution_approved"
  | "institution_rejected"
  | "institution_assigned"
  | "course_assigned"
  | "internal_note_mention"
  | "lead_mention"
  | "lead_assigned"
  | "lead_status_changed"
  | "task_assigned"
  | "task_due_reminder"
  | "task_completed"
  | "general";

/**
 * Notification Link Registry
 * 
 * This registry maps notification types to their deep-link URL templates.
 * When adding a new notification type:
 * 1. Add the type to NotificationType above
 * 2. Add a link template here with the required data parameters
 * 3. Create a helper function below for easy notification creation
 * 
 * Templates use data properties for dynamic URLs.
 * Example: { leadId: "123", showNotes: true } -> "/admin?tab=crm-leads&leadId=123&showNotes=true"
 */
type NotificationLinkGenerator = (data: Record<string, any>) => string;

const NOTIFICATION_LINK_REGISTRY: Record<NotificationType, NotificationLinkGenerator | null> = {
  // Application notifications
  application_submitted: (data) => `/university/applications${data.applicationId ? `?id=${data.applicationId}` : ''}`,
  application_status_changed: (data) => `/student/applications${data.applicationId ? `?id=${data.applicationId}` : ''}`,
  application_assigned: (data) => `/admin/applications/${data.applicationId}`,
  
  // Course notifications
  new_course_published: (data) => `/courses/${data.courseId}`,
  course_assigned: (data) => `/admin?tab=courses&courseId=${data.courseId}`,
  
  // Institution notifications
  institution_approval_request: (data) => `/admin?tab=institutions&institutionId=${data.institutionId}`,
  institution_approved: (data) => `/university/profile`,
  institution_rejected: (data) => `/university/profile`,
  institution_assigned: (data) => `/admin?tab=institutions&institutionId=${data.institutionId}`,
  
  // Team notifications
  team_member_added: () => `/university/profile`,
  
  // Profile notifications
  profile_update: (data) => data.userType === 'student' ? `/student/profile` : `/admin/profile`,
  
  // Document notifications
  document_uploaded: (data) => `/student/applications${data.applicationId ? `?id=${data.applicationId}` : ''}`,
  document_verified: (data) => `/student/applications${data.applicationId ? `?id=${data.applicationId}` : ''}`,
  document_rejected: (data) => `/student/applications${data.applicationId ? `?id=${data.applicationId}` : ''}`,
  document_requested: (data) => `/student/applications${data.applicationId ? `?id=${data.applicationId}` : ''}`,
  
  // Message notifications
  message_received: (data) => data.chatId ? `/messages?chatId=${data.chatId}` : `/messages`,
  
  // CRM Lead notifications
  lead_mention: (data) => `/admin?tab=crm-leads&leadId=${data.leadId}&showNotes=true`,
  lead_assigned: (data) => `/admin?tab=crm-leads&leadId=${data.leadId}`,
  lead_status_changed: (data) => `/admin?tab=crm-leads&leadId=${data.leadId}`,
  
  // Internal note mentions
  internal_note_mention: (data) => {
    if (data.entityType === 'lead') return `/admin?tab=crm-leads&leadId=${data.entityId}&showNotes=true`;
    if (data.entityType === 'application') return `/admin/applications/${data.entityId}`;
    if (data.entityType === 'institution') return `/admin?tab=institutions&institutionId=${data.entityId}`;
    return `/admin`;
  },
  
  // Task notifications
  task_assigned: (data) => `/admin?tab=tasks&taskId=${data.taskId}`,
  task_due_reminder: (data) => `/admin?tab=tasks&taskId=${data.taskId}`,
  task_completed: (data) => `/admin?tab=tasks&taskId=${data.taskId}`,
  
  // General fallback (no auto-link)
  general: null,
};

/**
 * Get the deep-link URL for a notification based on its type and data
 */
export function getNotificationLink(type: NotificationType, data?: Record<string, any>): string | null {
  const generator = NOTIFICATION_LINK_REGISTRY[type];
  if (!generator) return null;
  return generator(data || {});
}

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;  // Optional - will be auto-generated from registry if not provided
  metadata?: Record<string, any>;
}

/**
 * Create a notification with automatic link generation
 * 
 * If no link is provided, it will be auto-generated based on the notification type
 * and the metadata/data provided.
 */
export async function createNotification(params: CreateNotificationParams) {
  const { userId, type, title, message, link, metadata } = params;
  
  // Auto-generate link if not explicitly provided
  const finalLink = link ?? getNotificationLink(type, metadata);
  
  const [notification] = await db
    .insert(notifications)
    .values({
      userId,
      type,
      title,
      message,
      link: finalLink || null,
      metadata: metadata ? JSON.stringify(metadata) : null,
      isRead: false,
    })
    .returning();
  
  // Send real-time notification via WebSocket if user is connected
  const sent = sendToUser(userId, {
    type: 'new_notification',
    notification,
  });
  
  if (sent) {
    console.log(`[Notification] Real-time notification sent to user ${userId}`);
  }
  
  return notification;
}

export async function notifyNewApplication(params: {
  universityUserId: string;
  studentName: string;
  courseName: string;
  applicationId: string;
}) {
  return createNotification({
    userId: params.universityUserId,
    type: "application_submitted",
    title: "New Application Received",
    message: `${params.studentName} applied for ${params.courseName}`,
    link: `/university/applications`,
    metadata: {
      applicationId: params.applicationId,
      studentName: params.studentName,
      courseName: params.courseName,
    },
  });
}

export async function notifyApplicationStatusChange(params: {
  studentUserId: string;
  courseName: string;
  institutionName: string;
  status: string;
  applicationId: string;
}) {
  const statusMessages: Record<string, string> = {
    accepted: "Congratulations! Your application has been accepted",
    rejected: "Your application status has been updated",
    under_review: "Your application is now under review",
    pending: "Your application is pending review",
  };

  return createNotification({
    userId: params.studentUserId,
    type: "application_status_changed",
    title: `Application Update - ${params.institutionName}`,
    message: statusMessages[params.status] || "Your application status has changed",
    link: `/student/applications`,
    metadata: {
      applicationId: params.applicationId,
      courseName: params.courseName,
      institutionName: params.institutionName,
      status: params.status,
    },
  });
}

export async function notifyNewCoursePublished(params: {
  studentUserId: string;
  courseName: string;
  institutionName: string;
  courseId: string;
}) {
  return createNotification({
    userId: params.studentUserId,
    type: "new_course_published",
    title: "New Course Available",
    message: `${params.institutionName} has published a new course: ${params.courseName}`,
    link: `/courses/${params.courseId}`,
    metadata: {
      courseId: params.courseId,
      courseName: params.courseName,
      institutionName: params.institutionName,
    },
  });
}

export async function notifyTeamMemberAdded(params: {
  userId: string;
  universityName: string;
  role: string;
}) {
  return createNotification({
    userId: params.userId,
    type: "team_member_added",
    title: "Added to University Team",
    message: `You've been added to ${params.universityName} as ${params.role}`,
    link: `/university/profile`,
    metadata: {
      universityName: params.universityName,
      role: params.role,
    },
  });
}

export async function notifyProfileUpdate(params: {
  userId: string;
  message: string;
  completionPercentage?: number;
}) {
  return createNotification({
    userId: params.userId,
    type: "profile_update",
    title: "Profile Update",
    message: params.message,
    link: `/student/profile`,
    metadata: {
      completionPercentage: params.completionPercentage,
    },
  });
}

export async function notifyDocumentUploaded(params: {
  userId: string;
  documentName: string;
  applicationId: string;
}) {
  return createNotification({
    userId: params.userId,
    type: "document_uploaded",
    title: "Document Uploaded",
    message: `${params.documentName} has been uploaded`,
    link: `/student/applications`,
    metadata: {
      documentName: params.documentName,
      applicationId: params.applicationId,
    },
  });
}

export async function notifyGeneral(params: {
  userId: string;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
}) {
  return createNotification({
    userId: params.userId,
    type: "general",
    title: params.title,
    message: params.message,
    link: params.link,
    metadata: params.metadata,
  });
}

export async function notifyApplicationAssigned(params: {
  consultantUserId: string;
  studentName: string;
  courseName: string;
  applicationId: string;
  assignedByName: string;
}) {
  return createNotification({
    userId: params.consultantUserId,
    type: "application_assigned",
    title: "New Application Assigned",
    message: `${params.assignedByName} assigned you an application from ${params.studentName} for ${params.courseName}`,
    metadata: {
      applicationId: params.applicationId,
      studentName: params.studentName,
      courseName: params.courseName,
      assignedByName: params.assignedByName,
    },
  });
}

// ==========================================
// CRM Lead Notification Helpers
// ==========================================

/**
 * Notify a user that they were mentioned in a lead note
 */
export async function notifyLeadMention(params: {
  userId: string;
  leadId: string;
  leadName: string;
  noteId: string;
  mentionedByName: string;
  mentionedById: string;
}) {
  return createNotification({
    userId: params.userId,
    type: "lead_mention",
    title: "You were mentioned in a note",
    message: `${params.mentionedByName} mentioned you in a note on ${params.leadName}`,
    metadata: {
      leadId: params.leadId,
      noteId: params.noteId,
      mentionedBy: params.mentionedById,
      leadName: params.leadName,
    },
  });
}

/**
 * Notify a consultant that a lead was assigned to them
 */
export async function notifyLeadAssigned(params: {
  userId: string;
  leadId: string;
  leadName: string;
  assignedByName: string;
}) {
  return createNotification({
    userId: params.userId,
    type: "lead_assigned",
    title: "New Lead Assigned",
    message: `${params.assignedByName} assigned you a new lead: ${params.leadName}`,
    metadata: {
      leadId: params.leadId,
      leadName: params.leadName,
      assignedByName: params.assignedByName,
    },
  });
}

/**
 * Notify about a lead status change
 */
export async function notifyLeadStatusChange(params: {
  userId: string;
  leadId: string;
  leadName: string;
  oldStatus: string;
  newStatus: string;
  changedByName: string;
}) {
  return createNotification({
    userId: params.userId,
    type: "lead_status_changed",
    title: "Lead Status Updated",
    message: `${params.leadName} status changed from ${params.oldStatus} to ${params.newStatus}`,
    metadata: {
      leadId: params.leadId,
      leadName: params.leadName,
      oldStatus: params.oldStatus,
      newStatus: params.newStatus,
      changedByName: params.changedByName,
    },
  });
}

// ==========================================
// Task Notification Helpers
// ==========================================

/**
 * Notify a user that a task was assigned to them
 */
export async function notifyTaskAssigned(params: {
  userId: string;
  taskId: string;
  taskTitle: string;
  assignedByName: string;
  dueDate?: string;
}) {
  const dueMessage = params.dueDate ? ` (due ${params.dueDate})` : '';
  return createNotification({
    userId: params.userId,
    type: "task_assigned",
    title: "New Task Assigned",
    message: `${params.assignedByName} assigned you a task: ${params.taskTitle}${dueMessage}`,
    metadata: {
      taskId: params.taskId,
      taskTitle: params.taskTitle,
      assignedByName: params.assignedByName,
      dueDate: params.dueDate,
    },
  });
}

/**
 * Notify about an upcoming task due date
 */
export async function notifyTaskDueReminder(params: {
  userId: string;
  taskId: string;
  taskTitle: string;
  dueDate: string;
}) {
  return createNotification({
    userId: params.userId,
    type: "task_due_reminder",
    title: "Task Due Soon",
    message: `Your task "${params.taskTitle}" is due ${params.dueDate}`,
    metadata: {
      taskId: params.taskId,
      taskTitle: params.taskTitle,
      dueDate: params.dueDate,
    },
  });
}

/**
 * Notify the task creator that their task was completed
 */
export async function notifyTaskCompleted(params: {
  userId: string;
  taskId: string;
  taskTitle: string;
  completedByName: string;
}) {
  return createNotification({
    userId: params.userId,
    type: "task_completed",
    title: "Task Completed",
    message: `${params.completedByName} completed the task: ${params.taskTitle}`,
    metadata: {
      taskId: params.taskId,
      taskTitle: params.taskTitle,
      completedByName: params.completedByName,
    },
  });
}

// ==========================================
// Document Notification Helpers
// ==========================================

/**
 * Notify a student that their document was verified
 */
export async function notifyDocumentVerified(params: {
  studentUserId: string;
  documentName: string;
  applicationId: string;
  verifiedByName: string;
}) {
  return createNotification({
    userId: params.studentUserId,
    type: "document_verified",
    title: "Document Verified",
    message: `Your document "${params.documentName}" has been verified`,
    metadata: {
      applicationId: params.applicationId,
      documentName: params.documentName,
      verifiedByName: params.verifiedByName,
    },
  });
}

/**
 * Notify a student that their document was rejected
 */
export async function notifyDocumentRejected(params: {
  studentUserId: string;
  documentName: string;
  applicationId: string;
  rejectedByName: string;
  rejectionReason?: string;
}) {
  const reasonMessage = params.rejectionReason ? `: ${params.rejectionReason}` : '';
  return createNotification({
    userId: params.studentUserId,
    type: "document_rejected",
    title: "Document Rejected",
    message: `Your document "${params.documentName}" was rejected${reasonMessage}`,
    metadata: {
      applicationId: params.applicationId,
      documentName: params.documentName,
      rejectedByName: params.rejectedByName,
      rejectionReason: params.rejectionReason,
    },
  });
}

/**
 * Notify a student that a document is requested for their application
 */
export async function notifyDocumentRequested(params: {
  studentUserId: string;
  documentType: string;
  applicationId: string;
  requestedByName: string;
  notes?: string;
}) {
  return createNotification({
    userId: params.studentUserId,
    type: "document_requested",
    title: "Document Requested",
    message: `Please upload: ${params.documentType}${params.notes ? ` - ${params.notes}` : ''}`,
    metadata: {
      applicationId: params.applicationId,
      documentType: params.documentType,
      requestedByName: params.requestedByName,
      notes: params.notes,
    },
  });
}

/**
 * Notify admin/consultant that a student uploaded a document
 */
export async function notifyDocumentUploadedToAdmin(params: {
  adminUserId: string;
  studentName: string;
  documentName: string;
  applicationId: string;
}) {
  return createNotification({
    userId: params.adminUserId,
    type: "document_uploaded",
    title: "Document Uploaded",
    message: `${params.studentName} uploaded "${params.documentName}"`,
    metadata: {
      applicationId: params.applicationId,
      documentName: params.documentName,
      studentName: params.studentName,
    },
  });
}
