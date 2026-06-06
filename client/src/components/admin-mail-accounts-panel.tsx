/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Trash2,
  Users,
  Mail,
  Loader2,
  KeyRound,
  Settings,
  UserPlus,
  UserMinus,
  Globe,
  Building,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

interface MailAccountRow {
  account: {
    id: string;
    label: string;
    displayName: string | null;
    email: string;
    accountType: string;
    imapHost: string;
    imapPort: number;
    smtpHost: string;
    smtpPort: number;
    isActive: boolean;
    regionCode: string | null;
    createdAt: string;
  };
  hasSecret: boolean;
  accessCount: number;
}

interface AdminUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: string | null;
  userType: string;
}

interface AccessRow {
  access: {
    id: string;
    accountId: string;
    adminUserId: string;
    canSend: boolean;
  };
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    role: string | null;
  } | null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function userName(u: { firstName?: string | null; lastName?: string | null; email?: string | null } | null) {
  if (!u) return "Unknown";
  const name = [u.firstName, u.lastName].filter(Boolean).join(" ");
  return name || u.email || "Unknown";
}

function userInitials(u: { firstName?: string | null; lastName?: string | null; email?: string | null } | null) {
  if (!u) return "?";
  if (u.firstName && u.lastName) return (u.firstName[0] + u.lastName[0]).toUpperCase();
  if (u.firstName) return u.firstName.substring(0, 2).toUpperCase();
  return (u.email || "?").substring(0, 2).toUpperCase();
}

// ─── Add/Edit Account Dialog ───────────────────────────────────────────────

