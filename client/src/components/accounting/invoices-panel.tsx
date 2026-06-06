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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Eye, Send, Ban, BellRing, CreditCard, FileText,
  Trash2, ChevronLeft,
} from "lucide-react";
import type { AccCustomer, AccItem, AccInvoice, AccInvoiceLineItem, AccPaymentReceived, AccCreditNote } from "@shared/schema";

type InvoiceWithCustomer = AccInvoice & { customer: AccCustomer | null };

interface CreditNoteWithItems extends AccCreditNote {
  items: Array<{ id: string; description: string; quantity: string; unitPrice: string; amount: string }>;
}

interface InvoiceDetail extends AccInvoice {
  customer: AccCustomer | null;
  lineItems: AccInvoiceLineItem[];
  payments: AccPaymentReceived[];
  creditNotes: CreditNoteWithItems[];
}

interface PaymentFormData {
  amount: string;
  paymentDate: string;
  method: string;
  reference: string;
  notes: string;
}

interface CreditNoteFormData {
  reason: string;
  items: Array<{ description: string; quantity: string; unitPrice: string }>;
}

interface InvoiceFormData {
  customerId: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  gstEnabled: boolean;
  notes: string;
  terms: string;
  regionCode: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  partially_paid: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  void: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  overdue: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  partially_paid: "Partially Paid",
  paid: "Paid",
  void: "Void",
  overdue: "Overdue",
};

interface LineItemForm {
  itemId: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

export function InvoicesPanel() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [creditNoteDialogOpen, setCreditNoteDialogOpen] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [invoiceForm, setInvoiceForm] = useState<InvoiceFormData>({
    customerId: "",
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    currency: "AUD",
    gstEnabled: false,
    notes: "",
    terms: "",
    regionCode: "AU",
  });
  const [lineItems, setLineItems] = useState<LineItemForm[]>([{ itemId: "", description: "", quantity: "1", unitPrice: "0" }]);
  const [paymentForm, setPaymentForm] = useState<PaymentFormData>({ amount: "", paymentDate: new Date().toISOString().split('T')[0], method: "bank", reference: "", notes: "" });
  const [creditNoteForm, setCreditNoteForm] = useState<CreditNoteFormData>({ reason: "", items: [{ description: "", quantity: "1", unitPrice: "0" }] });

  const { data: customers = [] } = useQuery<AccCustomer[]>({ queryKey: ["/api/accounting/customers"] });
  const { data: catalogItems = [] } = useQuery<AccItem[]>({ queryKey: ["/api/accounting/items"] });
  const { data: invoices = [], isLoading } = useQuery<InvoiceWithCustomer[]>({
    queryKey: ["/api/accounting/invoices", statusFilter, customerFilter, fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (customerFilter !== "all") params.set("customerId", customerFilter);
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      const res = await apiRequest("GET", `/api/accounting/invoices?${params}`);
      return res.json();
    },
  });

