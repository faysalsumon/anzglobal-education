import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Search, Edit, Building2, Globe, Phone, Mail,
  Trash2, Package, Landmark, ChevronRight, X, Check
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

interface Account {
  id: string;
  name: string;
  accountType: AccountType;
  providerType: string | null;
  contractType: string | null;
  indirectPartnerId: string | null;
  institutionCmsId: string | null;
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
  products?: AccountProduct[];
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

const FILTER_TABS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "institution", label: "Institution" },
  { value: "super_agent", label: "Super Agent" },
  { value: "sub_agent", label: "Sub Agent" },
  { value: "pathway_provider", label: "Pathway Provider" },
  { value: "insurance_company", label: "Insurance Company" },
  { value: "migration_agent", label: "Migration Agent" },
];

// ─── Empty form state ─────────────────────────────────────────────────────────

function emptyForm(): Partial<Account> {
  return {
    name: "",
    accountType: "institution",
    providerType: null,
    contractType: null,
    indirectPartnerId: null,
    institutionCmsId: null,
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
  return {
    productType: type,
    name: "",
    description: null,
    studentPrice: null,
    agentCost: null,
    isActive: true,
  };
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AdminAccountsPanel() {
  const { toast } = useToast();
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState<Partial<Account>>(emptyForm());
  const [restrictedData, setRestrictedData] = useState<Partial<RestrictedDetails>>(emptyRestricted());
  const [activeFormTab, setActiveFormTab] = useState("details");

  // Product add-row state
  const [addingProduct, setAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<AccountProduct>>(emptyProduct());
  const [editingProduct, setEditingProduct] = useState<AccountProduct | null>(null);

  // ─── Queries ────────────────────────────────────────────────────────────────

  const { data: allAccounts = [], isLoading } = useQuery<Account[]>({
    queryKey: ["/api/admin/accounts", typeFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/admin/accounts?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch accounts");
      return res.json();
    },
  });

  // Institutions from CMS for linking
  interface CmsInstitution { id: number; name: string; country: string | null; }
  const { data: cmsInstitutions = [] } = useQuery<CmsInstitution[]>({
    queryKey: ["/api/institutions"],
    queryFn: async () => {
      const res = await fetch("/api/institutions");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: dialogOpen && formData.accountType === "institution",
  });

  // Partners for indirect dropdown (super_agent + pathway_provider)
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

  // Restricted details for editing account
  const { data: restrictedFromApi } = useQuery<RestrictedDetails | null>({
    queryKey: ["/api/admin/accounts", editingAccount?.id, "restricted"],
    queryFn: async () => {
      if (!editingAccount?.id) return null;
      const res = await fetch(`/api/admin/accounts/${editingAccount.id}/restricted`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!editingAccount?.id && dialogOpen,
  });

  // Products for editing account
  const { data: products = [] } = useQuery<AccountProduct[]>({
    queryKey: ["/api/admin/accounts", editingAccount?.id, "products"],
    queryFn: async () => {
      if (!editingAccount?.id) return [];
      const res = await fetch(`/api/admin/accounts/${editingAccount.id}/products`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!editingAccount?.id && dialogOpen,
  });

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = { ...formData };
      if (formData.accountType !== "institution") {
        body.contractType = null;
        body.indirectPartnerId = null;
        body.providerType = null;
        body.institutionCmsId = null;
      }
      if (body.contractType !== "indirect") body.indirectPartnerId = null;

      if (editingAccount) {
        return apiRequest("PATCH", `/api/admin/accounts/${editingAccount.id}`, body);
      } else {
        return apiRequest("POST", "/api/admin/accounts", body);
      }
    },
    onSuccess: async (res: any) => {
      const saved = await res.json();
      // Save restricted details too
      await apiRequest("PUT", `/api/admin/accounts/${saved.id}/restricted`, restrictedData);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/accounts"] });
      toast({ title: editingAccount ? "Account updated" : "Account created" });
      setDialogOpen(false);
    },
    onError: () => toast({ title: "Failed to save account", variant: "destructive" }),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/accounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/accounts"] });
      toast({ title: "Account deactivated" });
    },
    onError: () => toast({ title: "Failed to deactivate", variant: "destructive" }),
  });

  const addProductMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/admin/accounts/${editingAccount!.id}/products`, newProduct),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/accounts", editingAccount?.id, "products"] });
      setAddingProduct(false);
      setNewProduct(emptyProduct(formData.accountType === "migration_agent" ? "visa" : "insurance"));
      toast({ title: "Product added" });
    },
    onError: () => toast({ title: "Failed to add product", variant: "destructive" }),
  });

  const editProductMutation = useMutation({
    mutationFn: (p: AccountProduct) =>
      apiRequest("PATCH", `/api/admin/accounts/${editingAccount!.id}/products/${p.id}`, p),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/accounts", editingAccount?.id, "products"] });
      setEditingProduct(null);
      toast({ title: "Product updated" });
    },
    onError: () => toast({ title: "Failed to update product", variant: "destructive" }),
  });

  const deleteProductMutation = useMutation({
    mutationFn: (productId: string) =>
      apiRequest("DELETE", `/api/admin/accounts/${editingAccount!.id}/products/${productId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/accounts", editingAccount?.id, "products"] });
      toast({ title: "Product removed" });
    },
    onError: () => toast({ title: "Failed to remove product", variant: "destructive" }),
  });

  // ─── Handlers ───────────────────────────────────────────────────────────────

  function openCreate() {
    setEditingAccount(null);
    setFormData(emptyForm());
    setRestrictedData(emptyRestricted());
    setActiveFormTab("details");
    setAddingProduct(false);
    setEditingProduct(null);
    setDialogOpen(true);
  }

  function openEdit(account: Account) {
    setEditingAccount(account);
    setFormData({ ...account });
    setRestrictedData(emptyRestricted());
    setActiveFormTab("details");
    setAddingProduct(false);
    setEditingProduct(null);
    setDialogOpen(true);
  }

  // Sync restricted details when loaded from API
  if (restrictedFromApi && editingAccount && dialogOpen) {
    // Only update if values differ to avoid infinite re-render
    const keys = Object.keys(restrictedFromApi) as (keyof RestrictedDetails)[];
    const differs = keys.some(k => restrictedData[k] !== restrictedFromApi![k]);
    if (differs) setRestrictedData({ ...restrictedFromApi });
  }

  const showProducts = formData.accountType === "insurance_company" || formData.accountType === "migration_agent";

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Accounts</h2>
          <p className="text-sm text-muted-foreground">B2B partner registry — institutions, agents, insurance &amp; migration</p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-account">
          <Plus className="h-4 w-4 mr-1" /> Add Account
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by name, email, country…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-accounts-search"
          />
        </div>
      </div>

      {/* Type filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {FILTER_TABS.map(tab => (
          <Button
            key={tab.value}
            variant={typeFilter === tab.value ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter(tab.value)}
            data-testid={`filter-${tab.value}`}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Account list */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : allAccounts.length === 0 ? (
        <Card>
          <CardContent className="pt-10 pb-10 text-center">
            <Building2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">No accounts found.</p>
            <Button className="mt-4" onClick={openCreate}>Add your first account</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allAccounts.map(account => (
            <Card key={account.id} className="hover-elevate" data-testid={`card-account-${account.id}`}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 rounded-md shrink-0">
                    <AvatarImage src={account.logoUrl || ""} alt={account.name} />
                    <AvatarFallback className="rounded-md text-sm font-semibold">
                      {account.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm leading-tight truncate">{account.name}</p>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="shrink-0 -mt-1 -mr-1"
                        onClick={() => openEdit(account)}
                        data-testid={`button-edit-account-${account.id}`}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-1 ${ACCOUNT_TYPE_COLORS[account.accountType]}`}>
                      {ACCOUNT_TYPE_LABELS[account.accountType]}
                      {account.providerType ? ` · ${account.providerType}` : ""}
                    </span>
                    <div className="mt-2 space-y-1">
                      {account.country && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Globe className="h-3 w-3 shrink-0" />
                          <span className="truncate">{account.city ? `${account.city}, ` : ""}{account.country}</span>
                        </div>
                      )}
                      {account.email && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate">{account.email}</span>
                        </div>
                      )}
                      {account.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3 shrink-0" />
                          <span>{account.phone}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant={account.isActive ? "default" : "secondary"} className="text-xs">
                        {account.isActive ? "Active" : "Inactive"}
                      </Badge>
                      {account.contractType && (
                        <Badge variant="outline" className="text-xs capitalize">{account.contractType}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAccount ? "Edit Account" : "Add Account"}</DialogTitle>
          </DialogHeader>

          <Tabs value={activeFormTab} onValueChange={setActiveFormTab}>
            <TabsList className="w-full">
              <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
              {(showProducts && editingAccount) && (
                <TabsTrigger value="products" className="flex-1">Products</TabsTrigger>
              )}
              <TabsTrigger value="banking" className="flex-1">Contract &amp; Banking</TabsTrigger>
            </TabsList>

            {/* ── Details tab ─────────────────────────────────────────────── */}
            <TabsContent value="details" className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="account-name">Account Name *</Label>
                  <Input
                    id="account-name"
                    value={formData.name || ""}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Swinburne University"
                    data-testid="input-account-name"
                  />
                </div>

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

                {/* Institution-specific fields */}
                {formData.accountType === "institution" && (
                  <>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Link to Institution (CMS)</Label>
                      <Select
                        value={formData.institutionCmsId || ""}
                        onValueChange={v => setFormData({ ...formData, institutionCmsId: v || null })}
                      >
                        <SelectTrigger data-testid="select-institution-cms">
                          <SelectValue placeholder="Search and select institution…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">— None —</SelectItem>
                          {cmsInstitutions.map(inst => (
                            <SelectItem key={inst.id} value={String(inst.id)}>
                              {inst.name}{inst.country ? ` (${inst.country})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Optionally links this account to an institution in the course catalogue.</p>
                    </div>

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

                <div className="space-y-1.5">
                  <Label>Contact Name</Label>
                  <Input
                    value={formData.contactName || ""}
                    onChange={e => setFormData({ ...formData, contactName: e.target.value || null })}
                    placeholder="Primary contact person"
                    data-testid="input-contact-name"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email || ""}
                    onChange={e => setFormData({ ...formData, email: e.target.value || null })}
                    placeholder="contact@example.com"
                    data-testid="input-account-email"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input
                    value={formData.phone || ""}
                    onChange={e => setFormData({ ...formData, phone: e.target.value || null })}
                    placeholder="+61 3 9000 0000"
                    data-testid="input-account-phone"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Website</Label>
                  <Input
                    value={formData.website || ""}
                    onChange={e => setFormData({ ...formData, website: e.target.value || null })}
                    placeholder="https://example.com"
                    data-testid="input-account-website"
                  />
                </div>

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

                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Logo URL</Label>
                  <Input
                    value={formData.logoUrl || ""}
                    onChange={e => setFormData({ ...formData, logoUrl: e.target.value || null })}
                    placeholder="https://example.com/logo.png"
                    data-testid="input-account-logo"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes || ""}
                    onChange={e => setFormData({ ...formData, notes: e.target.value || null })}
                    placeholder="Any relevant notes…"
                    rows={3}
                    data-testid="textarea-account-notes"
                  />
                </div>

                <div className="flex items-center gap-3 sm:col-span-2">
                  <Switch
                    checked={formData.isActive !== false}
                    onCheckedChange={v => setFormData({ ...formData, isActive: v })}
                    id="account-active"
                    data-testid="switch-account-active"
                  />
                  <Label htmlFor="account-active">Active</Label>
                </div>
              </div>
            </TabsContent>

            {/* ── Products tab ─────────────────────────────────────────────── */}
            {(showProducts && editingAccount) && (
              <TabsContent value="products" className="mt-4 space-y-4">
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

                {/* Add product row */}
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
                            type="number"
                            step="0.01"
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
                              type="number"
                              step="0.01"
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

                {/* Products list */}
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
                                    type="number"
                                    step="0.01"
                                    value={editingProduct.studentPrice || ""}
                                    onChange={e => setEditingProduct({ ...editingProduct, studentPrice: e.target.value || null })}
                                    data-testid="input-edit-student-price"
                                  />
                                </div>
                                {formData.accountType === "migration_agent" && (
                                  <div className="space-y-1">
                                    <Label>Agent Cost</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
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
            <TabsContent value="banking" className="mt-4 space-y-4">
              <p className="text-sm text-muted-foreground">Banking and contract information for internal reference.</p>
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
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4 flex-wrap gap-2">
            {editingAccount && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  deactivateMutation.mutate(editingAccount.id);
                  setDialogOpen(false);
                }}
                disabled={deactivateMutation.isPending}
                data-testid="button-deactivate-account"
              >
                Deactivate
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-account">Cancel</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={!formData.name || saveMutation.isPending} data-testid="button-save-account">
                {saveMutation.isPending ? "Saving…" : editingAccount ? "Save Changes" : "Create Account"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
