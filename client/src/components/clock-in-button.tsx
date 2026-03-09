import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { WebcamCaptureModal } from "@/components/webcam-capture-modal";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AttendanceStatus {
  record: {
    id: string;
    clockInAt: string;
    totalMinutes?: number;
  } | null;
  clockedIn: boolean;
}

function formatElapsed(clockInAt: string): string {
  const ms = Date.now() - new Date(clockInAt).getTime();
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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: statusData, isLoading } = useQuery<AttendanceStatus>({
    queryKey: ["/api/attendance/status"],
    refetchInterval: 60000,
  });

  const clockedIn = statusData?.clockedIn ?? false;
  const openRecord = statusData?.record ?? null;

  useEffect(() => {
    if (clockedIn && openRecord?.clockInAt) {
      setElapsed(formatElapsed(openRecord.clockInAt));
      intervalRef.current = setInterval(() => {
        setElapsed(formatElapsed(openRecord.clockInAt));
      }, 60000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setElapsed("");
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [clockedIn, openRecord?.clockInAt]);

  const mutation = useMutation({
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
      if (clockedIn && data.record?.totalMinutes != null) {
        toast({
          title: "Clocked out",
          description: `You worked ${formatWorked(data.record.totalMinutes)} today.`,
        });
      } else {
        toast({ title: "Clocked in", description: "Have a great day!" });
      }
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleCapture = (blob: Blob) => {
    mutation.mutate(blob);
  };

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled className="gap-1.5 h-8 px-2">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="hidden sm:inline text-xs">Work</span>
      </Button>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setModalOpen(true)}
        className={cn(
          "gap-1.5 h-8 px-2 text-xs font-medium",
          clockedIn && "border-green-500/50 text-green-700 dark:text-green-400"
        )}
        data-testid={clockedIn ? "button-work-logout" : "button-work-login"}
      >
        <span
          className={cn(
            "h-2 w-2 rounded-full flex-shrink-0",
            clockedIn
              ? "bg-green-500 animate-pulse"
              : "bg-muted-foreground/40"
          )}
        />
        <span className="hidden sm:inline">
          {clockedIn ? "Work Logout" : "Work Login"}
        </span>
        {clockedIn && elapsed && (
          <span
            className="hidden md:inline text-muted-foreground font-normal"
            data-testid="status-clock-elapsed"
          >
            {elapsed}
          </span>
        )}
      </Button>

      <WebcamCaptureModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={clockedIn ? "clock-out" : "clock-in"}
        onCapture={handleCapture}
        isSubmitting={mutation.isPending}
      />
    </>
  );
}
