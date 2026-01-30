import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  AlertCircle,
  Folder,
  GraduationCap,
  Languages,
  Wallet,
  Briefcase,
  FileSignature,
  IdCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SECTION_DOCUMENT_MAPPING, type ProfileSection } from "@/components/section-document-upload";

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
}

interface StudentDocumentOrganizerProps {
  studentProfileId: string;
  compact?: boolean;
}

const SECTION_ICONS: Record<ProfileSection, typeof FileText> = {
  passport_visa: IdCard,
  education: GraduationCap,
  english_proficiency: Languages,
  financial: Wallet,
  work_experience: Briefcase,
  sop: FileSignature,
};

const SECTION_ORDER: ProfileSection[] = [
  "passport_visa",
  "education",
  "english_proficiency",
  "financial",
  "work_experience",
  "sop",
];

const statusConfig = {
  pending: { label: "Pending", icon: Clock, color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400", dotColor: "bg-yellow-500" },
  verified: { label: "Verified", icon: CheckCircle, color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", dotColor: "bg-green-500" },
  reviewed: { label: "Reviewed", icon: CheckCircle, color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", dotColor: "bg-blue-500" },
  approved: { label: "Approved", icon: CheckCircle, color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", dotColor: "bg-green-500" },
  rejected: { label: "Rejected", icon: XCircle, color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", dotColor: "bg-red-500" },
};

export function StudentDocumentOrganizer({ studentProfileId, compact = false }: StudentDocumentOrganizerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSection, setSelectedSection] = useState<ProfileSection | "all">("all");
  const [expandedSections, setExpandedSections] = useState<string[]>(SECTION_ORDER);

  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: [`/api/admin/students/${studentProfileId}/documents`],
    enabled: !!studentProfileId,
  });

  const getDocumentsForSection = (section: ProfileSection) => {
    const config = SECTION_DOCUMENT_MAPPING[section];
    return documents.filter((doc) =>
      (config.types as readonly string[]).includes(doc.type)
    );
  };

  const getUncategorizedDocuments = () => {
    const allSectionTypes: string[] = SECTION_ORDER.flatMap(
      (section) => [...SECTION_DOCUMENT_MAPPING[section].types] as string[]
    );
    return documents.filter((doc) => !allSectionTypes.includes(doc.type));
  };

  const filteredDocuments = searchQuery
    ? documents.filter(
        (doc) =>
          doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          doc.type.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : documents;

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "0 B";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType?.includes("pdf")) return FileText;
    return File;
  };

  const getSectionStats = (section: ProfileSection) => {
    const docs = getDocumentsForSection(section);
    const config = SECTION_DOCUMENT_MAPPING[section];
    const requiredTypes = config.requiredTypes.filter((t) => t.required);
    const uploadedRequired = requiredTypes.filter((t) =>
      docs.some((d) => d.type === t.type)
    ).length;

    return {
      total: docs.length,
      pending: docs.filter((d) => d.status === "pending").length,
      verified: docs.filter((d) => d.status === "verified" || d.status === "approved").length,
      requiredCount: requiredTypes.length,
      uploadedRequired,
      isComplete: uploadedRequired >= requiredTypes.length,
    };
  };

  const overallStats = {
    total: documents.length,
    pending: documents.filter((d) => d.status === "pending").length,
    verified: documents.filter((d) => d.status === "verified" || d.status === "approved").length,
    rejected: documents.filter((d) => d.status === "rejected").length,
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

  const DocumentCard = ({ doc }: { doc: Document }) => {
    const FileIcon = getFileIcon(doc.mimeType);
    const status = statusConfig[doc.status as keyof typeof statusConfig] || statusConfig.pending;
    const StatusIcon = status.icon;

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
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{doc.title || doc.fileName}</span>
            <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", status.color)}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <span>{formatFileSize(doc.fileSize)}</span>
            <span>•</span>
            <span>{formatDate(doc.createdAt)}</span>
            <span>•</span>
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
                className="h-8 w-8"
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
                className="h-8 w-8"
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
  };

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Student Documents
          </CardTitle>
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1">
              <span className={cn("h-2 w-2 rounded-full", statusConfig.pending.dotColor)} />
              {overallStats.pending} Pending
            </span>
            <span className="flex items-center gap-1">
              <span className={cn("h-2 w-2 rounded-full", statusConfig.verified.dotColor)} />
              {overallStats.verified} Verified
            </span>
            {overallStats.rejected > 0 && (
              <span className="flex items-center gap-1">
                <span className={cn("h-2 w-2 rounded-full", statusConfig.rejected.dotColor)} />
                {overallStats.rejected} Rejected
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {documents.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No documents uploaded</p>
          ) : (
            documents.slice(0, 5).map((doc) => <DocumentCard key={doc.id} doc={doc} />)
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5" />
              Student Documents
            </CardTitle>
            <CardDescription>
              {overallStats.total} documents • {overallStats.pending} pending review
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                className="pl-9 w-[200px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-admin-docs"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {SECTION_ORDER.map((section) => {
            const stats = getSectionStats(section);
            const Icon = SECTION_ICONS[section];
            const config = SECTION_DOCUMENT_MAPPING[section];

            return (
              <Tooltip key={section}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm",
                      stats.isComplete
                        ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800"
                        : stats.total > 0
                        ? "bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800"
                        : "bg-muted/50"
                    )}
                    data-testid={`section-summary-${section}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{stats.total}</span>
                    {stats.requiredCount > 0 && (
                      <span className="text-xs text-muted-foreground">
                        ({stats.uploadedRequired}/{stats.requiredCount})
                      </span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{config.label}</p>
                  <p className="text-xs">{stats.uploadedRequired}/{stats.requiredCount} required uploaded</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </CardHeader>
      <CardContent>
        {searchQuery ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-3">
              {filteredDocuments.length} result{filteredDocuments.length !== 1 ? "s" : ""} for "{searchQuery}"
            </p>
            {filteredDocuments.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} />
            ))}
          </div>
        ) : (
          <Accordion
            type="multiple"
            value={expandedSections}
            onValueChange={setExpandedSections}
            className="space-y-2"
          >
            {SECTION_ORDER.map((section) => {
              const sectionDocs = getDocumentsForSection(section);
              const config = SECTION_DOCUMENT_MAPPING[section];
              const stats = getSectionStats(section);
              const Icon = SECTION_ICONS[section];

              return (
                <AccordionItem
                  key={section}
                  value={section}
                  className={cn(
                    "border rounded-lg px-4",
                    stats.isComplete && "border-green-200 dark:border-green-800",
                    !stats.isComplete && stats.requiredCount > 0 && "border-yellow-200 dark:border-yellow-800"
                  )}
                  data-testid={`accordion-section-${section}`}
                >
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-primary" />
                      <span className="font-semibold">{config.label}</span>
                      <Badge variant="secondary" className="text-xs">
                        {sectionDocs.length}
                      </Badge>
                      {stats.requiredCount > 0 && (
                        stats.isComplete ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                        )
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-4 space-y-2">
                    {config.requiredTypes.map(({ type, label, required }) => {
                      const typeDocs = sectionDocs.filter((d) => d.type === type);
                      const hasDoc = typeDocs.length > 0;

                      return (
                        <div key={type} className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            {hasDoc ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <div className={cn(
                                "h-4 w-4 rounded-full border-2",
                                required ? "border-orange-400" : "border-muted-foreground/40"
                              )} />
                            )}
                            <span className={cn(!hasDoc && "text-muted-foreground")}>{label}</span>
                            {required && !hasDoc && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-300 text-orange-600">
                                Required
                              </Badge>
                            )}
                          </div>
                          {typeDocs.map((doc) => (
                            <div key={doc.id} className="ml-6">
                              <DocumentCard doc={doc} />
                            </div>
                          ))}
                        </div>
                      );
                    })}
                    {sectionDocs.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No documents uploaded for this section
                      </p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}

            {getUncategorizedDocuments().length > 0 && (
              <AccordionItem value="other" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Folder className="h-5 w-5 text-primary" />
                    <span className="font-semibold">Other Documents</span>
                    <Badge variant="secondary" className="text-xs">
                      {getUncategorizedDocuments().length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4 space-y-2">
                  {getUncategorizedDocuments().map((doc) => (
                    <DocumentCard key={doc.id} doc={doc} />
                  ))}
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
