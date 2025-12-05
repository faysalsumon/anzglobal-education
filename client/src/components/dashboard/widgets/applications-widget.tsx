import { useQuery } from "@tanstack/react-query";
import { WidgetCard } from "../widget-card";
import { CompactTable, StageBadge } from "../compact-table";
import { Button } from "@/components/ui/button";
import { ClipboardList, ExternalLink, User } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

interface Application {
  id: string;
  applicationName?: string;
  amount?: number;
  stage: string;
  closingDate?: string;
  createdAt?: string;
  status?: string;
  student?: {
    id: string;
    name: string;
    email?: string;
  };
  course?: {
    id: string;
    title: string;
  };
  contactName?: string;
  assignedConsultant?: {
    id: string;
    name: string;
  };
}

interface ApplicationsWidgetProps {
  title?: string;
  apiEndpoint?: string;
  viewType?: "my" | "all";
  onViewAll?: () => void;
  onRowClick?: (application: Application) => void;
  className?: string;
}

export function ApplicationsWidget({
  title = "Open Applications",
  apiEndpoint = "/api/admin/applications",
  viewType = "all",
  onViewAll,
  onRowClick,
  className,
}: ApplicationsWidgetProps) {
  const [filter, setFilter] = useState("all");

  const { data, isLoading } = useQuery<{ applications: Array<{ application: Application }> }>({
    queryKey: [apiEndpoint],
  });

  const applications = data?.applications?.map((a) => a.application) || [];

  const filteredApplications = applications.filter((app) => {
    if (filter === "all") return true;
    return app.stage?.toLowerCase().replace(/[_\s]/g, "-") === filter;
  });

  const columns = [
    {
      key: "name",
      header: "Application Name",
      render: (app: Application) => (
        <span className="font-medium text-primary hover:underline cursor-pointer">
          {app.applicationName || app.id}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      render: (app: Application) =>
        app.amount ? `AUD ${app.amount.toLocaleString()}` : "-",
    },
    {
      key: "stage",
      header: "Stage",
      render: (app: Application) => <StageBadge stage={app.stage || "pending"} />,
    },
    {
      key: "closingDate",
      header: "Closing Date",
      render: (app: Application) =>
        app.closingDate
          ? format(new Date(app.closingDate), "dd/MM/yyyy")
          : app.createdAt
          ? format(new Date(app.createdAt), "dd/MM/yyyy")
          : "-",
    },
    {
      key: "contact",
      header: "Contact Name",
      render: (app: Application) =>
        app.student?.name || app.contactName || "-",
    },
  ];

  const filterOptions = [
    { value: "all", label: "All Open" },
    { value: "assessment", label: "Assessment" },
    { value: "documents-verification", label: "Documents" },
    { value: "offer-letter", label: "Offer Letter" },
    { value: "application-won", label: "Won" },
  ];

  return (
    <WidgetCard
      title={title}
      icon={<ClipboardList className="h-4 w-4" />}
      isLoading={isLoading}
      isEmpty={filteredApplications.length === 0}
      emptyIcon={<ClipboardList className="h-10 w-10" />}
      emptyMessage="No applications found"
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
      data-testid="applications-widget"
    >
      <CompactTable
        columns={columns}
        data={filteredApplications.slice(0, 5)}
        keyExtractor={(app) => app.id}
        onRowClick={onRowClick}
        density="compact"
      />
    </WidgetCard>
  );
}

interface MyDealsWidgetProps {
  onViewAll?: () => void;
  onRowClick?: (application: Application) => void;
  className?: string;
}

export function MyDealsWidget({ onViewAll, onRowClick, className }: MyDealsWidgetProps) {
  return (
    <ApplicationsWidget
      title="My Deals"
      viewType="my"
      onViewAll={onViewAll}
      onRowClick={onRowClick}
      className={className}
    />
  );
}
