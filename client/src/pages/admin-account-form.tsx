import { useState, useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Save, Loader2, Plus, X, Check,
  Package, Trash2, Edit, ImageIcon, UserRound, ChevronsUpDown, ExternalLink
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

  const { data: results = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/crm/contacts", "picker", search],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "20" });
      if (search) params.set("search", search);
      else params.set("type", "providers_rep");
      const res = await fetch(`/api/crm/contacts?${params}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.contacts ?? data;
    },
    staleTime: 10_000,
  });

  const contacts: CrmContactSummary[] = results.map((r: any) => {
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

  if (value) {
    const initials = `${value.firstName[0] ?? ""}${value.lastName[0] ?? ""}`.toUpperCase();
    return (
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
    );
  }

  return (
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
              onClick={() => { window.open("/admin?tab=crm&new=contact&contactType=providers_rep", "_blank"); setOpen(false); }}
              data-testid="button-new-contact-from-picker"
            >
              <Plus className="h-3.5 w-3.5 mr-2" /> Create new contact
            </Button>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
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
  const [logoEditMode, setLogoEditMode] = useState(false);
  const [logoInputVal, setLogoInputVal] = useState("");

  // Products state
  const [addingProduct, setAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<AccountProduct>>(emptyProduct());
  const [editingProduct, setEditingProduct] = useState<AccountProduct | null>(null);

  // ─── Queries ──────────────────────────────────────────────────────────────

  const { data: account, isLoading: accountLoading } = useQuery<Account>({
    queryKey: ["/api/admin/accounts", id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/accounts/${id}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !isNew,
  });

  const { data: restrictedFromApi } = useQuery<RestrictedDetails | null>({
    queryKey: ["/api/admin/accounts", id, "restricted"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/accounts/${id}/restricted`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !isNew,
  });

  const { data: products = [] } = useQuery<AccountProduct[]>({
    queryKey: ["/api/admin/accounts", id, "products"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/accounts/${id}/products`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !isNew,
  });

  interface CmsInstitution { id: number; name: string; country: string | null; }
  const { data: cmsInstitutions = [] } = useQuery<CmsInstitution[]>({
    queryKey: ["/api/institutions"],
    queryFn: async () => {
      const res = await fetch("/api/institutions");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: formData.accountType === "institution",
  });

  const { data: partnerAccounts = [] } = useQuery<Account[]>({
    queryKey: ["/api/admin/accounts", "partners"],
    queryFn: async () => {
      const [sa, pp] = await Promise.all([
        fetch("/api/admin/accounts/by-type/super_agent").then(r => r.json()),
        fetch("/api/admin/accounts/by-type/pathway_provider").then(r => r.json()),
      ]);
      return [...sa, ...pp];
    },
  });

  // ─── Sync loaded data into form ───────────────────────────────────────────

  useEffect(() => {
    if (account) {
      setFormData({ ...account });
      setLogoInputVal(account.logoUrl || "");
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

  function applyLogoUrl() {
    setFormData(f => ({ ...f, logoUrl: logoInputVal || null }));
    setLogoEditMode(false);
  }

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
              <button
                type="button"
                onClick={() => { setLogoInputVal(formData.logoUrl || ""); setLogoEditMode(true); }}
                className="absolute inset-0 flex items-center justify-center rounded-md bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                data-testid="button-edit-logo"
                title="Change logo"
              >
                <ImageIcon className="h-3.5 w-3.5 text-white" />
              </button>
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

        {/* Logo URL edit bar (slides in) */}
        {logoEditMode && (
          <div className="border-t bg-muted/50 px-4 sm:px-6 py-2">
            <div className="max-w-4xl mx-auto flex items-center gap-2">
              <p className="text-xs text-muted-foreground shrink-0">Logo URL</p>
              <Input
                value={logoInputVal}
                onChange={e => setLogoInputVal(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") applyLogoUrl(); if (e.key === "Escape") setLogoEditMode(false); }}
                placeholder="https://example.com/logo.png"
                className="h-7 text-xs flex-1"
                autoFocus
                data-testid="input-logo-url-inline"
              />
              <Button size="sm" onClick={applyLogoUrl} data-testid="button-apply-logo">Apply</Button>
              <Button size="sm" variant="ghost" onClick={() => setLogoEditMode(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </header>

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
                <button
                  type="button"
                  onClick={() => { setLogoInputVal(formData.logoUrl || ""); setLogoEditMode(true); }}
                  className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Change logo"
                >
                  <ImageIcon className="h-5 w-5 text-white" />
                </button>
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
                    <Label>Logo URL</Label>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 rounded-md shrink-0">
                        <AvatarImage src={formData.logoUrl || ""} alt="" />
                        <AvatarFallback className="rounded-md text-xs font-semibold bg-muted">
                          {accountInitials}
                        </AvatarFallback>
                      </Avatar>
                      <Input
                        value={formData.logoUrl || ""}
                        onChange={e => setFormData({ ...formData, logoUrl: e.target.value || null })}
                        placeholder="https://example.com/logo.png"
                        data-testid="input-account-logo"
                      />
                    </div>
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
