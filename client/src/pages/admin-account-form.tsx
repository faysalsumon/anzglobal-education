/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Save, Loader2, Plus, X, Check,
  Package, Trash2, Edit, ImageIcon, UserRound, ChevronsUpDown, ExternalLink,
  Upload, Link2
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type AccountType =
  | "institution"
  | "super_agent"
  | "sub_agent"
  | "pathway_provider"
  | "insurance_company"
  | "migration_agent";

type ProductType = "insurance" | "visa";

interface CrmContactSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  contactType: string;
  photo: string | null;
}

interface Account {
  id: string;
  name: string;
  accountType: AccountType;
  providerType: string | null;
  contractType: string | null;
  indirectPartnerId: string | null;
  institutionCmsId: string | null;
  primaryContactId: string | null;
  primaryContact?: CrmContactSummary | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  logoUrl: string | null;
  isActive: boolean;
  notes: string | null;
}

interface AccountProduct {
  id: string;
  accountId: string;
  productType: ProductType;
  name: string;
  description: string | null;
  studentPrice: string | null;
  agentCost: string | null;
  isActive: boolean;
}

interface RestrictedDetails {
  bankName: string | null;
  accountHolderName: string | null;
  accountNumber: string | null;
  bsb: string | null;
  swiftCode: string | null;
  contractStartDate: string | null;
  contractEndDate: string | null;
  contractNotes: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  institution: "Institution",
  super_agent: "Super Agent",
  sub_agent: "Sub Agent",
  pathway_provider: "Pathway Provider",
  insurance_company: "Insurance Company",
  migration_agent: "Migration Agent",
};

