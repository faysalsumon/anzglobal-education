import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Bell, Mail, Smartphone, Save, RotateCcw, Eye, Edit, Search, Loader2, Check, X } from "lucide-react";

interface NotificationDefault {
  id: string;
  notificationType: string;
  role: string;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  updatedAt: string;
}

interface UserOverride {
  id: string;
  userId: string;
  notificationType: string;
  emailEnabled: boolean | null;
  inAppEnabled: boolean | null;
  updatedAt: string;
}

interface EmailTemplate {
  id: string;
  notificationType: string;
  label: string;
  description: string | null;
  subjectTemplate: string;
  bodyTemplate: string;
  availableVariables: string[];
  isCustom: boolean;
  updatedBy: string | null;
  updatedAt: string;
  createdAt: string;
}

interface MetaData {
  notificationTypes: string[];
  notificationRoles: string[];
}

const TYPE_LABELS: Record<string, string> = {
  new_signup: "New Sign-up",
  new_lead: "New Lead",
  contact_inquiry: "Contact Inquiry",
  task_assigned: "Task Assigned",
  task_completed: "Task Completed",
  task_due_reminder: "Task Due Reminder",
  application_assigned: "Application Assigned",
  application_stage_change: "Stage Change",
  document_uploaded: "Document Upload",
  document_verified: "Document Verified",
  document_rejected: "Document Rejected",
  document_requested: "Document Requested",
  admin_pending: "Admin Pending",
  institution_approved: "Institution Approved",
  institution_rejected: "Institution Rejected",
  course_approved: "Course Approved",
  course_rejected: "Course Rejected",
  general: "General",
};

const ROLE_LABELS: Record<string, string> = {
  cto: "CTO",
  branch_manager: "Branch Manager",
  education_consultant: "Education Consultant",
  marketing_officer: "Marketing Officer",
  accounts_officer: "Accounts Officer",
  hr_officer: "HR Officer",
  it_support: "IT Support",
  all_admins: "All Admins",
};

const TYPE_CATEGORIES: Record<string, string[]> = {
  "User & Lead": ["new_signup", "new_lead", "contact_inquiry"],
  "Tasks": ["task_assigned", "task_completed", "task_due_reminder"],
  "Applications": ["application_assigned", "application_stage_change"],
  "Documents": ["document_uploaded", "document_verified", "document_rejected", "document_requested"],
  "Admin & Approvals": ["admin_pending", "institution_approved", "institution_rejected", "course_approved", "course_rejected"],
  "Other": ["general"],
};

