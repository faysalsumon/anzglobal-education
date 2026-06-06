/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Lock } from "lucide-react";
import type { AccChartOfAccount } from "@shared/schema";

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  asset: "Asset",
  liability: "Liability",
  income: "Income",
  expense: "Expense",
  equity: "Equity",
};

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  asset: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  liability: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  income: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  expense: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  equity: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

interface AccountFormData {
  code: string;
  name: string;
  accountType: string;
  description: string;
}

export function ChartOfAccountsPanel() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AccChartOfAccount | null>(null);
  const [form, setForm] = useState<AccountFormData>({ code: "", name: "", accountType: "income", description: "" });

  const { data: accounts = [], isLoading } = useQuery<AccChartOfAccount[]>({ queryKey: ["/api/accounting/chart-of-accounts"] });

  const createMutation = useMutation({
    mutationFn: (data: AccountFormData) => apiRequest("POST", "/api/accounting/chart-of-accounts", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/accounting/chart-of-accounts"] }); toast({ title: "Account created" }); closeDialog(); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AccountFormData }) => apiRequest("PATCH", `/api/accounting/chart-of-accounts/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/accounting/chart-of-accounts"] }); toast({ title: "Account updated" }); closeDialog(); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/accounting/chart-of-accounts/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/accounting/chart-of-accounts"] }); toast({ title: "Account deleted" }); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const openNew = () => {
    setEditing(null);
    setForm({ code: "", name: "", accountType: "income", description: "" });
    setDialogOpen(true);
  };

  const openEdit = (a: AccChartOfAccount) => {
    setEditing(a);
    setForm({ code: a.code, name: a.name, accountType: a.accountType, description: a.description || "" });
    setDialogOpen(true);
  };

  const closeDialog = () => { setDialogOpen(false); setEditing(null); };

  const handleSubmit = () => {
    if (!form.code.trim() || !form.name.trim()) { toast({ title: "Code and name are required", variant: "destructive" }); return; }
    const data = { ...form, description: form.description || null } as any;
    if (editing) { updateMutation.mutate({ id: editing.id, data }); } else { createMutation.mutate(data); }
  };

  const grouped = accounts.reduce<Record<string, AccChartOfAccount[]>>((acc, a) => {
    if (!acc[a.accountType]) acc[a.accountType] = [];
    acc[a.accountType].push(a);
    return acc;
  }, {});

  return (
    <div className="space-y-4" data-testid="finance-accounts-panel">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" data-testid="text-accounts-title">Chart of Accounts</h2>
          <p className="text-muted-foreground">Manage your accounting structure</p>
        </div>
        <Button onClick={openNew} data-testid="button-add-account"><Plus className="h-4 w-4 mr-2" /> Add Account</Button>
      </div>

      {isLoading ? (
        <Card><CardContent className="p-6 text-center text-muted-foreground">Loading...</CardContent></Card>
      ) : (
        Object.entries(ACCOUNT_TYPE_LABELS).map(([type, label]) => {
          const typeAccounts = grouped[type] || [];
          if (typeAccounts.length === 0) return null;
          return (
            <Card key={type}>
              <CardContent className="p-0">
                <div className="p-3 border-b bg-muted/30">
                  <Badge className={`no-default-hover-elevate no-default-active-elevate ${ACCOUNT_TYPE_COLORS[type]}`}>{label}</Badge>
                  <span className="ml-2 text-sm text-muted-foreground">{typeAccounts.length} account(s)</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/20">
                        <th className="text-left p-3 font-medium">Code</th>
                        <th className="text-left p-3 font-medium">Name</th>
                        <th className="text-left p-3 font-medium">Description</th>
                        <th className="text-right p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {typeAccounts.map((a) => (
                        <tr key={a.id} className="border-b" data-testid={`row-account-${a.id}`}>
                          <td className="p-3 font-mono text-sm">{a.code}</td>
                          <td className="p-3 font-medium" data-testid={`text-account-name-${a.id}`}>
                            {a.name}
                            {a.isSystem && <Lock className="inline ml-1 h-3 w-3 text-muted-foreground" />}
                          </td>
                          <td className="p-3 text-muted-foreground">{a.description || "—"}</td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="icon" variant="ghost" onClick={() => openEdit(a)} data-testid={`button-edit-account-${a.id}`}><Pencil className="h-4 w-4" /></Button>
                              {!a.isSystem && (
                                <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete this account?")) deleteMutation.mutate(a.id); }} data-testid={`button-delete-account-${a.id}`}><Trash2 className="h-4 w-4" /></Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Account" : "Add Account"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Code *</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. 4500" data-testid="input-account-code" />
            </div>
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Training Income" data-testid="input-account-name" />
            </div>
            <div>
              <Label>Account Type</Label>
              <Select value={form.accountType} onValueChange={(v) => setForm({ ...form, accountType: v })}>
                <SelectTrigger data-testid="select-account-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ACCOUNT_TYPE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="input-account-description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-account">
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