function AccountFormDialog({
  open,
  onClose,
  editAccount,
}: {
  open: boolean;
  onClose: () => void;
  editAccount?: MailAccountRow["account"] | null;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    label: editAccount?.label || "",
    displayName: editAccount?.displayName || "",
    email: editAccount?.email || "",
    accountType: (editAccount?.accountType || "group") as "personal" | "group",
    appPassword: "",
    imapHost: editAccount?.imapHost || "imap.zoho.com",
    imapPort: editAccount?.imapPort || 993,
    smtpHost: editAccount?.smtpHost || "smtp.zoho.com",
    smtpPort: editAccount?.smtpPort || 465,
    regionCode: editAccount?.regionCode || "AU",
  });

  const isEdit = !!editAccount;

  const mutation = useMutation({
    mutationFn: async () => {
      if (isEdit) {
        return apiRequest("PATCH", `/api/mail/accounts/${editAccount!.id}`, {
          ...form,
          appPassword: form.appPassword || undefined,
          imapPort: Number(form.imapPort),
          smtpPort: Number(form.smtpPort),
        });
      } else {
        return apiRequest("POST", "/api/mail/accounts", {
          ...form,
          imapPort: Number(form.imapPort),
          smtpPort: Number(form.smtpPort),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mail/accounts"] });
      toast({ title: isEdit ? "Account updated" : "Account added" });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const set = (key: string, val: any) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg" data-testid="dialog-account-form">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Mail Account" : "Add Mail Account"}</DialogTitle>
          <DialogDescription>
            Zoho app passwords are generated in Zoho Account → Security → App Passwords. Do NOT use your regular Zoho login password.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Label (internal name)</Label>
              <Input
                data-testid="input-account-label"
                value={form.label}
                onChange={(e) => set("label", e.target.value)}
                placeholder="AU Info Inbox"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Display Name (shown in email)</Label>
              <Input
                data-testid="input-account-display-name"
                value={form.displayName}
                onChange={(e) => set("displayName", e.target.value)}
                placeholder="ANZ Australia"
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Email Address</Label>
            <Input
              data-testid="input-account-email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="info@anzglobal.com.au"
              type="email"
              disabled={isEdit}
              className="h-8 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Account Type</Label>
              <Select value={form.accountType} onValueChange={(v) => set("accountType", v)}>
                <SelectTrigger className="h-8 text-sm" data-testid="select-account-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="group">Group / Shared</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Region</Label>
              <Select value={form.regionCode} onValueChange={(v) => set("regionCode", v)}>
                <SelectTrigger className="h-8 text-sm" data-testid="select-account-region">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AU">Australia (AU)</SelectItem>
                  <SelectItem value="BD">Bangladesh (BD)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">
              Zoho App Password {isEdit && <span className="text-muted-foreground">(leave blank to keep existing)</span>}
            </Label>
            <Input
              data-testid="input-account-app-password"
              value={form.appPassword}
              onChange={(e) => set("appPassword", e.target.value)}
              type="password"
              placeholder={isEdit ? "••••••••" : "xxxx xxxx xxxx xxxx"}
              className="h-8 text-sm font-mono"
            />
          </div>

          <details className="group">
            <summary className="text-xs text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors">
              Advanced IMAP/SMTP settings
            </summary>
            <div className="pt-3 space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">IMAP Host</Label>
                  <Input
                    value={form.imapHost}
                    onChange={(e) => set("imapHost", e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">IMAP Port</Label>
                  <Input
                    value={form.imapPort}
                    onChange={(e) => set("imapPort", Number(e.target.value))}
                    type="number"
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">SMTP Host</Label>
                  <Input
                    value={form.smtpHost}
                    onChange={(e) => set("smtpHost", e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">SMTP Port</Label>
                  <Input
                    value={form.smtpPort}
                    onChange={(e) => set("smtpPort", Number(e.target.value))}
                    type="number"
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </details>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} data-testid="button-account-form-cancel">
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !form.label || !form.email || (!isEdit && !form.appPassword)}
              data-testid="button-account-form-save"
            >
              {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {isEdit ? "Save Changes" : "Add Account"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Access Management Dialog ──────────────────────────────────────────────

function AccessDialog({
  open,
  onClose,
  account,
}: {
  open: boolean;
  onClose: () => void;
  account: MailAccountRow["account"];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: accessData, isLoading: accessLoading } = useQuery<{ access: AccessRow[] }>({
    queryKey: ["/api/mail/accounts", account.id, "access"],
    queryFn: async () => {
      const res = await fetch(`/api/mail/accounts/${account.id}/access`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load access list");
      return res.json();
    },
    enabled: open,
  });

  const { data: usersData, isLoading: usersLoading } = useQuery<{ users: AdminUser[] }>({
    queryKey: ["/api/mail/admin-users"],
    staleTime: 60000,
    enabled: open,
  });

  const grantMutation = useMutation({
    mutationFn: async ({ userId, canSend }: { userId: string; canSend: boolean }) => {
      return apiRequest("POST", `/api/mail/accounts/${account.id}/access`, { adminUserId: userId, canSend });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mail/accounts", account.id, "access"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mail/accounts"] });
      toast({ title: "Access granted" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const revokeMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("DELETE", `/api/mail/accounts/${account.id}/access/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mail/accounts", account.id, "access"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mail/accounts"] });
      toast({ title: "Access revoked" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const toggleSendMutation = useMutation({
    mutationFn: async ({ userId, canSend }: { userId: string; canSend: boolean }) => {
      return apiRequest("POST", `/api/mail/accounts/${account.id}/access`, { adminUserId: userId, canSend });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mail/accounts", account.id, "access"] });
    },
  });

  const grantedUserIds = new Set((accessData?.access || []).map((r) => r.access.adminUserId));

  const allUsers = usersData?.users || [];
  const grantedUsers = accessData?.access || [];
  const notGrantedUsers = allUsers.filter((u) => !grantedUserIds.has(u.id));

  const [selectedUserId, setSelectedUserId] = useState("");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md" data-testid="dialog-access-manager">
        <DialogHeader>
          <DialogTitle>Manage Access</DialogTitle>
          <DialogDescription>
            <span className="font-medium">{account.displayName || account.label}</span>{" "}
            <span className="text-muted-foreground">({account.email})</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Grant new user */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Grant access to a team member</Label>
            <div className="flex gap-2">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="flex-1 h-8 text-sm" data-testid="select-grant-user">
                  <SelectValue placeholder="Select team member..." />
                </SelectTrigger>
                <SelectContent>
                  {usersLoading ? (
                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                  ) : notGrantedUsers.length === 0 ? (
                    <SelectItem value="none" disabled>All users already have access</SelectItem>
                  ) : (
                    notGrantedUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {userName(u)} — {u.email}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="icon"
                onClick={() => {
                  if (selectedUserId) {
                    grantMutation.mutate({ userId: selectedUserId, canSend: true });
                    setSelectedUserId("");
                  }
                }}
                disabled={!selectedUserId || grantMutation.isPending}
                data-testid="button-grant-access"
                title="Grant access"
              >
                {grantMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Current access list */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">
              Team members with access
              {grantedUsers.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {grantedUsers.length}
                </Badge>
              )}
            </Label>
            <ScrollArea className="max-h-64">
              {accessLoading ? (
                <div className="space-y-2 p-2">
                  {[1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : grantedUsers.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No one has access yet
                </div>
              ) : (
                <div className="divide-y">
                  {grantedUsers.map((row) => (
                    <div
                      key={row.access.id}
                      className="flex items-center gap-2.5 px-2 py-2"
                      data-testid={`access-row-${row.access.adminUserId}`}
                    >
                      <Avatar className="h-7 w-7 flex-shrink-0">
                        <AvatarFallback className="text-[10px]">
                          {userInitials(row.user)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{userName(row.user)}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{row.user?.email}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex items-center gap-1.5">
                          <Switch
                            checked={row.access.canSend}
                            onCheckedChange={(v) =>
                              toggleSendMutation.mutate({ userId: row.access.adminUserId, canSend: v })
                            }
                            data-testid={`toggle-can-send-${row.access.adminUserId}`}
                          />
                          <span className="text-[11px] text-muted-foreground">Send</span>
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => revokeMutation.mutate(row.access.adminUserId)}
                          disabled={revokeMutation.isPending}
                          data-testid={`button-revoke-${row.access.adminUserId}`}
                          title="Revoke access"
                        >
                          <UserMinus className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Panel ────────────────────────────────────────────────────────────

export function AdminMailAccountsPanel({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<MailAccountRow["account"] | null>(null);
  const [accessAccount, setAccessAccount] = useState<MailAccountRow["account"] | null>(null);

  const { data, isLoading } = useQuery<{ accounts: MailAccountRow[] }>({
    queryKey: ["/api/mail/accounts"],
    staleTime: 30000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/mail/accounts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mail/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mail/my-accounts"] });
      toast({ title: "Account deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to delete account", description: err.message, variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/mail/accounts/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mail/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mail/my-accounts"] });
    },
  });

  const accounts = data?.accounts || [];

  return (
    <div className="flex flex-col h-full" data-testid="mail-accounts-panel">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b flex-shrink-0 gap-2 flex-wrap">
        <div>
          <h2 className="font-semibold text-base">Mail Accounts</h2>
          <p className="text-xs text-muted-foreground">Manage Zoho mail connections for the team</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={() => setAddOpen(true)}
            data-testid="button-add-mail-account"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            data-testid="button-close-mail-accounts"
          >
            ×
          </Button>
        </div>
      </div>

      {/* Account list */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-md" />
            ))
          ) : accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Mail className="h-10 w-10 opacity-30" />
              <p className="text-sm">No mail accounts configured yet</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(true)}
                data-testid="button-add-first-account"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add your first account
              </Button>
            </div>
          ) : (
            accounts.map(({ account, hasSecret, accessCount }) => (
              <div
                key={account.id}
                className="border rounded-md p-4 space-y-3"
                data-testid={`account-card-${account.id}`}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-md bg-muted flex-shrink-0">
                      {account.accountType === "group" ? (
                        <Globe className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Building className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm" data-testid={`account-label-${account.id}`}>
                          {account.displayName || account.label}
                        </span>
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {account.accountType}
                        </Badge>
                        {account.regionCode && (
                          <Badge variant="outline" className="text-[10px]">
                            {account.regionCode}
                          </Badge>
                        )}
                        {!account.isActive && (
                          <Badge variant="destructive" className="text-[10px]">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate" data-testid={`account-email-${account.id}`}>
                        {account.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Switch
                      checked={account.isActive}
                      onCheckedChange={(v) =>
                        toggleActiveMutation.mutate({ id: account.id, isActive: v })
                      }
                      data-testid={`toggle-active-${account.id}`}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <KeyRound className="h-3 w-3" />
                    <span>{hasSecret ? "Password set" : "No password — add one"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span>{accessCount} {accessCount === 1 ? "user" : "users"} have access</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setEditAccount(account)}
                    data-testid={`button-edit-account-${account.id}`}
                  >
                    <Settings className="h-3.5 w-3.5 mr-1.5" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setAccessAccount(account)}
                    data-testid={`button-manage-access-${account.id}`}
                  >
                    <Users className="h-3.5 w-3.5 mr-1.5" />
                    Manage Access
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`Delete "${account.label}"? This will also remove all access assignments.`)) {
                        deleteMutation.mutate(account.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-account-${account.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Dialogs */}
      {(addOpen || editAccount) && (
        <AccountFormDialog
          open={true}
          onClose={() => {
            setAddOpen(false);
            setEditAccount(null);
          }}
          editAccount={editAccount}
        />
      )}

      {accessAccount && (
        <AccessDialog
          open={true}
          onClose={() => setAccessAccount(null)}
          account={accessAccount}
        />
      )}
    </div>
  );
}
