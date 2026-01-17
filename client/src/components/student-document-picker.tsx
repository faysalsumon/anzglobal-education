import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FileText, Search, CheckCircle, Clock, XCircle, FolderOpen } from "lucide-react";

interface PersonalDocument {
  id: string;
  type: string;
  title: string;
  fileName: string;
  fileSize: number | null;
  status: string;
  createdAt: string;
}

interface StudentDocumentPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (document: PersonalDocument) => void;
  currentStage?: string;
  excludeDocumentIds?: string[];
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  passport: "Passport",
  transcript: "Academic Transcript",
  diploma: "Diploma/Degree",
  language_test: "Language Test",
  visa: "Visa Document",
  cv: "CV/Resume",
  recommendation: "Recommendation Letter",
  financial: "Financial Document",
  other: "Other",
};

const STATUS_CONFIG = {
  pending: { icon: Clock, color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400", label: "Pending" },
  verified: { icon: CheckCircle, color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", label: "Verified" },
  rejected: { icon: XCircle, color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", label: "Rejected" },
};

export function StudentDocumentPicker({ 
  open, 
  onOpenChange, 
  onSelect,
  excludeDocumentIds = [],
}: StudentDocumentPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<PersonalDocument | null>(null);

  const { data: documents = [], isLoading } = useQuery<PersonalDocument[]>({
    queryKey: ["/api/student/documents"],
    enabled: open,
  });

  const filteredDocuments = documents
    .filter(doc => !excludeDocumentIds.includes(doc.id))
    .filter(doc => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        doc.title.toLowerCase().includes(query) ||
        doc.type.toLowerCase().includes(query) ||
        doc.fileName.toLowerCase().includes(query)
      );
    });

  const handleSelect = () => {
    if (selectedDoc) {
      onSelect(selectedDoc);
      setSelectedDoc(null);
      onOpenChange(false);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="dialog-document-picker">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Select from Your Documents
          </DialogTitle>
          <DialogDescription>
            Choose a document from your personal library to attach to this application.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-documents"
            />
          </div>

          <ScrollArea className="h-[300px] border rounded-lg">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-sm text-muted-foreground">Loading documents...</div>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/20 mb-2" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? "No documents match your search" : "No documents in your library"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload documents in your personal library first
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {filteredDocuments.map((doc) => {
                  const statusConfig = STATUS_CONFIG[doc.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                  const StatusIcon = statusConfig.icon;
                  const isSelected = selectedDoc?.id === doc.id;

                  return (
                    <div
                      key={doc.id}
                      className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                        isSelected 
                          ? "border-primary bg-primary/5" 
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => setSelectedDoc(doc)}
                      data-testid={`doc-item-${doc.id}`}
                    >
                      <FileText className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="secondary" className="text-xs">
                            {DOCUMENT_TYPE_LABELS[doc.type] || doc.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(doc.fileSize)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge className={`text-xs ${statusConfig.color}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                        {isSelected && (
                          <CheckCircle className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
            Cancel
          </Button>
          <Button 
            onClick={handleSelect} 
            disabled={!selectedDoc}
            data-testid="button-attach-document"
          >
            Attach Document
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
