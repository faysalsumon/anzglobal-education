import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  TrendingUp,
  CheckCircle2,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CalendarIcon,
  Target,
  FileText,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths } from "date-fns";
import { cn } from "@/lib/utils";

interface KpiMember {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  profileImageUrl: string | null;
  role: string | null;
  leadsAdded: number;
  appsEnrolled: number;
  tasksCompleted: number;
  tasksAssigned: number;
}

type SortKey = "name" | "leadsAdded" | "appsEnrolled" | "tasksCompleted" | "completionRate";
type SortDir = "asc" | "desc";

function getQuarterRange(q: 1 | 2 | 3 | 4): { from: Date; to: Date } {
  const now = new Date();
  const year = now.getFullYear();
  const startMonth = (q - 1) * 3;
  const from = new Date(year, startMonth, 1);
  const to = endOfMonth(new Date(year, startMonth + 2, 1));
  return { from, to };
}

const PRESETS = [
  { label: "This Month", getRange: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: "Last Month", getRange: () => { const d = subMonths(new Date(), 1); return { from: startOfMonth(d), to: endOfMonth(d) }; } },
  { label: "Q1", getRange: () => getQuarterRange(1) },
  { label: "Q2", getRange: () => getQuarterRange(2) },
  { label: "Q3", getRange: () => getQuarterRange(3) },
  { label: "Q4", getRange: () => getQuarterRange(4) },
  { label: "This Year", getRange: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) }) },
];

function getInitials(firstName?: string | null, lastName?: string | null, email?: string | null) {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
  if (firstName) return firstName.slice(0, 2).toUpperCase();
  if (email) return email.slice(0, 2).toUpperCase();
  return "??";
}

function getRoleLabel(role?: string | null) {
  const labels: Record<string, string> = {
    cto: "CTO",
    branch_manager: "Branch Manager",
    consultant: "Consultant",
    marketing_executive: "Marketing",
    admissions_director: "Admissions",
  };
  return labels[role || ""] || role || "Unknown";
}

function getMemberName(m: KpiMember) {
  if (m.firstName && m.lastName) return `${m.firstName} ${m.lastName}`;
  if (m.firstName) return m.firstName;
  return m.email || "Unknown";
}

function completionRate(m: KpiMember) {
  if (m.tasksAssigned === 0) return 0;
  return Math.round((m.tasksCompleted / m.tasksAssigned) * 100);
}

