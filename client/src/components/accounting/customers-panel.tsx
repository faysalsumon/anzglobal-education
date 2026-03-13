import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Users, Link2 } from "lucide-react";
import type { AccCustomer } from "@shared/schema";

interface CrmContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string | null;
}

interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
  crmContactId: string;
}

export function CustomersPanel() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AccCustomer | null>(null);
  const [form, setForm] = useState<CustomerFormData>({ name: "", email: "", phone: "", address: "", currency: "AUD", crmContactId: "" });

  const { data: customers = [], isLoading } = useQuery<AccCustomer[]>({
    queryKey: ["/api/accounting/customers"],
  });
  const { data: crmContacts = [] } = useQuery<CrmContact[]>({
    queryKey: ["/api/crm/contacts"],
    queryFn: async () => {
      const res = await fetch("/api/crm/contacts?limit=500");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : (data.contacts || []);
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CustomerFormData) => apiRequest("POST", "/api/accounting/customers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/customers"] });
      toast({ title: "Customer created" });
      closeDialog();
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CustomerFormData }) => apiRequest("PATCH", `/api/accounting/customers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/customers"] });
      toast({ title: "Customer updated" });
      closeDialog();
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/accounting/customers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/customers"] });
      toast({ title: "Customer deleted" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", email: "", phone: "", address: "", currency: "AUD", crmContactId: "" });
    setDialogOpen(true);
  };

  const openEdit = (c: AccCustomer) => {
    setEditing(c);
    setForm({ name: c.name, email: c.email || "", phone: c.phone || "", address: c.address || "", currency: c.currency || "AUD", crmContactId: c.crmContactId || "" });
    setDialogOpen(true);
  };

  const closeDialog = () => { setDialogOpen(false); setEditing(null); };

  const handleSubmit = () => {
    if (!form.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    const data = { ...form, email: form.email || null, phone: form.phone || null, address: form.address || null, crmContactId: form.crmContactId || null };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-4" data-testid="finance-customers-panel">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" data-testid="text-customers-title">Customers</h2>
          <p className="text-muted-foreground">Billing contacts directory</p>
        </div>
        <Button onClick={openNew} data-testid="button-add-customer"><Plus className="h-4 w-4 mr-2" /> Add Customer</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Email</th>
                  <th className="text-left p-3 font-medium">Phone</th>
                  <th className="text-left p-3 font-medium">Currency</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Loading...</td></tr>
                ) : customers.length === 0 ? (
                  <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No customers yet</td></tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.id} className="border-b" data-testid={`row-customer-${c.id}`}>
                      <td className="p-3 font-medium" data-testid={`text-customer-name-${c.id}`}>{c.name}</td>
                      <td className="p-3 text-muted-foreground">{c.email || "—"}</td>
                      <td className="p-3 text-muted-foreground">{c.phone || "—"}</td>
                      <td className="p-3"><Badge variant="secondary">{c.currency}</Badge></td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(c)} data-testid={`button-edit-customer-${c.id}`}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete this customer?")) deleteMutation.mutate(c.id); }} data-testid={`button-delete-customer-${c.id}`}><Trash2 className="h-4 w-4" /></Button>
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
            <DialogTitle>{editing ? "Edit Customer" : "Add Customer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-customer-name" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="input-customer-email" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="input-customer-phone" />
            </div>
            <div>
              <Label>Address</Label>
              <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} data-testid="input-customer-address" />
            </div>
            <div>
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                <SelectTrigger data-testid="select-customer-currency"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AUD">AUD</SelectItem>
                  <SelectItem value="BDT">BDT</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Link CRM Contact</Label>
              <Select value={form.crmContactId || "none"} onValueChange={(v) => {
                const contactId = v === "none" ? "" : v;
                if (contactId) {
                  const contact = crmContacts.find(c => c.id === contactId);
                  if (contact) {
                    setForm({
                      ...form,
                      crmContactId: contactId,
                      name: form.name || `${contact.firstName} ${contact.lastName}`.trim(),
                      email: form.email || contact.email,
                      phone: form.phone || contact.mobile || "",
                    });
                    return;
                  }
                }
                setForm({ ...form, crmContactId: contactId });
              }}>
                <SelectTrigger data-testid="select-crm-contact"><SelectValue placeholder="Link to CRM contact" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No CRM Link</SelectItem>
                  {crmContacts.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-1"><Link2 className="h-3 w-3" /> {c.firstName} {c.lastName} ({c.email})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.crmContactId && <p className="text-xs text-muted-foreground mt-1">Linked to CRM contact</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-customer">
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
