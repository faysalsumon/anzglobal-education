import { WebSocket } from "ws";

// Shared WebSocket clients map - tracks userId -> WebSocket connection
// This allows any module to send real-time messages to connected users
export const wsClients = new Map<string, WebSocket>();

// Tracks which connected users are admins (userType = 'admin' | 'platform_admin').
// Used to scope presence broadcasts and the online-users endpoint to admin-only.
export const wsAdminClientIds = new Set<string>();

// Helper function to send a message to a specific user
export function sendToUser(userId: string, message: object): boolean {
  const client = wsClients.get(userId);
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(message));
    return true;
  }
  return false;
}

// Helper function to broadcast to multiple users
export function broadcastToUsers(userIds: string[], message: object): void {
  userIds.forEach(userId => sendToUser(userId, message));
}

// ==========================================
// Document Event Helpers
// ==========================================

export type DocumentEventType = 
  | "document_uploaded"
  | "document_verified"
  | "document_rejected"
  | "document_requested"
  | "document_deleted";

export interface DocumentEvent {
  type: "document_event";
  event: DocumentEventType;
  applicationId: string;
  documentId?: string;
  documentName?: string;
  stage?: string;
  timestamp: string;
}

/**
 * Broadcast a document event to relevant users for real-time sync
 */
export function broadcastDocumentEvent(
  userIds: string[],
  event: DocumentEventType,
  data: {
    applicationId: string;
    documentId?: string;
    documentName?: string;
    stage?: string;
  }
): void {
  const message: DocumentEvent = {
    type: "document_event",
    event,
    applicationId: data.applicationId,
    documentId: data.documentId,
    documentName: data.documentName,
    stage: data.stage,
    timestamp: new Date().toISOString(),
  };
  broadcastToUsers(userIds, message);
}
