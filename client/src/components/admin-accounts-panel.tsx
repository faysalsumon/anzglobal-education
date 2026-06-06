import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Edit, Building2, Globe, Phone, Mail } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type AccountType =
  | "institution"
  | "super_agent"
  | "sub_agent"
  | "pathway_provider"
  | "insurance_company"
  | "migration_agent";

interface Account {
  id: string;
  name: string;
  accountType: AccountType;
  providerType: string | null;
  contractType: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  logoUrl: string | null;
  isActive: boolean;
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

const FILTER_TABS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "institution", label: "Institution" },
  { value: "super_agent", label: "Super Agent" },
  { value: "sub_agent", label: "Sub Agent" },
  { value: "pathway_provider", label: "Pathway Provider" },
  { value: "insurance_company", label: "Insurance Company" },
  { value: "migration_agent", label: "Migration Agent" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminAccountsPanel() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");

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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Accounts</h2>
          <p className="text-sm text-muted-foreground">B2B partner registry — institutions, agents, insurance &amp; migration</p>
        </div>
        <Button onClick={() => setLocation("/admin/accounts/new")} data-testid="button-add-account">
          <Plus className="h-4 w-4 mr-1" /> Add Account
        </Button>
      </div>

      {/* Search */}
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
            <Button className="mt-4" onClick={() => setLocation("/admin/accounts/new")}>
              Add your first account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allAccounts.map(account => (
            <Card
              key={account.id}
              className="hover-elevate cursor-pointer"
              onClick={() => setLocation(`/admin/accounts/${account.id}`)}
              data-testid={`card-account-${account.id}`}
            >
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
                        onClick={e => { e.stopPropagation(); setLocation(`/admin/accounts/${account.id}`); }}
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
    </div>
  );
}