function escapeCsvField(value: string | number): string {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function exportCsv(members: KpiMember[], from: Date, to: Date) {
  const header = ["Name", "Role", "Leads Added", "Apps Enrolled", "Tasks Completed", "Tasks Assigned", "Completion Rate (%)"];
  const rows = members.map((m) => [
    getMemberName(m),
    getRoleLabel(m.role),
    m.leadsAdded,
    m.appsEnrolled,
    m.tasksCompleted,
    m.tasksAssigned,
    completionRate(m),
  ]);
  const csvContent = [header, ...rows]
    .map((r) => r.map(escapeCsvField).join(","))
    .join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kpi-report-${format(from, "yyyy-MM-dd")}-to-${format(to, "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function KpiDashboardPanel() {
  const [activePreset, setActivePreset] = useState("This Month");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(() => ({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  }));
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [customOpen, setCustomOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const { data: members = [], isLoading, isError, error } = useQuery<KpiMember[]>({
    queryKey: ["/api/kpi/team-report", dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams({
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
      });
      const res = await fetch(`/api/kpi/team-report?${params}`, { credentials: "include" });
      if (res.status === 403) throw new Error("You do not have permission to view KPI reports.");
      if (!res.ok) throw new Error("Failed to fetch KPI report. Please try again.");
      return res.json();
    },
  });

  function handlePreset(label: string, getRange: () => { from: Date; to: Date }) {
    setActivePreset(label);
    setDateRange(getRange());
  }

  function handleCustomApply() {
    if (customFrom && customTo) {
      setActivePreset("Custom");
      setDateRange({ from: customFrom, to: customTo });
      setCustomOpen(false);
    }
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      let av: number | string = 0;
      let bv: number | string = 0;
      if (sortKey === "name") {
        av = getMemberName(a).toLowerCase();
        bv = getMemberName(b).toLowerCase();
      } else if (sortKey === "completionRate") {
        av = completionRate(a);
        bv = completionRate(b);
      } else {
        av = a[sortKey];
        bv = b[sortKey];
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [members, sortKey, sortDir]);

  const chartData = useMemo(() => {
    return members.map((m) => ({
      name: m.firstName || m.email?.split("@")[0] || "?",
      "Leads Added": m.leadsAdded,
      "Apps Enrolled": m.appsEnrolled,
      "Tasks Completed": m.tasksCompleted,
    }));
  }, [members]);

  const totalLeads = members.reduce((s, m) => s + m.leadsAdded, 0);
  const totalApps = members.reduce((s, m) => s + m.appsEnrolled, 0);
  const totalTasksDone = members.reduce((s, m) => s + m.tasksCompleted, 0);

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ArrowUpDown className="h-3 w-3 ml-1 text-muted-foreground" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => <Skeleton key={p.label} className="h-9 w-24" />)}
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-16" /></CardContent>
            </Card>
          ))}
        </div>
        <Card><CardContent className="pt-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Target className="h-12 w-12 mx-auto mb-3 text-destructive opacity-60" />
          <p className="font-medium text-destructive">Failed to load KPI data</p>
          <p className="text-sm text-muted-foreground mt-1">
            {error instanceof Error ? error.message : "An unexpected error occurred. Please try again."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <Button
            key={p.label}
            variant={activePreset === p.label ? "default" : "outline"}
            size="sm"
            data-testid={`kpi-preset-${p.label.toLowerCase().replace(/\s+/g, "-")}`}
            onClick={() => handlePreset(p.label, p.getRange)}
          >
            {p.label}
          </Button>
        ))}

        <Popover open={customOpen} onOpenChange={setCustomOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={activePreset === "Custom" ? "default" : "outline"}
              size="sm"
              data-testid="kpi-preset-custom"
            >
              <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
              {activePreset === "Custom"
                ? `${format(dateRange.from, "dd MMM")} — ${format(dateRange.to, "dd MMM")}`
                : "Custom"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4 space-y-4" align="start">
            <div className="space-y-2">
              <p className="text-sm font-medium">From</p>
              <Calendar
                mode="single"
                selected={customFrom}
                onSelect={setCustomFrom}
                initialFocus
              />
              <p className="text-sm font-medium">To</p>
              <Calendar
                mode="single"
                selected={customTo}
                onSelect={setCustomTo}
                disabled={(d) => customFrom ? d < customFrom : false}
              />
            </div>
            <Button size="sm" className="w-full" onClick={handleCustomApply} disabled={!customFrom || !customTo}>
              Apply Range
            </Button>
          </PopoverContent>
        </Popover>

        <span className="text-sm text-muted-foreground ml-1">
          {format(dateRange.from, "d MMM yyyy")} — {format(dateRange.to, "d MMM yyyy")}
        </span>

        <div className="ml-auto">
          <Button
            variant="outline"
            size="sm"
            data-testid="kpi-export-csv"
            onClick={() => exportCsv(sortedMembers, dateRange.from, dateRange.to)}
            disabled={members.length === 0}
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads Added</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="kpi-total-leads">{totalLeads}</div>
            <p className="text-xs text-muted-foreground">Across all consultants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Apps Enrolled</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="kpi-total-apps">{totalApps}</div>
            <p className="text-xs text-muted-foreground">Reached Application Won stage</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="kpi-total-tasks">{totalTasksDone}</div>
            <p className="text-xs text-muted-foreground">In selected period</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-member table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Individual Performance
          </CardTitle>
          <CardDescription>
            Click column headers to sort. Completion Rate = tasks completed ÷ tasks assigned.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No data for this period</p>
              <p className="text-sm">Try a different date range or check that team members have been added.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <button
                        className="flex items-center text-left font-medium hover:text-foreground"
                        onClick={() => toggleSort("name")}
                        data-testid="kpi-sort-name"
                      >
                        Member <SortIcon k="name" />
                      </button>
                    </TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">
                      <button
                        className="flex items-center justify-end w-full font-medium hover:text-foreground"
                        onClick={() => toggleSort("leadsAdded")}
                        data-testid="kpi-sort-leads"
                      >
                        Leads Added <SortIcon k="leadsAdded" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button
                        className="flex items-center justify-end w-full font-medium hover:text-foreground"
                        onClick={() => toggleSort("appsEnrolled")}
                        data-testid="kpi-sort-apps"
                      >
                        Apps Enrolled <SortIcon k="appsEnrolled" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button
                        className="flex items-center justify-end w-full font-medium hover:text-foreground"
                        onClick={() => toggleSort("tasksCompleted")}
                        data-testid="kpi-sort-tasks"
                      >
                        Tasks Completed <SortIcon k="tasksCompleted" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button
                        className="flex items-center justify-end w-full font-medium hover:text-foreground"
                        onClick={() => toggleSort("completionRate")}
                        data-testid="kpi-sort-rate"
                      >
                        Completion Rate <SortIcon k="completionRate" />
                      </button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedMembers.map((m) => {
                    const rate = completionRate(m);
                    return (
                      <TableRow key={m.userId} data-testid={`kpi-row-${m.userId}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={m.profileImageUrl || undefined} />
                              <AvatarFallback className="text-xs">
                                {getInitials(m.firstName, m.lastName, m.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{getMemberName(m)}</p>
                              <p className="text-xs text-muted-foreground">{m.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getRoleLabel(m.role)}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium" data-testid={`kpi-leads-${m.userId}`}>
                          {m.leadsAdded}
                        </TableCell>
                        <TableCell className="text-right font-medium" data-testid={`kpi-apps-${m.userId}`}>
                          {m.appsEnrolled}
                        </TableCell>
                        <TableCell className="text-right font-medium" data-testid={`kpi-tasks-${m.userId}`}>
                          {m.tasksCompleted}
                          {m.tasksAssigned > 0 && (
                            <span className="text-xs text-muted-foreground ml-1">/ {m.tasksAssigned}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right" data-testid={`kpi-rate-${m.userId}`}>
                          <Badge
                            variant={rate >= 80 ? "default" : rate >= 50 ? "secondary" : "outline"}
                            className={cn(
                              rate >= 80 && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
                              rate >= 50 && rate < 80 && "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
                              rate < 50 && "text-muted-foreground"
                            )}
                          >
                            {rate}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bar chart */}
      {members.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Team Metrics Comparison
            </CardTitle>
            <CardDescription>All three KPIs per team member side-by-side</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                />
                <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "6px",
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                    color: "hsl(var(--card-foreground))",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Leads Added" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Apps Enrolled" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Tasks Completed" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
