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
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { AccItem, AccChartOfAccount } from "@shared/schema";

interface ItemFormData {
  code: string;
  description: string;
  defaultPrice: string;
  unit: string;
  incomeAccountId: string;
}

export function ItemsPanel() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AccItem | null>(null);
  const [form, setForm] = useState<ItemFormData>({ code: "", description: "", defaultPrice: "0", unit: "unit", incomeAccountId: "" });

  const { data: items = [], isLoading } = useQuery<AccItem[]>({ queryKey: ["/api/accounting/items"] });
  const { data: accounts = [] } = useQuery<AccChartOfAccount[]>({ queryKey: ["/api/accounting/chart-of-accounts"] });

  const incomeAccounts = accounts.filter(a => a.accountType === "income" && a.isActive);

  const createMutation = useMutation({
    mutationFn: (data: ItemFormData) => apiRequest("POST", "/api/accounting/items", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/accounting/items"] }); toast({ title: "Item created" }); closeDialog(); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ItemFormData }) => apiRequest("PATCH", `/api/accounting/items/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/accounting/items"] }); toast({ title: "Item updated" }); closeDialog(); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/accounting/items/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/accounting/items"] }); toast({ title: "Item deleted" }); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const openNew = () => {
    setEditing(null);
    setForm({ code: "", description: "", defaultPrice: "0", unit: "unit", incomeAccountId: "" });
    setDialogOpen(true);
  };

  const openEdit = (item: AccItem) => {
    setEditing(item);
    setForm({ code: item.code, description: item.description, defaultPrice: item.defaultPrice || "0", unit: item.unit || "unit", incomeAccountId: item.incomeAccountId || "" });
    setDialogOpen(true);
  };

  const closeDialog = () => { setDialogOpen(false); setEditing(null); };

  const handleSubmit = () => {
    if (!form.code.trim() || !form.description.trim()) { toast({ title: "Code and description are required", variant: "destructive" }); return; }
    const data = { ...form, incomeAccountId: form.incomeAccountId || null };
    if (editing) { updateMutation.mutate({ id: editing.id, data }); } else { createMutation.mutate(data); }
  };

  return (
    <div className="space-y-4" data-testid="finance-items-panel">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" data-testid="text-items-title">Items</h2>
          <p className="text-muted-foreground">Reusable line items for invoices</p>
        </div>
        <Button onClick={openNew} data-testid="button-add-item"><Plus className="h-4 w-4 mr-2" /> Add Item</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Code</th>
                  <th className="text-left p-3 font-medium">Description</th>
                  <th className="text-right p-3 font-medium">Default Price</th>
                  <th className="text-left p-3 font-medium">Unit</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Loading...</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No items yet</td></tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="border-b" data-testid={`row-item-${item.id}`}>
                      <td className="p-3"><Badge variant="outline">{item.code}</Badge></td>
                      <td className="p-3" data-testid={`text-item-desc-${item.id}`}>{item.description}</td>
                      <td className="p-3 text-right">${parseFloat(item.defaultPrice || "0").toFixed(2)}</td>
                      <td className="p-3 text-muted-foreground">{item.unit}</td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(item)} data-testid={`button-edit-item-${item.id}`}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete this item?")) deleteMutation.mutate(item.id); }} data-testid={`button-delete-item-${item.id}`}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Item" : "Add Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Code *</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. CONSULT-01" data-testid="input-item-code" />
            </div>
            <div>
              <Label>Description *</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Education Consulting Fee" data-testid="input-item-description" />
            </div>
            <div>
              <Label>Default Price</Label>
              <Input type="number" step="0.01" value={form.defaultPrice} onChange={(e) => setForm({ ...form, defaultPrice: e.target.value })} data-testid="input-item-price" />
            </div>
            <div>
              <Label>Unit</Label>
              <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="e.g. hour, unit, session" data-testid="input-item-unit" />
            </div>
            <div>
              <Label>Income Account</Label>
              <Select value={form.incomeAccountId} onValueChange={(v) => setForm({ ...form, incomeAccountId: v })}>
                <SelectTrigger data-testid="select-item-account"><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {incomeAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-item">
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
