import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FileText,
  File,
  Download,
  Eye,
  Search,
  CheckCircle,
  Clock,
  XCircle,
  Folder,
  FolderOpen,
  AlertTriangle,
  User,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DocumentFolder {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
  sortOrder: number | null;
}

interface Document {
  id: string;
  type: string;
  title: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  status: string;
  description: string | null;
  folderId: string | null;
  studentProfileId: string;
  createdAt: Date;
  reviewNotes?: string;
  senderType?: string;
  senderName?: string | null;
  expiryDate?: string | null;
}

interface StudentDocumentOrganizerProps {
  studentProfileId: string;
  compact?: boolean;
}


const statusConfig = {
  pending:  { label: "Pending",  icon: Clock,        color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  verified: { label: "Verified", icon: CheckCircle,  color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  reviewed: { label: "Reviewed", icon: CheckCircle,  color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  approved: { label: "Approved", icon: CheckCircle,  color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  rejected: { label: "Rejected", icon: XCircle,      color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
};

function getExpiryBadge(expiryDate: string | null | undefined) {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate);
  const now = new Date();
  const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return { label: "Expired", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" };
  }
  if (diffDays <= 60) {
    return { label: "Expiring Soon", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" };
  }
  return null;
}

function formatFileSize(bytes: number) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getFileIcon(mimeType: string) {
  if (mimeType?.includes("pdf")) return FileText;
  return File;
}

function UploaderLabel({ doc }: { doc: Document }) {
  if (doc.senderType === "student" || !doc.senderType) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <User className="h-3 w-3" />
        Student
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-blue-700 dark:text-blue-400">
      <ShieldCheck className="h-3 w-3" />
      {doc.senderName || "Admin"}
    </span>
  );
}

function DocumentRow({ doc }: { doc: Document }) {
  const FileIcon = getFileIcon(doc.mimeType);
  const status = statusConfig[doc.status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = status.icon;
  const expiryBadge = getExpiryBadge(doc.expiryDate);

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border bg-card hover-elevate",
        doc.status === "rejected" && "border-red-200 dark:border-red-800"
      )}
      data-testid={`admin-doc-${doc.id}`}
    >
      <FileIcon className="h-8 w-8 text-primary flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate">{doc.title || doc.fileName}</span>
          <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", status.color)}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {status.label}
          </Badge>
          {expiryBadge && (
            <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", expiryBadge.color)}>
              <AlertTriangle className="h-3 w-3 mr-1" />
              {expiryBadge.label}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <UploaderLabel doc={doc} />
          <span className="text-xs text-muted-foreground">{formatDate(doc.createdAt)}</span>
          {doc.expiryDate && (
            <span className="text-xs text-muted-foreground">
              Expires {formatDate(doc.expiryDate)}
            </span>
          )}
          <span className="text-xs text-muted-foreground">{formatFileSize(doc.fileSize)}</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{doc.type}</Badge>
        </div>
        {doc.description && (
          <p className="text-xs text-muted-foreground mt-1 truncate">{doc.description}</p>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => window.open(`/api/admin/documents/${doc.id}/download`, "_blank")}
              data-testid={`button-view-${doc.id}`}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>View Document</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => window.open(`/api/admin/documents/${doc.id}/download?dl=1`, "_blank")}
              data-testid={`button-download-${doc.id}`}
            >
              <Download className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Download</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

export function StudentDocumentOrganizer({ studentProfileId, compact = false }: StudentDocumentOrganizerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string>("__all__");

  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: [`/api/admin/students/${studentProfileId}/documents`],
    enabled: !!studentProfileId,
  });

  const { data: apiFolders = [] } = useQuery<DocumentFolder[]>({
    queryKey: [`/api/admin/students/${studentProfileId}/folders`],
    enabled: !!studentProfileId,
  });

  // Build sidebar folder list: "All Documents" + API folders (if available) or just "All Documents"
  const sidebarFolders = apiFolders.length > 0
    ? [{ id: "__all__", name: "All Documents", color: "#6b7280", isDefault: true, sortOrder: 0 }, ...apiFolders]
    : [{ id: "__all__", name: "All Documents", color: "#6b7280", isDefault: true, sortOrder: 0 }];

  // Filter documents by selected folder
  const folderFilteredDocs = (() => {
    if (selectedFolderId === "__all__") return documents;
    // Filter by real folder ID from the API
    return documents.filter(d => d.folderId === selectedFolderId);
  })();

  const visibleDocs = searchQuery
    ? folderFilteredDocs.filter(
        d =>
          d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.type.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : folderFilteredDocs;

  const overallStats = {
    total: documents.length,
    pending: documents.filter(d => d.status === "pending").length,
    verified: documents.filter(d => d.status === "verified" || d.status === "approved").length,
    rejected: documents.filter(d => d.status === "rejected").length,
  };

  const countForFolder = (folderId: string) => {
    if (folderId === "__all__") return documents.length;
    return documents.filter(d => d.folderId === folderId).length;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading documents...
        </CardContent>
      </Card>
    );
  }

  // Compact mode — used in sidebar or summary cards
  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Student Documents
          </CardTitle>
          <div className="flex items-center gap-3 text-sm flex-wrap">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-yellow-500" />
              {overallStats.pending} Pending
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              {overallStats.verified} Verified
            </span>
            {overallStats.rejected > 0 && (
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                {overallStats.rejected} Rejected
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {documents.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No documents uploaded</p>
          ) : (
            documents.slice(0, 5).map(doc => <DocumentRow key={doc.id} doc={doc} />)
          )}
          {documents.length > 5 && (
            <p className="text-center text-sm text-muted-foreground pt-2">
              +{documents.length - 5} more documents
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Full two-column view
  return (
    <div className="flex gap-4 items-start">
      {/* ── Left folder sidebar ─────────────────────────────────── */}
      <Card className="w-52 shrink-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Folders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0.5 p-2 pt-0">
          {sidebarFolders.map(folder => {
            const count = countForFolder(folder.id);
            const isSelected = selectedFolderId === folder.id;
            return (
              <Button
                key={folder.id}
                variant={isSelected ? "secondary" : "ghost"}
                className="w-full justify-start gap-2 h-8 px-2 text-sm"
                onClick={() => setSelectedFolderId(folder.id)}
                data-testid={`button-folder-${folder.id}`}
              >
                {isSelected
                  ? <FolderOpen className="h-4 w-4 shrink-0" style={{ color: folder.color }} />
                  : <Folder className="h-4 w-4 shrink-0" style={{ color: folder.color }} />
                }
                <span className="truncate flex-1 text-left">{folder.name}</span>
                <span className="text-xs text-muted-foreground ml-auto">{count}</span>
              </Button>
            );
          })}
        </CardContent>
      </Card>

      {/* ── Right document list ──────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Folder className="h-5 w-5" />
                  Student Documents
                </CardTitle>
                <CardDescription>
                  {overallStats.total} total &bull; {overallStats.pending} pending review
                </CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  className="pl-9 w-[200px]"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  data-testid="input-search-admin-docs"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {visibleDocs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {searchQuery ? `No results for "${searchQuery}"` : "No documents in this folder"}
              </p>
            ) : (
              <div className="space-y-2">
                {searchQuery && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {visibleDocs.length} result{visibleDocs.length !== 1 ? "s" : ""} for &quot;{searchQuery}&quot;
                  </p>
                )}
                {visibleDocs.map(doc => (
                  <DocumentRow key={doc.id} doc={doc} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
