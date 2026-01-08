import { WebSocket } from "ws";

// Shared WebSocket clients map - tracks userId -> WebSocket connection
// This allows any module to send real-time messages to connected users
export const wsClients = new Map<string, WebSocket>();

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