  const { data: invoiceDetail } = useQuery<InvoiceDetail>({
    queryKey: ["/api/accounting/invoices", viewingId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/accounting/invoices/${viewingId}`);
      return res.json();
    },
    enabled: !!viewingId,
  });

  const createMutation = useMutation({
    mutationFn: (data: InvoiceFormData & { lineItems: LineItemForm[] }) => apiRequest("POST", "/api/accounting/invoices", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/summary"] });
      toast({ title: "Invoice created" });
      setCreateDialogOpen(false);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const voidMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/accounting/invoices/${id}/void`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/summary"] });
      toast({ title: "Invoice voided" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/accounting/invoices/${id}/send`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/invoices"] });
      toast({ title: "Invoice sent to customer" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const reminderMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/accounting/invoices/${id}/reminder`),
    onSuccess: () => { toast({ title: "Reminder sent" }); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const paymentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PaymentFormData }) => apiRequest("POST", `/api/accounting/invoices/${id}/payments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/summary"] });
      toast({ title: "Payment recorded" });
      setPaymentDialogOpen(false);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const creditNoteMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreditNoteFormData }) => apiRequest("POST", `/api/accounting/invoices/${id}/credit-notes`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/invoices"] });
      toast({ title: "Credit note created" });
      setCreditNoteDialogOpen(false);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const addLineItem = () => setLineItems([...lineItems, { itemId: "", description: "", quantity: "1", unitPrice: "0" }]);
  const removeLineItem = (idx: number) => { if (lineItems.length > 1) setLineItems(lineItems.filter((_, i) => i !== idx)); };

  const updateLineItem = (idx: number, field: keyof LineItemForm, value: string) => {
    const updated = [...lineItems];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === "itemId" && value) {
      const catalogItem = catalogItems.find(i => i.id === value);
      if (catalogItem) {
        updated[idx] = { ...updated[idx], description: catalogItem.description, unitPrice: catalogItem.defaultPrice || "0" };
      }
    }
    setLineItems(updated);
  };

  const calculateSubtotal = () => lineItems.reduce((s, item) => s + (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0), 0);
  const subtotal = calculateSubtotal();
  const gstAmount = invoiceForm.gstEnabled ? subtotal * 0.1 : 0;
  const total = subtotal + gstAmount;

  const handleCreateInvoice = () => {
    if (!invoiceForm.customerId) { toast({ title: "Select a customer", variant: "destructive" }); return; }
    if (lineItems.every(li => !li.description.trim())) { toast({ title: "Add at least one line item", variant: "destructive" }); return; }
    createMutation.mutate({ ...invoiceForm, lineItems: lineItems.filter(li => li.description.trim()) });
  };

  const handleRecordPayment = () => {
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) { toast({ title: "Enter valid amount", variant: "destructive" }); return; }
    if (!viewingId) return;
    paymentMutation.mutate({ id: viewingId, data: paymentForm });
  };

  const handleCreateCreditNote = () => {
    if (!viewingId) return;
    const validItems = creditNoteForm.items.filter(i => i.description.trim());
    if (validItems.length === 0) { toast({ title: "Add at least one line item", variant: "destructive" }); return; }
    creditNoteMutation.mutate({ id: viewingId, data: { reason: creditNoteForm.reason, items: validItems } });
  };

  const openCreate = () => {
    setInvoiceForm({ customerId: "", issueDate: new Date().toISOString().split('T')[0], dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0], currency: "AUD", gstEnabled: false, notes: "", terms: "", regionCode: "AU" });
    setLineItems([{ itemId: "", description: "", quantity: "1", unitPrice: "0" }]);
    setCreateDialogOpen(true);
  };

  if (viewingId && invoiceDetail) {
    return <InvoiceDetailView
      invoice={invoiceDetail}
      onBack={() => setViewingId(null)}
      onSend={(id) => sendMutation.mutate(id)}
      onVoid={(id) => { if (confirm("Void this invoice?")) voidMutation.mutate(id); }}
      onReminder={(id) => reminderMutation.mutate(id)}
      onRecordPayment={() => { setPaymentForm({ amount: "", paymentDate: new Date().toISOString().split('T')[0], method: "bank", reference: "", notes: "" }); setPaymentDialogOpen(true); }}
      onCreditNote={() => { setCreditNoteForm({ reason: "", items: [{ description: "", quantity: "1", unitPrice: "0" }] }); setCreditNoteDialogOpen(true); }}
      sendPending={sendMutation.isPending}
      reminderPending={reminderMutation.isPending}
      paymentDialog={
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Amount *</Label><Input type="number" step="0.01" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} data-testid="input-payment-amount" /></div>
              <div><Label>Date</Label><Input type="date" value={paymentForm.paymentDate} onChange={e => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })} data-testid="input-payment-date" /></div>
              <div><Label>Method</Label>
                <Select value={paymentForm.method} onValueChange={v => setPaymentForm({ ...paymentForm, method: v })}>
                  <SelectTrigger data-testid="select-payment-method"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Reference</Label><Input value={paymentForm.reference} onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })} data-testid="input-payment-reference" /></div>
              <div><Label>Notes</Label><Textarea value={paymentForm.notes} onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })} data-testid="input-payment-notes" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleRecordPayment} disabled={paymentMutation.isPending} data-testid="button-save-payment">{paymentMutation.isPending ? "Saving..." : "Record Payment"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
      creditNoteDialog={
        <Dialog open={creditNoteDialogOpen} onOpenChange={setCreditNoteDialogOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader><DialogTitle>Issue Credit Note</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Reason</Label><Textarea value={creditNoteForm.reason} onChange={e => setCreditNoteForm({ ...creditNoteForm, reason: e.target.value })} data-testid="input-credit-note-reason" /></div>
              <div>
                <Label>Line Items</Label>
                {creditNoteForm.items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 mt-2 items-end">
                    <div className="flex-1"><Input placeholder="Description" value={item.description} onChange={e => { const items = [...creditNoteForm.items]; items[idx].description = e.target.value; setCreditNoteForm({ ...creditNoteForm, items }); }} data-testid={`input-cn-desc-${idx}`} /></div>
                    <div className="w-20"><Input type="number" placeholder="Qty" value={item.quantity} onChange={e => { const items = [...creditNoteForm.items]; items[idx].quantity = e.target.value; setCreditNoteForm({ ...creditNoteForm, items }); }} data-testid={`input-cn-qty-${idx}`} /></div>
                    <div className="w-28"><Input type="number" step="0.01" placeholder="Price" value={item.unitPrice} onChange={e => { const items = [...creditNoteForm.items]; items[idx].unitPrice = e.target.value; setCreditNoteForm({ ...creditNoteForm, items }); }} data-testid={`input-cn-price-${idx}`} /></div>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="mt-2" onClick={() => setCreditNoteForm({ ...creditNoteForm, items: [...creditNoteForm.items, { description: "", quantity: "1", unitPrice: "0" }] })} data-testid="button-add-cn-item"><Plus className="h-3 w-3 mr-1" /> Add</Button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreditNoteDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateCreditNote} disabled={creditNoteMutation.isPending} data-testid="button-save-credit-note">{creditNoteMutation.isPending ? "Saving..." : "Issue Credit Note"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    />;
  }

  return (
    <div className="space-y-4" data-testid="finance-invoices-panel">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" data-testid="text-invoices-title">Invoices</h2>
          <p className="text-muted-foreground">Manage invoices and payments</p>
        </div>
        <Button onClick={openCreate} data-testid="button-create-invoice"><Plus className="h-4 w-4 mr-2" /> Create Invoice</Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Label className="text-sm">Status:</Label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-status-filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="partially_paid">Partially Paid</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="void">Void</SelectItem>
          </SelectContent>
        </Select>
        <Label className="text-sm">Customer:</Label>
        <Select value={customerFilter} onValueChange={setCustomerFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-customer-filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Customers</SelectItem>
            {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Label className="text-sm">From:</Label>
        <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-[150px]" data-testid="input-date-from" />
        <Label className="text-sm">To:</Label>
        <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-[150px]" data-testid="input-date-to" />
        {(customerFilter !== "all" || fromDate || toDate) && (
          <Button variant="ghost" size="sm" onClick={() => { setCustomerFilter("all"); setFromDate(""); setToDate(""); }} data-testid="button-clear-filters">Clear Filters</Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Invoice #</th>
                  <th className="text-left p-3 font-medium">Customer</th>
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">Due</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-right p-3 font-medium">Total</th>
                  <th className="text-right p-3 font-medium">Balance</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Loading...</td></tr>
                ) : invoices.length === 0 ? (
                  <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No invoices found</td></tr>
                ) : (
                  invoices.map((inv) => {
                    const balance = parseFloat(inv.total) - parseFloat(inv.amountPaid || "0");
                    return (
                      <tr key={inv.id} className="border-b" data-testid={`row-invoice-${inv.id}`}>
                        <td className="p-3 font-mono font-medium" data-testid={`text-invoice-number-${inv.id}`}>{inv.invoiceNumber}</td>
                        <td className="p-3">{inv.customer?.name || "—"}</td>
                        <td className="p-3 text-muted-foreground">{inv.issueDate}</td>
                        <td className="p-3 text-muted-foreground">{inv.dueDate}</td>
                        <td className="p-3"><Badge className={`no-default-hover-elevate no-default-active-elevate ${STATUS_COLORS[inv.status]}`}>{STATUS_LABELS[inv.status]}</Badge></td>
                        <td className="p-3 text-right">{inv.currency} {parseFloat(inv.total).toFixed(2)}</td>
                        <td className="p-3 text-right font-medium">{inv.currency} {balance.toFixed(2)}</td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => setViewingId(inv.id)} data-testid={`button-view-invoice-${inv.id}`}><Eye className="h-4 w-4" /></Button>
                            {(inv.status === "draft" || inv.status === "sent") && (
                              <Button size="icon" variant="ghost" onClick={() => sendMutation.mutate(inv.id)} data-testid={`button-send-invoice-${inv.id}`}><Send className="h-4 w-4" /></Button>
                            )}
                            {inv.status !== "void" && inv.status !== "paid" && (
                              <Button size="icon" variant="ghost" onClick={() => { if (confirm("Void this invoice?")) voidMutation.mutate(inv.id); }} data-testid={`button-void-invoice-${inv.id}`}><Ban className="h-4 w-4" /></Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Customer *</Label>
                <Select value={invoiceForm.customerId} onValueChange={v => {
                  const cust = customers.find(c => c.id === v);
                  setInvoiceForm({ ...invoiceForm, customerId: v, currency: cust?.currency || invoiceForm.currency });
                }}>
                  <SelectTrigger data-testid="select-invoice-customer"><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Currency</Label>
                <Select value={invoiceForm.currency} onValueChange={v => setInvoiceForm({ ...invoiceForm, currency: v })}>
                  <SelectTrigger data-testid="select-invoice-currency"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AUD">AUD</SelectItem>
                    <SelectItem value="BDT">BDT</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Issue Date</Label>
                <Input type="date" value={invoiceForm.issueDate} onChange={e => setInvoiceForm({ ...invoiceForm, issueDate: e.target.value })} data-testid="input-invoice-issue-date" />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input type="date" value={invoiceForm.dueDate} onChange={e => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })} data-testid="input-invoice-due-date" />
              </div>
              <div>
                <Label>Region</Label>
                <Select value={invoiceForm.regionCode} onValueChange={v => setInvoiceForm({ ...invoiceForm, regionCode: v })}>
                  <SelectTrigger data-testid="select-invoice-region"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AU">Australia (AU)</SelectItem>
                    <SelectItem value="BD">Bangladesh (BD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={invoiceForm.gstEnabled} onCheckedChange={v => setInvoiceForm({ ...invoiceForm, gstEnabled: v })} data-testid="switch-gst" />
                <Label>GST 10%</Label>
              </div>
            </div>

            <Separator />
            <div>
              <Label className="text-base font-semibold">Line Items</Label>
              {lineItems.map((item, idx) => (
                <div key={idx} className="flex gap-2 mt-2 items-end flex-wrap">
                  <div className="w-40">
                    <Label className="text-xs">Item</Label>
                    <Select value={item.itemId} onValueChange={v => updateLineItem(idx, "itemId", v)}>
                      <SelectTrigger data-testid={`select-line-item-${idx}`}><SelectValue placeholder="Pick item" /></SelectTrigger>
                      <SelectContent>
                        {catalogItems.map(ci => <SelectItem key={ci.id} value={ci.id}>{ci.code}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <Label className="text-xs">Description</Label>
                    <Input value={item.description} onChange={e => updateLineItem(idx, "description", e.target.value)} data-testid={`input-line-desc-${idx}`} />
                  </div>
                  <div className="w-20">
                    <Label className="text-xs">Qty</Label>
                    <Input type="number" value={item.quantity} onChange={e => updateLineItem(idx, "quantity", e.target.value)} data-testid={`input-line-qty-${idx}`} />
                  </div>
                  <div className="w-28">
                    <Label className="text-xs">Price</Label>
                    <Input type="number" step="0.01" value={item.unitPrice} onChange={e => updateLineItem(idx, "unitPrice", e.target.value)} data-testid={`input-line-price-${idx}`} />
                  </div>
                  <div className="w-24 text-right pt-5 text-sm font-medium">
                    {invoiceForm.currency} {((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)).toFixed(2)}
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => removeLineItem(idx)} disabled={lineItems.length <= 1} data-testid={`button-remove-line-${idx}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" className="mt-3" onClick={addLineItem} data-testid="button-add-line-item"><Plus className="h-3 w-3 mr-1" /> Add Line</Button>
            </div>

            <Separator />
            <div className="flex justify-end">
              <div className="space-y-1 text-right text-sm w-60">
                <div className="flex justify-between"><span>Subtotal</span><span className="font-medium">{invoiceForm.currency} {subtotal.toFixed(2)}</span></div>
                {invoiceForm.gstEnabled && <div className="flex justify-between"><span>GST (10%)</span><span>{invoiceForm.currency} {gstAmount.toFixed(2)}</span></div>}
                <Separator />
                <div className="flex justify-between text-base font-bold"><span>Total</span><span>{invoiceForm.currency} {total.toFixed(2)}</span></div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Notes</Label><Textarea value={invoiceForm.notes} onChange={e => setInvoiceForm({ ...invoiceForm, notes: e.target.value })} data-testid="input-invoice-notes" /></div>
              <div><Label>Terms</Label><Textarea value={invoiceForm.terms} onChange={e => setInvoiceForm({ ...invoiceForm, terms: e.target.value })} data-testid="input-invoice-terms" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateInvoice} disabled={createMutation.isPending} data-testid="button-save-invoice">{createMutation.isPending ? "Creating..." : "Create Invoice"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InvoiceDetailView({ invoice, onBack, onSend, onVoid, onReminder, onRecordPayment, onCreditNote, sendPending, reminderPending, paymentDialog, creditNoteDialog }: {
  invoice: InvoiceDetail;
  onBack: () => void;
  onSend: (id: string) => void;
  onVoid: (id: string) => void;
  onReminder: (id: string) => void;
  onRecordPayment: () => void;
  onCreditNote: () => void;
  sendPending: boolean;
  reminderPending: boolean;
  paymentDialog: React.ReactNode;
  creditNoteDialog: React.ReactNode;
}) {
  const balance = parseFloat(invoice.total) - parseFloat(invoice.amountPaid || "0");
  const isOverdue = invoice.status !== "paid" && invoice.status !== "void" && new Date(invoice.dueDate) < new Date();

  return (
    <div className="space-y-4" data-testid="invoice-detail-view">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" onClick={onBack} data-testid="button-back-invoices"><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
        <h2 className="text-2xl font-bold tracking-tight" data-testid="text-invoice-detail-number">{invoice.invoiceNumber}</h2>
        <Badge className={`no-default-hover-elevate no-default-active-elevate ${STATUS_COLORS[invoice.status]}`}>{STATUS_LABELS[invoice.status]}</Badge>
        {isOverdue && <Badge className="no-default-hover-elevate no-default-active-elevate bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">Overdue</Badge>}
      </div>

      <div className="flex gap-2 flex-wrap">
        {(invoice.status === "draft" || invoice.status === "sent") && (
          <Button onClick={() => onSend(invoice.id)} disabled={sendPending} data-testid="button-send-invoice-detail"><Send className="h-4 w-4 mr-2" />{sendPending ? "Sending..." : "Send Invoice"}</Button>
        )}
        {invoice.status !== "void" && invoice.status !== "paid" && (
          <>
            <Button variant="outline" onClick={onRecordPayment} data-testid="button-record-payment"><CreditCard className="h-4 w-4 mr-2" /> Record Payment</Button>
            {isOverdue && <Button variant="outline" onClick={() => onReminder(invoice.id)} disabled={reminderPending} data-testid="button-send-reminder"><BellRing className="h-4 w-4 mr-2" />{reminderPending ? "Sending..." : "Send Reminder"}</Button>}
            <Button variant="outline" onClick={() => onVoid(invoice.id)} data-testid="button-void-invoice-detail"><Ban className="h-4 w-4 mr-2" /> Void</Button>
          </>
        )}
        {(invoice.status === "sent" || invoice.status === "paid" || invoice.status === "partially_paid") && (
          <Button variant="outline" onClick={onCreditNote} data-testid="button-credit-note"><FileText className="h-4 w-4 mr-2" /> Credit Note</Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground">Customer</h3>
            <p className="font-medium" data-testid="text-detail-customer">{invoice.customer?.name || "—"}</p>
            {invoice.customer?.email && <p className="text-sm text-muted-foreground">{invoice.customer.email}</p>}
            {invoice.customer?.phone && <p className="text-sm text-muted-foreground">{invoice.customer.phone}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground">Invoice Info</h3>
            <div className="grid grid-cols-2 gap-1 text-sm">
              <span className="text-muted-foreground">Issue Date:</span><span>{invoice.issueDate}</span>
              <span className="text-muted-foreground">Due Date:</span><span>{invoice.dueDate}</span>
              <span className="text-muted-foreground">Currency:</span><span>{invoice.currency}</span>
              <span className="text-muted-foreground">Region:</span><span>{invoice.regionCode}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Description</th>
                  <th className="text-right p-3 font-medium">Qty</th>
                  <th className="text-right p-3 font-medium">Unit Price</th>
                  <th className="text-right p-3 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(invoice.lineItems || []).map((item: AccInvoiceLineItem, idx: number) => (
                  <tr key={item.id || idx} className="border-b">
                    <td className="p-3">{item.description}</td>
                    <td className="p-3 text-right">{parseFloat(item.quantity).toFixed(2)}</td>
                    <td className="p-3 text-right">{invoice.currency} {parseFloat(item.unitPrice).toFixed(2)}</td>
                    <td className="p-3 text-right">{invoice.currency} {parseFloat(item.amount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={3} className="p-3 text-right font-medium">Subtotal</td><td className="p-3 text-right">{invoice.currency} {parseFloat(invoice.subtotal).toFixed(2)}</td></tr>
                {invoice.gstEnabled && <tr><td colSpan={3} className="p-3 text-right">GST (10%)</td><td className="p-3 text-right">{invoice.currency} {parseFloat(invoice.gstAmount).toFixed(2)}</td></tr>}
                <tr className="bg-muted/30"><td colSpan={3} className="p-3 text-right font-bold">Total</td><td className="p-3 text-right font-bold">{invoice.currency} {parseFloat(invoice.total).toFixed(2)}</td></tr>
                <tr><td colSpan={3} className="p-3 text-right text-muted-foreground">Amount Paid</td><td className="p-3 text-right">{invoice.currency} {parseFloat(invoice.amountPaid || "0").toFixed(2)}</td></tr>
                <tr className="bg-primary/5"><td colSpan={3} className="p-3 text-right font-bold text-primary">Balance Due</td><td className="p-3 text-right font-bold text-primary">{invoice.currency} {balance.toFixed(2)}</td></tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {invoice.notes && <Card><CardContent className="p-4"><h3 className="font-semibold text-sm text-muted-foreground mb-1">Notes</h3><p className="text-sm">{invoice.notes}</p></CardContent></Card>}
      {invoice.terms && <Card><CardContent className="p-4"><h3 className="font-semibold text-sm text-muted-foreground mb-1">Terms</h3><p className="text-sm">{invoice.terms}</p></CardContent></Card>}

      {invoice.payments && invoice.payments.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="p-3 border-b bg-muted/30"><h3 className="font-semibold text-sm">Payment History</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-left p-3 font-medium">Method</th>
                    <th className="text-left p-3 font-medium">Reference</th>
                    <th className="text-right p-3 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.payments.map((p: AccPaymentReceived) => (
                    <tr key={p.id} className="border-b" data-testid={`row-payment-${p.id}`}>
                      <td className="p-3">{p.paymentDate}</td>
                      <td className="p-3"><Badge variant="secondary">{p.method}</Badge></td>
                      <td className="p-3 text-muted-foreground">{p.reference || "—"}</td>
                      <td className="p-3 text-right font-medium">{invoice.currency} {parseFloat(p.amount).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {invoice.creditNotes && invoice.creditNotes.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="p-3 border-b bg-muted/30"><h3 className="font-semibold text-sm">Credit Notes</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">CN #</th>
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-left p-3 font-medium">Reason</th>
                    <th className="text-right p-3 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.creditNotes.map((cn: CreditNoteWithItems) => (
                    <tr key={cn.id} className="border-b" data-testid={`row-credit-note-${cn.id}`}>
                      <td className="p-3 font-mono">{cn.creditNoteNumber}</td>
                      <td className="p-3">{cn.issueDate}</td>
                      <td className="p-3 text-muted-foreground">{cn.reason || "—"}</td>
                      <td className="p-3 text-right font-medium">{invoice.currency} {parseFloat(cn.total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {paymentDialog}
      {creditNoteDialog}
    </div>
  );
}
