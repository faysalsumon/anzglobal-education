import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Clock,
  Users,
  TrendingUp,
  Activity,
  ChevronLeft,
  ChevronRight,
  X,
  Trash2,
  Loader2,
  ImageOff,
} from "lucide-react";

interface AttendanceRecord {
  id: string;
  userId: string;
  branchId: string | null;
  clockInAt: string;
  clockInPhotoPath: string;
  clockOutAt: string | null;
  clockOutPhotoPath: string | null;
  totalMinutes: number | null;
  workDate: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  profileImageUrl: string | null;
  branchName: string | null;
}

interface AttendanceStats {
  totalShifts: number;
  totalMinutes: number;
  avgMinutesPerDay: number;
  activeTodayCount: number;
}

interface AttendancePanelProps {
  hasFullAdminAccess: boolean;
  isCTO: boolean;
  userBranchId: string | null;
}

function formatMinutes(minutes: number | null): string {
  if (minutes == null) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getUserInitials(firstName: string | null, lastName: string | null, email: string | null): string {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
  if (email) return email.slice(0, 2).toUpperCase();
  return "?";
}

function getPhotoUrl(path: string, userId: string): string {
  const filename = path.split("/").pop();
  return `/api/public-storage/attendance-photos/${userId}/${filename}`;
}

function PhotoThumb({ src, alt, onClick, testId, title }: {
  src: string;
  alt: string;
  onClick: () => void;
  testId: string;
  title: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-shrink-0 h-9 w-9 rounded flex items-center justify-center hover-elevate"
      data-testid={testId}
      title={title}
    >
      {failed ? (
        <span className="flex items-center justify-center h-9 w-9 rounded bg-muted text-muted-foreground">
          <ImageOff className="h-4 w-4" />
        </span>
      ) : (
        <img
          src={src}
          alt={alt}
          className="h-9 w-9 object-cover rounded"
          onError={() => setFailed(true)}
        />
      )}
    </button>
  );
}

function getDefaultDateFrom(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function getDefaultDateTo(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AttendancePanel({ hasFullAdminAccess, isCTO, userBranchId }: AttendancePanelProps) {
  const { toast } = useToast();
  const [dateFrom, setDateFrom] = useState(getDefaultDateFrom());
  const [dateTo, setDateTo] = useState(getDefaultDateTo());
  const [filterUserId, setFilterUserId] = useState<string>("");
  const [filterBranchId, setFilterBranchId] = useState<string>("");
  const [page, setPage] = useState(1);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const filters = {
    dateFrom,
    dateTo,
    ...(filterUserId ? { userId: filterUserId } : {}),
    ...(filterBranchId ? { branchId: filterBranchId } : {}),
    page,
    limit: 20,
  };

  const { data: recordsData, isLoading: recordsLoading } = useQuery<{
    records: AttendanceRecord[];
    total: number;
    page: number;
    totalPages: number;
  }>({
    queryKey: ["/api/admin/attendance", filters],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<AttendanceStats>({
    queryKey: ["/api/admin/attendance/stats", { dateFrom, dateTo, ...(filterUserId ? { userId: filterUserId } : {}), ...(filterBranchId ? { branchId: filterBranchId } : {}) }],
  });

  const { data: usersData } = useQuery<{ id: string; firstName: string | null; lastName: string | null; email: string | null }[]>({
    queryKey: ["/api/admin/users"],
    enabled: hasFullAdminAccess || !!userBranchId,
  });

  const { data: branchesData } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/admin/branches"],
    enabled: hasFullAdminAccess,
  });

  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/attendance/cleanup");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Cleanup complete",
        description: `Deleted ${data.deletedRecords} records and ${data.deletedPhotos} photos older than 90 days.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/attendance/stats"] });
    },
    onError: (err: Error) => {
      toast({ title: "Cleanup failed", description: err.message, variant: "destructive" });
    },
  });

  const clearFilters = () => {
    setDateFrom(getDefaultDateFrom());
    setDateTo(getDefaultDateTo());
    setFilterUserId("");
    setFilterBranchId("");
    setPage(1);
  };

  const records = recordsData?.records ?? [];
  const totalPages = recordsData?.totalPages ?? 1;

  return (
    <div className="flex flex-col h-full p-4 md:p-6 gap-4 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-attendance-title">Attendance</h1>
          <p className="text-sm text-muted-foreground">Track team clock-in and clock-out records</p>
        </div>
        {isCTO && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => cleanupMutation.mutate()}
            disabled={cleanupMutation.isPending}
            className="text-destructive hover:text-destructive"
            data-testid="button-cleanup-old-photos"
          >
            {cleanupMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Cleanup Old Photos (3+ months)
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            <Card data-testid="card-total-shifts">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-md bg-primary/10 p-2 flex-shrink-0">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.totalShifts ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Total Shifts</p>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-total-hours">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-md bg-blue-500/10 p-2 flex-shrink-0">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatMinutes(stats?.totalMinutes ?? null)}</p>
                  <p className="text-xs text-muted-foreground">Total Hours</p>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-avg-hours">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-md bg-purple-500/10 p-2 flex-shrink-0">
                  <Users className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatMinutes(stats?.avgMinutesPerDay ?? null)}</p>
                  <p className="text-xs text-muted-foreground">Avg / Day</p>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-active-today">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-md bg-green-500/10 p-2 flex-shrink-0">
                  <Activity className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.activeTodayCount ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Active Now</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">From</label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="w-36 h-8 text-sm"
            data-testid="input-date-from"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">To</label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="w-36 h-8 text-sm"
            data-testid="input-date-to"
          />
        </div>
        {(hasFullAdminAccess || !!userBranchId) && usersData && usersData.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Team Member</label>
            <Select value={filterUserId} onValueChange={(v) => { setFilterUserId(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-44 h-8 text-sm" data-testid="select-filter-user">
                <SelectValue placeholder="All Members" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Members</SelectItem>
                {usersData.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.email ?? u.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {hasFullAdminAccess && branchesData && branchesData.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Branch</label>
            <Select value={filterBranchId} onValueChange={(v) => { setFilterBranchId(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-40 h-8 text-sm" data-testid="select-filter-branch">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branchesData.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-8 text-sm self-end"
          data-testid="button-clear-filters"
        >
          <X className="h-3 w-3 mr-1" />
          Clear
        </Button>
      </div>

      {/* Records Table */}
      <div className="flex-1 min-h-0">
        {recordsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-md" />
            ))}
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center" data-testid="status-empty-attendance">
            <div className="rounded-full bg-muted p-4 mb-3">
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="font-medium">No attendance records found</p>
            <p className="text-sm text-muted-foreground mt-1">No records match the selected filters</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left p-3 font-medium text-muted-foreground">Team Member</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Date</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Clock In</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Clock Out</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Hours</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Photos</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="border-b last:border-0 hover-elevate" data-testid={`row-attendance-${record.id}`}>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7 flex-shrink-0">
                          <AvatarImage
                            src={record.profileImageUrl ?? undefined}
                            alt={record.firstName ? `${record.firstName} ${record.lastName}` : (record.email ?? "")}
                          />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {getUserInitials(record.firstName, record.lastName, record.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium truncate" data-testid={`text-member-name-${record.id}`}>
                            {record.firstName && record.lastName
                              ? `${record.firstName} ${record.lastName}`
                              : record.email ?? "Unknown"}
                          </p>
                          {record.branchName && (
                            <p className="text-xs text-muted-foreground truncate">{record.branchName}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground hidden sm:table-cell" data-testid={`text-work-date-${record.id}`}>
                      {record.workDate}
                    </td>
                    <td className="p-3" data-testid={`text-clock-in-${record.id}`}>
                      {formatTime(record.clockInAt)}
                    </td>
                    <td className="p-3" data-testid={`text-clock-out-${record.id}`}>
                      {record.clockOutAt ? (
                        formatTime(record.clockOutAt)
                      ) : (
                        <Badge variant="secondary" className="text-green-600 bg-green-500/10">
                          Active
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 hidden md:table-cell" data-testid={`text-hours-${record.id}`}>
                      {formatMinutes(record.totalMinutes)}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <PhotoThumb
                          src={getPhotoUrl(record.clockInPhotoPath, record.userId)}
                          alt="Clock-in"
                          onClick={() => setLightboxUrl(getPhotoUrl(record.clockInPhotoPath, record.userId))}
                          testId={`img-clock-in-photo-${record.id}`}
                          title="Clock-in photo"
                        />
                        {record.clockOutPhotoPath && (
                          <PhotoThumb
                            src={getPhotoUrl(record.clockOutPhotoPath, record.userId)}
                            alt="Clock-out"
                            onClick={() => setLightboxUrl(getPhotoUrl(record.clockOutPhotoPath!, record.userId))}
                            testId={`img-clock-out-photo-${record.id}`}
                            title="Clock-out photo"
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 flex-shrink-0">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({recordsData?.total ?? 0} records)
          </p>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              data-testid="button-next-page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Lightbox */}
      <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
        <DialogContent className="max-w-lg p-2" aria-describedby={undefined}>
          {lightboxUrl && (
            <img
              src={lightboxUrl}
              alt="Attendance photo"
              className="w-full rounded-md"
              data-testid="img-lightbox-photo"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