function GlobalDefaultsTab() {
  const { toast } = useToast();
  const [pendingChanges, setPendingChanges] = useState<Record<string, { emailEnabled: boolean; inAppEnabled: boolean }>>({});

  const { data: meta } = useQuery<MetaData>({ queryKey: ["/api/admin/notification-settings/meta"] });
  const { data: defaults = [], isLoading } = useQuery<NotificationDefault[]>({ queryKey: ["/api/admin/notification-settings/defaults"] });

  const saveMutation = useMutation({
    mutationFn: async (settings: Array<{ notificationType: string; role: string; emailEnabled: boolean; inAppEnabled: boolean }>) => {
      await apiRequest("PUT", "/api/admin/notification-settings/defaults", { settings });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notification-settings/defaults"] });
      setPendingChanges({});
      toast({ title: "Saved", description: "Notification defaults updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save defaults.", variant: "destructive" });
    },
  });

  const getDefault = (type: string, role: string): { emailEnabled: boolean; inAppEnabled: boolean } => {
    const key = `${type}::${role}`;
    if (pendingChanges[key]) return pendingChanges[key];
    const found = defaults.find(d => d.notificationType === type && d.role === role);
    return found ? { emailEnabled: found.emailEnabled, inAppEnabled: found.inAppEnabled } : { emailEnabled: true, inAppEnabled: true };
  };

  const toggleDefault = (type: string, role: string, field: "emailEnabled" | "inAppEnabled") => {
    const key = `${type}::${role}`;
    const current = getDefault(type, role);
    setPendingChanges(prev => ({
      ...prev,
      [key]: { ...current, [field]: !current[field] },
    }));
  };

  const handleSave = () => {
    const allTypes = meta?.notificationTypes || Object.keys(TYPE_LABELS);
    const allRoles = meta?.notificationRoles || Object.keys(ROLE_LABELS);

    const settings = allTypes.flatMap(type =>
      allRoles.map(role => ({
        notificationType: type,
        role,
        ...getDefault(type, role),
      }))
    );
    saveMutation.mutate(settings);
  };

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;
  const roles = meta?.notificationRoles || Object.keys(ROLE_LABELS);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold" data-testid="text-defaults-title">Global Notification Defaults</h3>
          <p className="text-sm text-muted-foreground">Control which roles receive each notification type by default.</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!hasPendingChanges || saveMutation.isPending}
          data-testid="button-save-defaults"
        >
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      {Object.entries(TYPE_CATEGORIES).map(([category, types]) => (
        <Card key={category}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{category}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Type</TableHead>
                  {roles.map(role => (
                    <TableHead key={role} className="text-center min-w-[100px]">
                      <span className="text-xs">{ROLE_LABELS[role] || role}</span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {types.map(type => (
                  <TableRow key={type}>
                    <TableCell className="font-medium">
                      <span className="text-sm">{TYPE_LABELS[type] || type}</span>
                    </TableCell>
                    {roles.map(role => {
                      const d = getDefault(type, role);
                      const key = `${type}::${role}`;
                      const isModified = !!pendingChanges[key];
                      return (
                        <TableCell key={role} className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              className={`p-1 rounded transition-colors ${d.emailEnabled ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground/30"} ${isModified ? "ring-1 ring-orange-400" : ""}`}
                              onClick={() => toggleDefault(type, role, "emailEnabled")}
                              title={`Email: ${d.emailEnabled ? "On" : "Off"}`}
                              data-testid={`toggle-email-${type}-${role}`}
                            >
                              <Mail className="h-4 w-4" />
                            </button>
                            <button
                              className={`p-1 rounded transition-colors ${d.inAppEnabled ? "text-green-600 dark:text-green-400" : "text-muted-foreground/30"} ${isModified ? "ring-1 ring-orange-400" : ""}`}
                              onClick={() => toggleDefault(type, role, "inAppEnabled")}
                              title={`In-app: ${d.inAppEnabled ? "On" : "Off"}`}
                              data-testid={`toggle-inapp-${type}-${role}`}
                            >
                              <Smartphone className="h-4 w-4" />
                            </button>
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      <div className="flex items-center gap-4 text-xs text-muted-foreground px-2">
        <span className="flex items-center gap-1"><Mail className="h-3 w-3 text-blue-600" /> = Email notification</span>
        <span className="flex items-center gap-1"><Smartphone className="h-3 w-3 text-green-600" /> = In-app notification</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 ring-1 ring-orange-400 rounded" /> = Unsaved change</span>
      </div>
    </div>
  );
}

function UserOverridesTab() {
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: adminUsers = [] } = useQuery<Array<{ id: string; firstName: string; lastName: string; email: string; userType: string }>>({
    queryKey: ["/api/admin/team-members"],
  });

  const { data: overrides = [], isLoading: overridesLoading } = useQuery<UserOverride[]>({
    queryKey: ["/api/admin/notification-settings/overrides", selectedUserId],
    enabled: !!selectedUserId,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { targetUserId: string; overrides: Array<{ notificationType: string; emailEnabled: boolean | null; inAppEnabled: boolean | null }> }) => {
      await apiRequest("PUT", "/api/admin/notification-settings/overrides", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notification-settings/overrides"] });
      toast({ title: "Saved", description: "User overrides updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save overrides.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/admin/notification-settings/overrides/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notification-settings/overrides"] });
      toast({ title: "Reset", description: "User overrides removed. They will use global defaults." });
    },
  });

  const [localOverrides, setLocalOverrides] = useState<Record<string, { emailEnabled: boolean | null; inAppEnabled: boolean | null }>>({});

  const getOverride = (type: string): { emailEnabled: boolean | null; inAppEnabled: boolean | null } => {
    if (localOverrides[type] !== undefined) return localOverrides[type];
    const found = overrides.find(o => o.notificationType === type);
    return found ? { emailEnabled: found.emailEnabled, inAppEnabled: found.inAppEnabled } : { emailEnabled: null, inAppEnabled: null };
  };

  const toggleOverride = (type: string, field: "emailEnabled" | "inAppEnabled") => {
    const current = getOverride(type);
    const currentVal = current[field];
    const nextVal = currentVal === null ? true : currentVal === true ? false : null;
    setLocalOverrides(prev => ({
      ...prev,
      [type]: { ...current, [field]: nextVal },
    }));
  };

  const handleSaveOverrides = () => {
    if (!selectedUserId) return;
    const allTypes = Object.keys(TYPE_LABELS);
    const overrideList = allTypes.map(type => ({
      notificationType: type,
      ...getOverride(type),
    })).filter(o => o.emailEnabled !== null || o.inAppEnabled !== null);

    saveMutation.mutate({ targetUserId: selectedUserId, overrides: overrideList });
  };

  const filteredUsers = adminUsers.filter(u =>
    !searchTerm ||
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold" data-testid="text-overrides-title">Per-User Notification Overrides</h3>
        <p className="text-sm text-muted-foreground">Override global defaults for specific team members. Null (dash) means use the global default.</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search team members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-search-user"
          />
        </div>
        <Select value={selectedUserId} onValueChange={(v) => { setSelectedUserId(v); setLocalOverrides({}); }}>
          <SelectTrigger className="w-[300px]" data-testid="select-user">
            <SelectValue placeholder="Select a team member" />
          </SelectTrigger>
          <SelectContent>
            {filteredUsers.map(u => (
              <SelectItem key={u.id} value={u.id} data-testid={`select-user-${u.id}`}>
                {u.firstName} {u.lastName} ({u.email})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedUserId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3 flex-wrap">
            <div>
              <CardTitle className="text-base">Overrides for {adminUsers.find(u => u.id === selectedUserId)?.firstName || "User"}</CardTitle>
              <CardDescription>Set specific preferences or leave as dash to use global default.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => deleteMutation.mutate(selectedUserId)}
                disabled={deleteMutation.isPending}
                data-testid="button-reset-overrides"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to Defaults
              </Button>
              <Button
                onClick={handleSaveOverrides}
                disabled={saveMutation.isPending}
                data-testid="button-save-overrides"
              >
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {overridesLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Notification Type</TableHead>
                    <TableHead className="text-center">Email</TableHead>
                    <TableHead className="text-center">In-App</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.keys(TYPE_LABELS).map(type => {
                    const o = getOverride(type);
                    return (
                      <TableRow key={type}>
                        <TableCell className="font-medium text-sm">{TYPE_LABELS[type]}</TableCell>
                        <TableCell className="text-center">
                          <button
                            className="p-1 rounded"
                            onClick={() => toggleOverride(type, "emailEnabled")}
                            data-testid={`override-email-${type}`}
                          >
                            {o.emailEnabled === null ? (
                              <span className="text-muted-foreground">&#8212;</span>
                            ) : o.emailEnabled ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <X className="h-4 w-4 text-red-500" />
                            )}
                          </button>
                        </TableCell>
                        <TableCell className="text-center">
                          <button
                            className="p-1 rounded"
                            onClick={() => toggleOverride(type, "inAppEnabled")}
                            data-testid={`override-inapp-${type}`}
                          >
                            {o.inAppEnabled === null ? (
                              <span className="text-muted-foreground">&#8212;</span>
                            ) : o.inAppEnabled ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <X className="h-4 w-4 text-red-500" />
                            )}
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {!selectedUserId && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Select a team member above to manage their notification overrides.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EmailTemplatesTab() {
  const { toast } = useToast();
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");

  const { data: templates = [], isLoading } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/admin/email-templates"],
  });

  const { data: previewData } = useQuery<{ subject: string; body: string; sampleData: Record<string, string> }>({
    queryKey: ["/api/admin/email-templates/preview", previewTemplate?.id],
    enabled: !!previewTemplate?.id,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { subjectTemplate: string; bodyTemplate: string } }) => {
      const res = await apiRequest("PUT", `/api/admin/email-templates/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-templates"] });
      setEditingTemplate(null);
      toast({ title: "Saved", description: "Email template updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update template.", variant: "destructive" });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/admin/email-templates/${id}/reset`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-templates"] });
      toast({ title: "Reset", description: "Template restored to default." });
    },
  });

  const openEdit = (t: EmailTemplate) => {
    setEditingTemplate(t);
    setEditSubject(t.subjectTemplate);
    setEditBody(t.bodyTemplate);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold" data-testid="text-templates-title">Email Templates</h3>
        <p className="text-sm text-muted-foreground">Customize email subject and body for each notification type. Use {"{{variableName}}"} placeholders.</p>
      </div>

      <div className="grid gap-3">
        {templates.map(t => (
          <Card key={t.id} data-testid={`card-template-${t.notificationType}`}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base">{t.label}</CardTitle>
                {t.isCustom && <Badge variant="secondary">Customized</Badge>}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPreviewTemplate(t)} data-testid={`button-preview-${t.notificationType}`}>
                  <Eye className="h-4 w-4 mr-1" /> Preview
                </Button>
                <Button variant="outline" size="sm" onClick={() => openEdit(t)} data-testid={`button-edit-${t.notificationType}`}>
                  <Edit className="h-4 w-4 mr-1" /> Edit
                </Button>
                {t.isCustom && (
                  <Button variant="outline" size="sm" onClick={() => resetMutation.mutate(t.id)} disabled={resetMutation.isPending} data-testid={`button-reset-${t.notificationType}`}>
                    <RotateCcw className="h-4 w-4 mr-1" /> Reset
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {t.description && <p className="text-sm text-muted-foreground mb-2">{t.description}</p>}
              <div className="text-sm">
                <span className="text-muted-foreground">Subject:</span>{" "}
                <span className="font-mono text-xs">{t.subjectTemplate}</span>
              </div>
              {(t.availableVariables as string[])?.length > 0 && (
                <div className="flex items-center gap-1 mt-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">Variables:</span>
                  {(t.availableVariables as string[]).map(v => (
                    <Badge key={v} variant="outline" className="text-xs font-mono">{`{{${v}}}`}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Email Template: {editingTemplate?.label}</DialogTitle>
            <DialogDescription>
              Customize the subject and body. Use {"{{variableName}}"} for dynamic content.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Subject Template</Label>
              <Input
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
                className="mt-1 font-mono text-sm"
                data-testid="input-edit-subject"
              />
            </div>
            <div>
              <Label>Body Template</Label>
              <Textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={10}
                className="mt-1 font-mono text-sm"
                data-testid="input-edit-body"
              />
            </div>
            {editingTemplate?.availableVariables && (editingTemplate.availableVariables as string[]).length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-xs text-muted-foreground">Available:</span>
                {(editingTemplate.availableVariables as string[]).map(v => (
                  <Badge key={v} variant="outline" className="text-xs font-mono cursor-pointer" onClick={() => {
                    setEditBody(prev => prev + `{{${v}}}`);
                  }}>{`{{${v}}}`}</Badge>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTemplate(null)}>Cancel</Button>
            <Button
              onClick={() => editingTemplate && updateMutation.mutate({ id: editingTemplate.id, data: { subjectTemplate: editSubject, bodyTemplate: editBody } })}
              disabled={updateMutation.isPending}
              data-testid="button-save-template"
            >
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview: {previewTemplate?.label}</DialogTitle>
            <DialogDescription>Shows how the email would look with sample data.</DialogDescription>
          </DialogHeader>
          {previewData ? (
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-muted-foreground text-xs">Subject</Label>
                <p className="font-medium">{previewData.subject}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Body</Label>
                <div className="bg-muted/50 rounded-md p-4 text-sm whitespace-pre-wrap font-mono">{previewData.body}</div>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-xs text-muted-foreground">Sample data:</span>
                {Object.entries(previewData.sampleData).map(([k, v]) => (
                  <Badge key={k} variant="outline" className="text-xs">{k}: {v}</Badge>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewTemplate(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function AdminNotificationSettingsPanel() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold" data-testid="text-notification-settings-heading">Notification Settings</h2>
          <p className="text-sm text-muted-foreground">Manage who receives what notifications and customize email content.</p>
        </div>
      </div>

      <Tabs defaultValue="defaults" className="w-full">
        <TabsList data-testid="tabs-notification-settings">
          <TabsTrigger value="defaults" data-testid="tab-defaults">Global Defaults</TabsTrigger>
          <TabsTrigger value="overrides" data-testid="tab-overrides">Per-User Overrides</TabsTrigger>
          <TabsTrigger value="templates" data-testid="tab-templates">Email Templates</TabsTrigger>
        </TabsList>
        <TabsContent value="defaults" className="mt-4">
          <GlobalDefaultsTab />
        </TabsContent>
        <TabsContent value="overrides" className="mt-4">
          <UserOverridesTab />
        </TabsContent>
        <TabsContent value="templates" className="mt-4">
          <EmailTemplatesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
