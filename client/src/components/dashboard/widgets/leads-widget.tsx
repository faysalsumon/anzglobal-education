import { useQuery } from "@tanstack/react-query";
import { WidgetCard } from "../widget-card";
import { CompactTable, StatusBadge } from "../compact-table";
import { Button } from "@/components/ui/button";
import { UserPlus, ExternalLink, Mail, Phone, User } from "lucide-react";
import { useState } from "react";

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  status: string;
  leadSource?: string;
  assignedTo?: {
    id: string;
    name: string;
  };
  createdAt?: string;
}

interface LeadsWidgetProps {
  title?: string;
  viewType?: "all" | "open";
  onViewAll?: () => void;
  onRowClick?: (lead: Lead) => void;
  className?: string;
}

export function LeadsWidget({
  title = "All Leads (CRM)",
  viewType = "all",
  onViewAll,
  onRowClick,
  className,
}: LeadsWidgetProps) {
  const [filter, setFilter] = useState("all");

  const { data, isLoading } = useQuery<{ leads: Lead[] }>({
    queryKey: ["/api/crm/leads"],
  });

  const leads = data?.leads || [];

  const filteredLeads = leads.filter((lead) => {
    if (filter === "all") return true;
    return lead.status?.toLowerCase() === filter;
  });

  const columns = [
    {
      key: "owner",
      header: "Lead Owner",
      render: (lead: Lead) =>
        lead.assignedTo ? (
          <div className="flex items-center gap-1">
            <User className="h-3 w-3 text-muted-foreground" />
            <span className="text-primary hover:underline cursor-pointer">
              {lead.assignedTo.name}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground">Unassigned</span>
        ),
    },
    {
      key: "email",
      header: "Email",
      render: (lead: Lead) =>
        lead.email ? (
          <a
            href={`mailto:${lead.email}`}
            className="text-primary hover:underline flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {lead.email}
          </a>
        ) : (
          "-"
        ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (lead: Lead) =>
        lead.phone ? (
          <a
            href={`tel:${lead.phone}`}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {lead.phone}
          </a>
        ) : (
          "-"
        ),
    },
    {
      key: "source",
      header: "Lead Source",
      render: (lead: Lead) => lead.leadSource || "Direct",
    },
    {
      key: "name",
      header: "Lead Name",
      render: (lead: Lead) => (
        <span className="font-medium">
          {lead.firstName} {lead.lastName}
        </span>
      ),
    },
  ];

  const filterOptions = [
    { value: "all", label: "All Open Leads" },
    { value: "new", label: "New" },
    { value: "contacted", label: "Contacted" },
    { value: "qualified", label: "Qualified" },
  ];

  return (
    <WidgetCard
      title={title}
      icon={<UserPlus className="h-4 w-4" />}
      isLoading={isLoading}
      isEmpty={filteredLeads.length === 0}
      emptyIcon={<UserPlus className="h-10 w-10" />}
      emptyMessage="No leads found"
      headerDropdown={{
        label: "Filter",
        options: filterOptions,
        value: filter,
        onChange: setFilter,
      }}
      actions={
        onViewAll && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onViewAll}>
            View All
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        )
      }
      noPadding
      className={className}
      data-testid="leads-widget"
    >
      <CompactTable
        columns={columns}
        data={filteredLeads.slice(0, 5)}
        keyExtractor={(lead) => lead.id}
        onRowClick={onRowClick}
        density="compact"
      />
    </WidgetCard>
  );
}
