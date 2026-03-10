import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { WebcamCaptureModal } from "@/components/webcam-capture-modal";
import { StatusPicker, STATUS_DOT_COLORS } from "@/components/status-picker";
import { Button } from "@/components/ui/button";
import { Loader2, Coffee } from "lucide-react";
import { cn } from "@/lib/utils";

interface AttendanceStatus {
  record: {
    id: string;
    clockInAt: string;
    totalMinutes?: number;
  } | null;
  clockedIn: boolean;
}

interface BreakStatus {
  clockedIn: boolean;
  onBreak: boolean;
  activeBreak: { id: string; breakStartAt: string } | null;
}

interface StatusData {
  availabilityStatus: string;
  customStatusText: string | null;
}

function formatElapsed(from: string): string {
  const ms = Date.now() - new Date(from).getTime();
  const totalMins = Math.floor(ms / 60000);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function formatWorked(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function ClockInButton() {
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [elapsed, setElapsed] = useState("");
  const [breakElapsed, setBreakElapsed] = useState("");
  const workIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const breakIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: statusData, isLoading } = useQuery<AttendanceStatus>({
    queryKey: ["/api/attendance/status"],
    refetchInterval: 60000,
  });

  const clockedIn = statusData?.clockedIn ?? false;
  const openRecord = statusData?.record ?? null;

  const { data: breakStatusData } = useQuery<BreakStatus>({
    queryKey: ["/api/attendance/break-status"],
    refetchInterval: 30000,
    enabled: clockedIn,
  });

  const { data: myStatus } = useQuery<StatusData>({
    queryKey: ["/api/admin/status"],
    enabled: clockedIn,
  });

  const onBreak = breakStatusData?.onBreak ?? false;
  const activeBreak = breakStatusData?.activeBreak ?? null;
  const currentAvailabilityStatus = myStatus?.availabilityStatus || "available";

  // Work elapsed timer
  useEffect(() => {
    if (clockedIn && openRecord?.clockInAt) {
      setElapsed(formatElapsed(openRecord.clockInAt));
      workIntervalRef.current = setInterval(() => {
        setElapsed(formatElapsed(openRecord.clockInAt));
      }, 60000);
    } else {
      if (workIntervalRef.current) clearInterval(workIntervalRef.current);
      setElapsed("");
    }
    return () => { if (workIntervalRef.current) clearInterval(workIntervalRef.current); };
  }, [clockedIn, openRecord?.clockInAt]);

  // Break elapsed timer
  useEffect(() => {
    if (onBreak && activeBreak?.breakStartAt) {
      setBreakElapsed(formatElapsed(activeBreak.breakStartAt));
      breakIntervalRef.current = setInterval(() => {
        setBreakElapsed(formatElapsed(activeBreak.breakStartAt));
      }, 30000);
    } else {
      if (breakIntervalRef.current) clearInterval(breakIntervalRef.current);
      setBreakElapsed("");
    }
    return () => { if (breakIntervalRef.current) clearInterval(breakIntervalRef.current); };
  }, [onBreak, activeBreak?.breakStartAt]);

  // Clock in / out mutation
  const clockMutation = useMutation({
    mutationFn: async (blob: Blob) => {
      const formData = new FormData();
      formData.append("photo", blob, "photo.jpg");
      const endpoint = clockedIn ? "/api/attendance/clock-out" : "/api/attendance/clock-in";
      const res = await apiRequest("POST", endpoint, formData);
      return res.json();
    },
    onSuccess: (data) => {
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/break-status"] });
      if (clockedIn && data.record?.totalMinutes != null) {
        toast({ title: "Clocked out", description: `You worked ${formatWorked(data.record.totalMinutes)} today.` });
      } else {
        toast({ title: "Clocked in", description: "Have a great day!" });
      }
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Break start mutation
  const breakStartMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/attendance/break-start", {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/break-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team-status"] });
      toast({ title: "Break started", description: "Your status is now set to Away." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Break end mutation
  const breakEndMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/attendance/break-end", {});
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/break-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team-status"] });
      const mins = data.totalBreakMinutes ?? 0;
      toast({ title: "Back to work", description: `Break ended — ${formatWorked(mins)}.` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <Button type="button" variant="ghost" size="sm" disabled className="gap-1.5 h-8 px-2">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="hidden sm:inline text-xs">Work</span>
      </Button>
    );
  }

  // Not clocked in — single "Work Login" button
  if (!clockedIn) {
    return (
      <>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setModalOpen(true)}
          className="gap-1.5 h-8 px-2 text-xs font-medium"
          data-testid="button-work-login"
        >
          <span className="h-2 w-2 rounded-full flex-shrink-0 bg-muted-foreground/40" />
          <span className="hidden sm:inline">Work Login</span>
        </Button>
        <WebcamCaptureModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          mode="clock-in"
          onCapture={(blob) => clockMutation.mutate(blob)}
          isSubmitting={clockMutation.isPending}
        />
      </>
    );
  }

  // Clocked in — button group with Work Logout + Break control + Status dot
  return (
    <>
      <div className="flex items-center gap-1">
        {/* Work Logout */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setModalOpen(true)}
          className="gap-1.5 h-8 px-2 text-xs font-medium border-green-500/50 text-green-700 dark:text-green-400"
          data-testid="button-work-logout"
        >
          <span className="h-2 w-2 rounded-full flex-shrink-0 bg-green-500 animate-pulse" />
          <span className="hidden sm:inline">Work Logout</span>
          {elapsed && (
            <span className="hidden md:inline text-muted-foreground font-normal" data-testid="status-clock-elapsed">
              {elapsed}
            </span>
          )}
        </Button>

        {/* Break: Take Break / Back to Work */}
        {onBreak ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => breakEndMutation.mutate()}
            disabled={breakEndMutation.isPending}
            className="gap-1.5 h-8 px-2 text-xs font-medium border-orange-500/50 text-orange-600 dark:text-orange-400"
            data-testid="button-back-to-work"
          >
            {breakEndMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <span className="h-2 w-2 rounded-full flex-shrink-0 bg-orange-500 animate-pulse" />
            )}
            <Coffee className="h-3 w-3 flex-shrink-0" />
            <span className="hidden sm:inline">Back to Work</span>
            {breakElapsed && (
              <span className="hidden md:inline text-muted-foreground font-normal" data-testid="status-break-elapsed">
                {breakElapsed}
              </span>
            )}
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => breakStartMutation.mutate()}
            disabled={breakStartMutation.isPending}
            className="gap-1.5 h-8 px-2 text-xs font-medium text-amber-600 dark:text-amber-400 border-amber-500/40"
            data-testid="button-take-break"
          >
            {breakStartMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Coffee className="h-3 w-3 flex-shrink-0" />
            )}
            <span className="hidden sm:inline">Take Break</span>
          </Button>
        )}

        {/* Status dot — opens StatusPicker */}
        <StatusPicker>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            data-testid="button-status-dot"
            title="Set your status"
          >
            <span className={cn("h-3 w-3 rounded-full", STATUS_DOT_COLORS[currentAvailabilityStatus] ?? "bg-green-500")} />
          </Button>
        </StatusPicker>
      </div>

      <WebcamCaptureModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode="clock-out"
        onCapture={(blob) => clockMutation.mutate(blob)}
        isSubmitting={clockMutation.isPending}
      />
    </>
  );
}
