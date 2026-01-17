import { useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { queryClient } from '@/lib/queryClient';

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

interface UseDocumentEventsOptions {
  applicationId?: string;
  onDocumentEvent?: (event: DocumentEvent) => void;
}

export function useDocumentEvents(options: UseDocumentEventsOptions = {}) {
  const { lastMessage } = useWebSocket();
  const { applicationId, onDocumentEvent } = options;

  const invalidateDocumentQueries = useCallback((appId: string, studentId?: string) => {
    // Application-specific document queries
    queryClient.invalidateQueries({ queryKey: ["/api/applications", appId, "documents"] });
    queryClient.invalidateQueries({ queryKey: [`/api/student/applications/${appId}/documents`] });
    queryClient.invalidateQueries({ queryKey: [`/api/student/applications/${appId}/pending-documents`] });
    
    // Student personal library queries
    queryClient.invalidateQueries({ queryKey: ["/api/student/documents"] });
    
    // Admin application list queries
    queryClient.invalidateQueries({ queryKey: ["/api/admin/applications"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/applications", appId] });
    
    // Admin student library queries (if studentId available)
    if (studentId) {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students", studentId, "documents"] });
    }
    
    // Institution application queries
    queryClient.invalidateQueries({ queryKey: ["/api/institution/applications"] });
    
    // Broad invalidation for any document-related queries
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        const key = query.queryKey;
        if (!Array.isArray(key)) return false;
        
        // Check if any segment of the query key contains "documents"
        return key.some(segment => 
          typeof segment === 'string' && 
          (segment.includes('/documents') || segment === 'documents')
        );
      }
    });
  }, []);

  useEffect(() => {
    if (!lastMessage) return;
    
    if (lastMessage.type === 'document_event') {
      const docEvent = lastMessage as DocumentEvent;
      
      if (!applicationId || docEvent.applicationId === applicationId) {
        invalidateDocumentQueries(docEvent.applicationId);
        
        if (onDocumentEvent) {
          onDocumentEvent(docEvent);
        }
      }
    }
  }, [lastMessage, applicationId, onDocumentEvent, invalidateDocumentQueries]);

  return {
    invalidateDocumentQueries,
  };
}
