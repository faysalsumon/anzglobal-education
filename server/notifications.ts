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
  | "message_received"
  | "institution_approval_request"
  | "institution_approved"
  | "institution_rejected"
  | "institution_assigned"
  | "course_assigned"
  | "internal_note_mention"
  | "general";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
}

export async function createNotification(params: CreateNotificationParams) {
  const { userId, type, title, message, link, metadata } = params;
  
  const [notification] = await db
    .insert(notifications)
    .values({
      userId,
      type,
      title,
      message,
      link: link || null,
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
    link: `/admin/applications/${params.applicationId}`,
    metadata: {
      applicationId: params.applicationId,
      studentName: params.studentName,
      courseName: params.courseName,
      assignedByName: params.assignedByName,
    },
  });
}
