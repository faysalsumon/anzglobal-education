import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle2, AlertCircle, Clock, History, Eye, Check, X, User } from "lucide-react";
import { format } from "date-fns";

type VerificationStatus = 'unverified' | 'pending_verification' | 'verified' | 'needs_reverification';

interface SectionVerification {
  section: string;
  status: VerificationStatus;
  verifiedAt: string | null;
  verifiedBy: string | null;
  verifierName: string | null;
  verifierProfileImage: string | null;
  verifierNotes: string | null;
  lastUpdatedAt: string | null;
}

interface ChangeHistoryRecord {
  id: string;
  section: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: string;
  changeReason: string | null;
}

const SECTION_LABELS: Record<string, string> = {
  personal: "Personal Information",
  passport: "Passport & Visa Details",
  education: "Education History",
  language: "English Proficiency",
  preferences: "Study Preferences",
  employment: "Work Experience",
  funding: "Financial/Sponsor",
  emergency: "Emergency Contact",
  sop: "Statement of Purpose",
  bio: "Bio & Career Goals",
};

function VerificationStatusBadge({ status }: { status: VerificationStatus }) {
  switch (status) {
    case 'verified':
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Verified
        </Badge>
      );
    case 'pending_verification':
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
    case 'needs_reverification':
      return (
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
          <AlertCircle className="h-3 w-3 mr-1" />
          Needs Re-verification
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
          Unverified
        </Badge>
      );
  }
}

interface StudentVerificationPanelProps {
  profileId: string;
  studentName?: string;
  onClose?: () => void;
}

export function StudentVerificationPanel({ profileId, studentName, onClose }: StudentVerificationPanelProps) {
  const { toast } = useToast();
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [verifierNotes, setVerifierNotes] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: verifications = [], isLoading: verificationsLoading } = useQuery<SectionVerification[]>({
    queryKey: ["/api/admin/student-profiles", profileId, "verification"],
  });

  const { data: changeHistory = [], isLoading: historyLoading } = useQuery<ChangeHistoryRecord[]>({
    queryKey: ["/api/admin/student-profiles", profileId, "change-history"],
    enabled: historyOpen,
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ section, status, notes }: { section: string; status: VerificationStatus; notes?: string }) => {
      return apiRequest("POST", `/api/admin/student-profiles/${profileId}/verification/${section}`, { status, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/student-profiles", profileId, "verification"] });
      toast({ title: "Verification status updated" });
      setVerifyDialogOpen(false);
      setVerifierNotes("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleVerify = (section: string) => {
    setSelectedSection(section);
    setVerifyDialogOpen(true);
  };

  const confirmVerification = (status: VerificationStatus) => {
    if (selectedSection) {
      verifyMutation.mutate({ section: selectedSection, status, notes: verifierNotes });
    }
  };

  const sectionsNeedingReview = verifications.filter(
    v => v.status === 'needs_reverification' || v.status === 'pending_verification'
  );

  const verifiedSections = verifications.filter(v => v.status === 'verified');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-lg">
            Profile Verification {studentName && `- ${studentName}`}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHistoryOpen(!historyOpen)}
              data-testid="button-toggle-history"
            >
              <History className="h-4 w-4 mr-1" />
              Change History
            </Button>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-panel">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        {sectionsNeedingReview.length > 0 && (
          <div className="text-sm text-orange-600 mt-2">
            {sectionsNeedingReview.length} section(s) need verification review
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {verificationsLoading ? (
          <div className="text-center py-4 text-muted-foreground">Loading verification status...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Section</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Verified By</TableHead>
                <TableHead>Verified At</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {verifications.map((v) => (
                <TableRow key={v.section} data-testid={`row-verification-${v.section}`}>
                  <TableCell className="font-medium">{SECTION_LABELS[v.section] || v.section}</TableCell>
                  <TableCell>
                    <VerificationStatusBadge status={v.status} />
                  </TableCell>
                  <TableCell>
                    {v.verifierName ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={v.verifierProfileImage || undefined} alt={v.verifierName} />
                          <AvatarFallback className="text-xs">
                            {v.verifierName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{v.verifierName}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {v.verifiedAt ? format(new Date(v.verifiedAt), "MMM d, yyyy") : "-"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {v.verifierNotes || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleVerify(v.section)}
                      data-testid={`button-verify-${v.section}`}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {historyOpen && (
          <Accordion type="single" collapsible defaultValue="history">
            <AccordionItem value="history">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Recent Changes ({changeHistory.length})
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {historyLoading ? (
                  <div className="text-center py-4 text-muted-foreground">Loading history...</div>
                ) : changeHistory.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">No changes recorded</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Section</TableHead>
                        <TableHead>Field</TableHead>
                        <TableHead>Old Value</TableHead>
                        <TableHead>New Value</TableHead>
                        <TableHead>Changed At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {changeHistory.slice(0, 20).map((record) => (
                        <TableRow key={record.id} data-testid={`row-history-${record.id}`}>
                          <TableCell>{SECTION_LABELS[record.section] || record.section}</TableCell>
                          <TableCell className="font-medium">{record.fieldName}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                            {record.oldValue || "-"}
                          </TableCell>
                          <TableCell className="text-sm max-w-[150px] truncate">
                            {record.newValue || "-"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(record.changedAt), "MMM d, yyyy HH:mm")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </CardContent>

      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Section: {selectedSection && SECTION_LABELS[selectedSection]}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Notes (optional)</label>
              <Textarea
                value={verifierNotes}
                onChange={(e) => setVerifierNotes(e.target.value)}
                placeholder="Add notes about this verification..."
                data-testid="input-verifier-notes"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => confirmVerification('needs_reverification')}
              disabled={verifyMutation.isPending}
              data-testid="button-reject-verification"
            >
              <AlertCircle className="h-4 w-4 mr-1" />
              Request Changes
            </Button>
            <Button
              onClick={() => confirmVerification('verified')}
              disabled={verifyMutation.isPending}
              data-testid="button-approve-verification"
            >
              <Check className="h-4 w-4 mr-1" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