const ACCOUNT_TYPE_COLORS: Record<AccountType, string> = {
  institution: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  super_agent: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  sub_agent: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  pathway_provider: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  insurance_company: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  migration_agent: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const PROVIDER_TYPES = ["University", "TAFE", "College", "School", "Institute", "Other"];

const CONTACT_TYPE_LABELS: Record<string, string> = {
  none: "None",
  clients: "Client",
  employee: "Employee",
  external: "External",
  internal: "Internal",
  others: "Other",
  partner: "Partner",
  providers_rep: "Provider's Rep",
};

function emptyForm(): Partial<Account> {
  return {
    name: "",
    accountType: "institution",
    providerType: null,
    contractType: null,
    indirectPartnerId: null,
    institutionCmsId: null,
    primaryContactId: null,
    contactName: null,
    email: null,
    phone: null,
    website: null,
    address: null,
    city: null,
    state: null,
    country: null,
    logoUrl: null,
    notes: null,
    isActive: true,
  };
}

// ─── ContactPicker ─────────────────────────────────────────────────────────────

interface ContactPickerProps {
  value: CrmContactSummary | null;
  onChange: (contact: CrmContactSummary | null) => void;
}

function ContactPicker({ value, onChange }: ContactPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newContactForm, setNewContactForm] = useState({
    firstName: "", lastName: "", email: "", mobile: "", contactType: "providers_rep",
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const { toast } = useToast();

  const createContactMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/crm/contacts", {
        firstName: newContactForm.firstName.trim(),
        lastName: newContactForm.lastName.trim(),
        email: newContactForm.email.trim(),
        mobile: newContactForm.mobile.trim() || null,
        contactType: newContactForm.contactType,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      const c = data.contact ?? data;
      const created: CrmContactSummary = {
        id: c.id,
        firstName: c.firstName ?? "",
        lastName: c.lastName ?? "",
        email: c.email ?? "",
        contactType: c.contactType ?? newContactForm.contactType,
        photo: c.photo ?? null,
      };
      onChange(created);
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === "string" && key.startsWith("/api/crm/contacts");
        },
      });
      setCreateOpen(false);
      setNewContactForm({ firstName: "", lastName: "", email: "", mobile: "", contactType: "providers_rep" });
      setCreateError(null);
      toast({ title: "Contact created", description: `${created.firstName} ${created.lastName} has been added.` });
    },
    onError: (err: any) => {
      setCreateError(err.message || "Failed to create contact. Please try again.");
    },
  });

  const handleCreate = () => {
    setCreateError(null);
    if (!newContactForm.email.trim()) { setCreateError("Email is required."); return; }
    createContactMutation.mutate();
  };

  const contactsUrl = search
    ? `/api/crm/contacts?search=${encodeURIComponent(search)}&limit=20`
    : `/api/crm/contacts?type=providers_rep&limit=20`;

  const { data: rawContactData, isLoading } = useQuery<any>({
    queryKey: [contactsUrl],
    staleTime: 10_000,
  });

  const contacts: CrmContactSummary[] = (rawContactData?.contacts ?? rawContactData ?? []).map((r: any) => {
    const c = r.contact ?? r;
    return {
      id: c.id,
      firstName: c.firstName ?? c.first_name ?? "",
      lastName: c.lastName ?? c.last_name ?? "",
      email: c.email ?? "",
      contactType: c.contactType ?? c.contact_type ?? "none",
      photo: c.photo ?? null,
    };
  });

  const createDialog = (
    <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) { setCreateError(null); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Contact</DialogTitle>
          <DialogDescription>Fill in the basics — you can add more details from the CRM later.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="nc-first">First Name *</Label>
              <Input
                id="nc-first"
                value={newContactForm.firstName}
                onChange={e => setNewContactForm(f => ({ ...f, firstName: e.target.value }))}
                placeholder="Jane"
                data-testid="input-new-contact-first-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nc-last">Last Name *</Label>
              <Input
                id="nc-last"
                value={newContactForm.lastName}
                onChange={e => setNewContactForm(f => ({ ...f, lastName: e.target.value }))}
                placeholder="Smith"
                data-testid="input-new-contact-last-name"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nc-email">Email *</Label>
            <Input
              id="nc-email"
              type="email"
              value={newContactForm.email}
              onChange={e => setNewContactForm(f => ({ ...f, email: e.target.value }))}
              placeholder="jane@example.com"
              data-testid="input-new-contact-email"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nc-mobile">Mobile</Label>
            <Input
              id="nc-mobile"
              value={newContactForm.mobile}
              onChange={e => setNewContactForm(f => ({ ...f, mobile: e.target.value }))}
              placeholder="+61 400 000 000"
              data-testid="input-new-contact-mobile"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Contact Type</Label>
            <Select
              value={newContactForm.contactType}
              onValueChange={v => setNewContactForm(f => ({ ...f, contactType: v }))}
            >
              <SelectTrigger data-testid="select-new-contact-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CONTACT_TYPE_LABELS)
                  .filter(([v]) => v !== "none")
                  .map(([v, label]) => (
                    <SelectItem key={v} value={v}>{label}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          {createError && (
            <p className="text-sm text-destructive" data-testid="text-create-contact-error">{createError}</p>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button" variant="outline"
            onClick={() => { setCreateOpen(false); setCreateError(null); }}
            data-testid="button-cancel-new-contact"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleCreate}
            disabled={createContactMutation.isPending}
            data-testid="button-save-new-contact"
          >
            {createContactMutation.isPending
              ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Saving…</>
              : "Save Contact"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (value) {
    const initials = `${value.firstName[0] ?? ""}${value.lastName[0] ?? ""}`.toUpperCase();
    return (
      <>
        <div className="flex items-center gap-3 p-3 rounded-md border bg-muted/30" data-testid="contact-picker-selected">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={value.photo || ""} alt={`${value.firstName} ${value.lastName}`} />
            <AvatarFallback className="text-xs font-semibold">{initials || <UserRound className="h-4 w-4" />}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-tight">{value.firstName} {value.lastName}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground truncate">{value.email}</span>
              {value.contactType && value.contactType !== "none" && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  {CONTACT_TYPE_LABELS[value.contactType] ?? value.contactType}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button" size="icon" variant="ghost"
              onClick={() => window.open(`/admin?tab=crm&contactId=${value.id}`, "_blank")}
              title="Open contact"
              data-testid="button-open-contact"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button" size="icon" variant="ghost"
              onClick={() => onChange(null)}
              title="Unlink contact"
              data-testid="button-unlink-contact"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        {createDialog}
      </>
    );
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button" variant="outline"
            className="w-full justify-between font-normal"
            data-testid="button-open-contact-picker"
          >
            <span className="text-muted-foreground">Search or select a contact…</span>
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search by name or email…"
              value={search}
              onValueChange={setSearch}
              data-testid="input-contact-search"
            />
            <CommandList>
              {isLoading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {!isLoading && contacts.length === 0 && (
                <CommandEmpty>No contacts found.</CommandEmpty>
              )}
              {!isLoading && contacts.length > 0 && (
                <CommandGroup heading={search ? "Results" : "Provider's Reps"}>
                  {contacts.map(c => {
                    const initials = `${c.firstName[0] ?? ""}${c.lastName[0] ?? ""}`.toUpperCase();
                    return (
                      <CommandItem
                        key={c.id}
                        value={c.id}
                        onSelect={() => { onChange(c); setOpen(false); setSearch(""); }}
                        data-testid={`contact-option-${c.id}`}
                      >
                        <Avatar className="h-7 w-7 mr-2 shrink-0">
                          <AvatarImage src={c.photo || ""} alt={`${c.firstName} ${c.lastName}`} />
                          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-tight">{c.firstName} {c.lastName}</p>
                          <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                        </div>
                        {c.contactType && c.contactType !== "none" && (
                          <Badge variant="secondary" className="text-xs ml-2 shrink-0">
                            {CONTACT_TYPE_LABELS[c.contactType] ?? c.contactType}
                          </Badge>
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
            <div className="border-t p-2">
              <Button
                type="button" variant="ghost" size="sm"
                className="w-full justify-start text-muted-foreground"
                onClick={() => { setOpen(false); setCreateOpen(true); }}
                data-testid="button-new-contact-from-picker"
              >
                <Plus className="h-3.5 w-3.5 mr-2" /> Create new contact
              </Button>
            </div>
          </Command>
        </PopoverContent>
      </Popover>
      {createDialog}
    </>
  );
}

function emptyRestricted(): Partial<RestrictedDetails> {
  return {
    bankName: null,
    accountHolderName: null,
    accountNumber: null,
    bsb: null,
    swiftCode: null,
    contractStartDate: null,
    contractEndDate: null,
    contractNotes: null,
  };
}

function emptyProduct(type: ProductType = "insurance"): Partial<AccountProduct> {
  return { productType: type, name: "", description: null, studentPrice: null, agentCost: null, isActive: true };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminAccountForm() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isNew = !id || id === "new";

  const [formData, setFormData] = useState<Partial<Account>>(emptyForm());
  const [restrictedData, setRestrictedData] = useState<Partial<RestrictedDetails>>(emptyRestricted());
  const [primaryContact, setPrimaryContact] = useState<CrmContactSummary | null>(null);
  const [activeTab, setActiveTab] = useState("details");
  const [logoUploading, setLogoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inheritedLogoRef = useRef<string | null>(null);

  // Products state
  const [addingProduct, setAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<AccountProduct>>(emptyProduct());
  const [editingProduct, setEditingProduct] = useState<AccountProduct | null>(null);

  // ─── Queries ──────────────────────────────────────────────────────────────

  const { data: account, isLoading: accountLoading } = useQuery<Account>({
    queryKey: ["/api/admin/accounts", id],
    enabled: !isNew,
  });

  const { data: restrictedFromApi } = useQuery<RestrictedDetails | null>({
    queryKey: ["/api/admin/accounts", id, "restricted"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", `/api/admin/accounts/${id}/restricted`);
        return res.json();
      } catch {
        return null;
      }
    },
    enabled: !isNew,
  });

  const { data: products = [] } = useQuery<AccountProduct[]>({
    queryKey: ["/api/admin/accounts", id, "products"],
    enabled: !isNew,
  });

  interface CmsInstitution { id: number; name: string; country: string | null; logo: string | null; }
  const { data: cmsInstitutions = [] } = useQuery<CmsInstitution[]>({
    queryKey: ["/api/institutions"],
    enabled: formData.accountType === "institution",
  });

  const { data: superAgentAccounts = [] } = useQuery<Account[]>({
    queryKey: ["/api/admin/accounts/by-type/super_agent"],
  });
  const { data: pathwayAccounts = [] } = useQuery<Account[]>({
    queryKey: ["/api/admin/accounts/by-type/pathway_provider"],
  });
  const partnerAccounts = [...superAgentAccounts, ...pathwayAccounts];

  // ─── Sync loaded data into form ───────────────────────────────────────────

  useEffect(() => {
    if (account) {
      setFormData({ ...account });
      if (account.primaryContact) {
        setPrimaryContact(account.primaryContact);
      }
    }
  }, [account]);

  useEffect(() => {
    if (restrictedFromApi) {
      setRestrictedData({ ...restrictedFromApi });
    }
  }, [restrictedFromApi]);

  // ─── Institution logo inheritance ─────────────────────────────────────────
  useEffect(() => {
    if (formData.accountType !== "institution") return;
    if (formData.institutionCmsId && cmsInstitutions.length > 0) {
      const linked = cmsInstitutions.find(i => String(i.id) === String(formData.institutionCmsId));
      if (linked?.logo) {
        inheritedLogoRef.current = linked.logo;
        setFormData(f => ({ ...f, logoUrl: linked.logo }));
      }
    } else if (!formData.institutionCmsId && inheritedLogoRef.current) {
      const prev = inheritedLogoRef.current;
      inheritedLogoRef.current = null;
      setFormData(f => f.logoUrl === prev ? { ...f, logoUrl: null } : f);
    }
  }, [formData.institutionCmsId, formData.accountType, cmsInstitutions]);

  // ─── Logo upload handler ───────────────────────────────────────────────────
  async function handleLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append("logo", file);
      const res = await fetch("/api/admin/accounts/upload-logo", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Upload failed");
      }
      const { logoUrl } = await res.json();
      setFormData(f => ({ ...f, logoUrl }));
      toast({ title: "Logo uploaded" });
    } catch (err: any) {
      toast({ title: "Logo upload failed", description: err.message, variant: "destructive" });
    } finally {
      setLogoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // ─── Mutations ────────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body: any = { ...formData, primaryContactId: primaryContact?.id ?? null };
      if (formData.accountType !== "institution") {
        body.contractType = null;
        body.indirectPartnerId = null;
        body.providerType = null;
        body.institutionCmsId = null;
      }
      if (body.contractType !== "indirect") body.indirectPartnerId = null;
      if (isNew) {
        return apiRequest("POST", "/api/admin/accounts", body);
      } else {
        return apiRequest("PATCH", `/api/admin/accounts/${id}`, body);
      }
    },
    onSuccess: async (res: any) => {
      const saved = await res.json();
      await apiRequest("PUT", `/api/admin/accounts/${saved.id}/restricted`, restrictedData);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/accounts"] });
      toast({ title: isNew ? "Account created" : "Account updated" });
      setLocation("/admin?tab=accounts");
    },
    onError: () => toast({ title: "Failed to save account", variant: "destructive" }),
  });

  const deactivateMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/admin/accounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/accounts"] });
      toast({ title: "Account deactivated" });
      setLocation("/admin?tab=accounts");
    },
    onError: () => toast({ title: "Failed to deactivate", variant: "destructive" }),
  });

  const addProductMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/admin/accounts/${id}/products`, newProduct),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/accounts", id, "products"] });
      setAddingProduct(false);
      setNewProduct(emptyProduct(formData.accountType === "migration_agent" ? "visa" : "insurance"));
      toast({ title: "Product added" });
    },
    onError: () => toast({ title: "Failed to add product", variant: "destructive" }),
  });

  const editProductMutation = useMutation({
    mutationFn: (p: AccountProduct) =>
      apiRequest("PATCH", `/api/admin/accounts/${id}/products/${p.id}`, p),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/accounts", id, "products"] });
      setEditingProduct(null);
      toast({ title: "Product updated" });
    },
    onError: () => toast({ title: "Failed to update product", variant: "destructive" }),
  });

  const deleteProductMutation = useMutation({
    mutationFn: (productId: string) =>
      apiRequest("DELETE", `/api/admin/accounts/${id}/products/${productId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/accounts", id, "products"] });
      toast({ title: "Product removed" });
    },
    onError: () => toast({ title: "Failed to remove product", variant: "destructive" }),
  });

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const showProducts =
    formData.accountType === "insurance_company" || formData.accountType === "migration_agent";

  const accountInitials = (formData.name || "AC").slice(0, 2).toUpperCase();
  const isInstitutionWithCmsLink = formData.accountType === "institution" && !!formData.institutionCmsId;

  if (!isNew && accountLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/admin?tab=accounts")}
            data-testid="button-back-accounts"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Accounts
          </Button>

          {/* Logo / Avatar + name block */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative group shrink-0">
              <Avatar className="h-10 w-10 rounded-md">
                <AvatarImage src={formData.logoUrl || ""} alt={formData.name || "Account"} />
                <AvatarFallback className="rounded-md text-sm font-semibold bg-muted">
                  {accountInitials}
                </AvatarFallback>
              </Avatar>
              {!isInstitutionWithCmsLink && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={logoUploading}
                  className="absolute inset-0 flex items-center justify-center rounded-md bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                  data-testid="button-edit-logo"
                  title="Upload logo"
                >
                  {logoUploading ? <Loader2 className="h-3.5 w-3.5 text-white animate-spin" /> : <ImageIcon className="h-3.5 w-3.5 text-white" />}
                </button>
              )}
            </div>

            <div className="min-w-0">
              <p className="font-semibold text-sm leading-tight truncate">
                {formData.name || (isNew ? "New Account" : "Account")}
              </p>
              {formData.accountType && (
                <span className={`inline-block text-xs px-1.5 py-0.5 rounded-full font-medium ${ACCOUNT_TYPE_COLORS[formData.accountType as AccountType]}`}>
                  {ACCOUNT_TYPE_LABELS[formData.accountType as AccountType]}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isNew && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => deactivateMutation.mutate()}
                disabled={deactivateMutation.isPending}
                className="text-destructive border-destructive/30 hover:bg-destructive/5"
                data-testid="button-deactivate-account"
              >
                Deactivate
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={!formData.name || saveMutation.isPending}
              data-testid="button-save-account"
            >
              {saveMutation.isPending ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Saving…</>
              ) : (
                <><Save className="h-3.5 w-3.5 mr-1.5" />{isNew ? "Create Account" : "Save Changes"}</>
              )}
            </Button>
          </div>
        </div>

      </header>

      {/* Hidden file input for logo upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleLogoFileChange}
        data-testid="input-logo-file"
      />

      {/* ── Page body ─────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6">

        {/* Large avatar hero card */}
        <Card className="mb-6">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-5">
              <div className="relative group shrink-0">
                <Avatar className="h-20 w-20 rounded-xl">
                  <AvatarImage src={formData.logoUrl || ""} alt={formData.name || "Account"} />
                  <AvatarFallback className="rounded-xl text-2xl font-bold bg-muted">
                    {accountInitials}
                  </AvatarFallback>
                </Avatar>
                {!isInstitutionWithCmsLink && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={logoUploading}
                    className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Upload logo"
                  >
                    {logoUploading ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <ImageIcon className="h-5 w-5 text-white" />}
                  </button>
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="account-name-hero">Account Name *</Label>
                  <Input
                    id="account-name-hero"
                    value={formData.name || ""}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Swinburne University"
                    className="text-base font-medium"
                    data-testid="input-account-name"
                  />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={formData.isActive !== false ? "default" : "secondary"}>
                    {formData.isActive !== false ? "Active" : "Inactive"}
                  </Badge>
                  {formData.contractType && (
                    <Badge variant="outline" className="capitalize">{formData.contractType}</Badge>
                  )}
                  {!isNew && (
                    <p className="text-xs text-muted-foreground">ID: {id}</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full mb-6">
            <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
            {showProducts && !isNew && (
              <TabsTrigger value="products" className="flex-1">Products</TabsTrigger>
            )}
            <TabsTrigger value="banking" className="flex-1">Contract &amp; Banking</TabsTrigger>
          </TabsList>

          {/* ── Details tab ──────────────────────────────────────────────── */}
          <TabsContent value="details" className="space-y-5">

            {/* Classification */}
            <Card>
              <CardContent className="pt-5 pb-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">Classification</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Account Type *</Label>
                    <Select
                      value={formData.accountType || "institution"}
                      onValueChange={v => setFormData({ ...formData, accountType: v as AccountType, providerType: null, contractType: null, indirectPartnerId: null })}
                    >
                      <SelectTrigger data-testid="select-account-type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(ACCOUNT_TYPE_LABELS).map(([val, label]) => (
                          <SelectItem key={val} value={val}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.accountType === "institution" && (
                    <>
                      <div className="space-y-1.5">
                        <Label>Provider Type</Label>
                        <Select
                          value={formData.providerType || ""}
                          onValueChange={v => setFormData({ ...formData, providerType: v || null })}
                        >
                          <SelectTrigger data-testid="select-provider-type"><SelectValue placeholder="Select type" /></SelectTrigger>
                          <SelectContent>
                            {PROVIDER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Contract Type</Label>
                        <Select
                          value={formData.contractType || ""}
                          onValueChange={v => setFormData({ ...formData, contractType: v || null, indirectPartnerId: null })}
                        >
                          <SelectTrigger data-testid="select-contract-type"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="direct">Direct</SelectItem>
                            <SelectItem value="indirect">Indirect (via partner)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>Link to Institution (CMS)</Label>
                        <Select
                          value={formData.institutionCmsId || "__none__"}
                          onValueChange={v => setFormData({ ...formData, institutionCmsId: v === "__none__" ? null : v })}
                        >
                          <SelectTrigger data-testid="select-institution-cms">
                            <SelectValue placeholder="Search and select institution…" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">— None —</SelectItem>
                            {cmsInstitutions.map(inst => (
                              <SelectItem key={inst.id} value={String(inst.id)}>
                                {inst.name}{inst.country ? ` (${inst.country})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Optionally links this account to an institution in the course catalogue.</p>
                      </div>

                      {formData.contractType === "indirect" && (
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label>Indirect Partner (Super Agent / Pathway Provider)</Label>
                          <Select
                            value={formData.indirectPartnerId || ""}
                            onValueChange={v => setFormData({ ...formData, indirectPartnerId: v || null })}
                          >
                            <SelectTrigger data-testid="select-indirect-partner"><SelectValue placeholder="Select partner account" /></SelectTrigger>
                            <SelectContent>
                              {partnerAccounts.map(p => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name} ({ACCOUNT_TYPE_LABELS[p.accountType]})
                                </SelectItem>
                              ))}
                              {partnerAccounts.length === 0 && (
                                <SelectItem value="__none__" disabled>No super agents or pathway providers yet</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Contact info */}
            <Card>
              <CardContent className="pt-5 pb-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">Contact Information</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Primary Contact</Label>
                    <ContactPicker
                      value={primaryContact}
                      onChange={setPrimaryContact}
                    />
                    <p className="text-xs text-muted-foreground">Link to a CRM contact — Provider's Rep contacts shown by default.</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Organisation Email</Label>
                    <Input
                      type="email"
                      value={formData.email || ""}
                      onChange={e => setFormData({ ...formData, email: e.target.value || null })}
                      placeholder="contact@example.com"
                      data-testid="input-account-email"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Organisation Phone</Label>
                    <Input
                      value={formData.phone || ""}
                      onChange={e => setFormData({ ...formData, phone: e.target.value || null })}
                      placeholder="+61 3 9000 0000"
                      data-testid="input-account-phone"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Website</Label>
                    <Input
                      value={formData.website || ""}
                      onChange={e => setFormData({ ...formData, website: e.target.value || null })}
                      placeholder="https://example.com"
                      data-testid="input-account-website"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location */}
            <Card>
              <CardContent className="pt-5 pb-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">Location</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Country</Label>
                    <Input
                      value={formData.country || ""}
                      onChange={e => setFormData({ ...formData, country: e.target.value || null })}
                      placeholder="Australia"
                      data-testid="input-account-country"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>City</Label>
                    <Input
                      value={formData.city || ""}
                      onChange={e => setFormData({ ...formData, city: e.target.value || null })}
                      placeholder="Melbourne"
                      data-testid="input-account-city"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Address</Label>
                    <Input
                      value={formData.address || ""}
                      onChange={e => setFormData({ ...formData, address: e.target.value || null })}
                      placeholder="Street address"
                      data-testid="input-account-address"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Other */}
            <Card>
              <CardContent className="pt-5 pb-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">Other</p>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Logo</Label>
                    {isInstitutionWithCmsLink ? (
                      <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50 border">
                        <Avatar className="h-9 w-9 rounded-md shrink-0">
                          <AvatarImage src={formData.logoUrl || ""} alt="" />
                          <AvatarFallback className="rounded-md text-xs font-semibold bg-muted">
                            {accountInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Link2 className="h-3.5 w-3.5 shrink-0" />
                          <span>Logo inherited from linked institution</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 rounded-md shrink-0">
                          <AvatarImage src={formData.logoUrl || ""} alt="" />
                          <AvatarFallback className="rounded-md text-xs font-semibold bg-muted">
                            {accountInitials}
                          </AvatarFallback>
                        </Avatar>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={logoUploading}
                          data-testid="button-upload-logo"
                        >
                          {logoUploading ? (
                            <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Uploading…</>
                          ) : (
                            <><Upload className="h-3.5 w-3.5 mr-1.5" />{formData.logoUrl ? "Change Logo" : "Upload Logo"}</>
                          )}
                        </Button>
                        {formData.logoUrl && !logoUploading && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setFormData(f => ({ ...f, logoUrl: null }))}
                            data-testid="button-remove-logo"
                            title="Remove logo"
                          >
                            <X className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Notes</Label>
                    <Textarea
                      value={formData.notes || ""}
                      onChange={e => setFormData({ ...formData, notes: e.target.value || null })}
                      placeholder="Any relevant notes…"
                      rows={3}
                      data-testid="textarea-account-notes"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={formData.isActive !== false}
                      onCheckedChange={v => setFormData({ ...formData, isActive: v })}
                      id="account-active"
                      data-testid="switch-account-active"
                    />
                    <Label htmlFor="account-active">Active</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Products tab ─────────────────────────────────────────────── */}
          {showProducts && !isNew && (
            <TabsContent value="products" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {formData.accountType === "insurance_company" ? "Insurance products" : "Visa products"} offered by this account
                </p>
                {!addingProduct && (
                  <Button size="sm" variant="outline" onClick={() => {
                    setAddingProduct(true);
                    setNewProduct(emptyProduct(formData.accountType === "migration_agent" ? "visa" : "insurance"));
                  }} data-testid="button-add-product">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Product
                  </Button>
                )}
              </div>

              {addingProduct && (
                <Card>
                  <CardContent className="pt-4 pb-4 space-y-3">
                    <p className="text-sm font-medium">New Product</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>Product Name *</Label>
                        <Input
                          value={newProduct.name || ""}
                          onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                          placeholder={formData.accountType === "migration_agent" ? "e.g. Student Visa 500" : "e.g. OSHC 12 months"}
                          data-testid="input-product-name"
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>Description</Label>
                        <Input
                          value={newProduct.description || ""}
                          onChange={e => setNewProduct({ ...newProduct, description: e.target.value || null })}
                          placeholder="Optional description"
                          data-testid="input-product-description"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Student Price (AUD)</Label>
                        <Input
                          type="number" step="0.01"
                          value={newProduct.studentPrice || ""}
                          onChange={e => setNewProduct({ ...newProduct, studentPrice: e.target.value || null })}
                          placeholder="0.00"
                          data-testid="input-product-student-price"
                        />
                      </div>
                      {formData.accountType === "migration_agent" && (
                        <div className="space-y-1.5">
                          <Label>Agent Cost (what ANZ pays)</Label>
                          <Input
                            type="number" step="0.01"
                            value={newProduct.agentCost || ""}
                            onChange={e => setNewProduct({ ...newProduct, agentCost: e.target.value || null })}
                            placeholder="0.00"
                            data-testid="input-product-agent-cost"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => addProductMutation.mutate()} disabled={!newProduct.name || addProductMutation.isPending} data-testid="button-save-product">
                        <Check className="h-3.5 w-3.5 mr-1" /> Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setAddingProduct(false)} data-testid="button-cancel-product">
                        <X className="h-3.5 w-3.5 mr-1" /> Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {products.length === 0 && !addingProduct ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No products yet. Click "Add Product" to add one.
                </div>
              ) : (
                <div className="space-y-2">
                  {products.map(product => (
                    <Card key={product.id} data-testid={`card-product-${product.id}`}>
                      <CardContent className="pt-3 pb-3">
                        {editingProduct?.id === product.id ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1 sm:col-span-2">
                                <Label>Name</Label>
                                <Input
                                  value={editingProduct.name}
                                  onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                                  data-testid="input-edit-product-name"
                                />
                              </div>
                              <div className="space-y-1 sm:col-span-2">
                                <Label>Description</Label>
                                <Input
                                  value={editingProduct.description || ""}
                                  onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value || null })}
                                  data-testid="input-edit-product-desc"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label>Student Price</Label>
                                <Input
                                  type="number" step="0.01"
                                  value={editingProduct.studentPrice || ""}
                                  onChange={e => setEditingProduct({ ...editingProduct, studentPrice: e.target.value || null })}
                                  data-testid="input-edit-student-price"
                                />
                              </div>
                              {formData.accountType === "migration_agent" && (
                                <div className="space-y-1">
                                  <Label>Agent Cost</Label>
                                  <Input
                                    type="number" step="0.01"
                                    value={editingProduct.agentCost || ""}
                                    onChange={e => setEditingProduct({ ...editingProduct, agentCost: e.target.value || null })}
                                    data-testid="input-edit-agent-cost"
                                  />
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => editProductMutation.mutate(editingProduct)} disabled={editProductMutation.isPending} data-testid="button-update-product">
                                <Check className="h-3.5 w-3.5 mr-1" /> Update
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingProduct(null)}>
                                <X className="h-3.5 w-3.5 mr-1" /> Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium">{product.name}</p>
                              {product.description && <p className="text-xs text-muted-foreground mt-0.5">{product.description}</p>}
                              <div className="flex gap-3 mt-1.5">
                                {product.studentPrice && (
                                  <span className="text-xs text-muted-foreground">Student: <strong className="text-foreground">${product.studentPrice}</strong></span>
                                )}
                                {product.agentCost && (
                                  <span className="text-xs text-muted-foreground">Agent cost: <strong className="text-foreground">${product.agentCost}</strong></span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button size="icon" variant="ghost" onClick={() => setEditingProduct({ ...product })} data-testid={`button-edit-product-${product.id}`}>
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => deleteProductMutation.mutate(product.id)} disabled={deleteProductMutation.isPending} data-testid={`button-delete-product-${product.id}`}>
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          )}

          {/* ── Contract & Banking tab ────────────────────────────────────── */}
          <TabsContent value="banking" className="space-y-4">
            <Card>
              <CardContent className="pt-5 pb-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">Banking &amp; Contract</p>
                <p className="text-sm text-muted-foreground mb-5">Banking and contract information for internal reference.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Bank Name</Label>
                    <Input
                      value={restrictedData.bankName || ""}
                      onChange={e => setRestrictedData({ ...restrictedData, bankName: e.target.value || null })}
                      placeholder="Commonwealth Bank"
                      data-testid="input-bank-name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Account Holder Name</Label>
                    <Input
                      value={restrictedData.accountHolderName || ""}
                      onChange={e => setRestrictedData({ ...restrictedData, accountHolderName: e.target.value || null })}
                      placeholder="Business legal name"
                      data-testid="input-account-holder"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Account Number</Label>
                    <Input
                      value={restrictedData.accountNumber || ""}
                      onChange={e => setRestrictedData({ ...restrictedData, accountNumber: e.target.value || null })}
                      placeholder="12345678"
                      data-testid="input-account-number"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>BSB</Label>
                    <Input
                      value={restrictedData.bsb || ""}
                      onChange={e => setRestrictedData({ ...restrictedData, bsb: e.target.value || null })}
                      placeholder="063-000"
                      data-testid="input-bsb"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>SWIFT Code</Label>
                    <Input
                      value={restrictedData.swiftCode || ""}
                      onChange={e => setRestrictedData({ ...restrictedData, swiftCode: e.target.value || null })}
                      placeholder="CTBAAU2S"
                      data-testid="input-swift"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Contract Start Date</Label>
                    <Input
                      type="date"
                      value={restrictedData.contractStartDate || ""}
                      onChange={e => setRestrictedData({ ...restrictedData, contractStartDate: e.target.value || null })}
                      data-testid="input-contract-start"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Contract End Date</Label>
                    <Input
                      type="date"
                      value={restrictedData.contractEndDate || ""}
                      onChange={e => setRestrictedData({ ...restrictedData, contractEndDate: e.target.value || null })}
                      data-testid="input-contract-end"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Contract Notes</Label>
                    <Textarea
                      value={restrictedData.contractNotes || ""}
                      onChange={e => setRestrictedData({ ...restrictedData, contractNotes: e.target.value || null })}
                      placeholder="Any contract terms, conditions, or notes…"
                      rows={4}
                      data-testid="textarea-contract-notes"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
