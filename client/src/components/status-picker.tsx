import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusData {
  availabilityStatus: string;
  customStatusText: string | null;
}

export const STATUS_OPTIONS = [
  {
    value: "available",
    label: "Available",
    dot: "bg-green-500",
    description: "You are online and available to chat.",
  },
  {
    value: "away",
    label: "Away",
    dot: "bg-yellow-500",
    description: "Let others know you are on a break. You will still receive notifications.",
  },
  {
    value: "busy",
    label: "Busy",
    dot: "bg-red-500",
    description: "You will not receive any notification sounds.",
  },
  {
    value: "invisible",
    label: "Invisible",
    dot: "bg-gray-400",
    description: "Your status will appear as offline, but you will receive notifications.",
  },
  {
    value: "do_not_disturb",
    label: "Do Not Disturb",
    dot: "bg-red-600",
    description: "You won't receive any notifications.",
  },
] as const;

export const STATUS_DOT_COLORS: Record<string, string> = {
  available: "bg-green-500",
  away: "bg-yellow-500",
  busy: "bg-red-500",
  do_not_disturb: "bg-red-600",
  invisible: "bg-gray-400",
};

const QUICK_STATUSES = [
  "In Client Meeting",
  "At Branch",
  "Campus Visit",
  "On Leave",
  "Working Remotely",
  "Available for Collaboration",
];

interface StatusPickerProps {
  children: React.ReactNode;
}

export function StatusPicker({ children }: StatusPickerProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [customInput, setCustomInput] = useState("");

  const { data: statusData } = useQuery<StatusData>({
    queryKey: ["/api/admin/status"],
  });

  const currentStatus = statusData?.availabilityStatus || "available";
  const currentCustom = statusData?.customStatusText || "";

  const statusOption = STATUS_OPTIONS.find(s => s.value === currentStatus) ?? STATUS_OPTIONS[0];

  const mutation = useMutation({
    mutationFn: async ({ availabilityStatus, customStatusText }: { availabilityStatus: string; customStatusText?: string }) => {
      const res = await apiRequest("PUT", "/api/admin/status", { availabilityStatus, customStatusText });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team-status"] });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  const handleSelectStatus = (value: string) => {
    mutation.mutate({ availabilityStatus: value, customStatusText: currentCustom || undefined });
  };

  const handleCustomSubmit = (text: string) => {
    if (!text.trim()) return;
    mutation.mutate({ availabilityStatus: currentStatus, customStatusText: text.trim() });
    setCustomInput("");
  };

  const handleClearCustom = () => {
    mutation.mutate({ availabilityStatus: currentStatus, customStatusText: "" });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
        <div className="p-4 border-b">
          <h3 className="font-semibold text-sm">Availability Status</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Let your team know your current availability</p>
        </div>

        <div className="p-3 border-b">
          <div className="flex items-center gap-2 px-1">
            <span className={cn("h-3 w-3 rounded-full flex-shrink-0", STATUS_DOT_COLORS[currentStatus])} />
            <span className="text-sm font-medium">{statusOption.label}</span>
            {currentCustom && (
              <span className="text-xs text-muted-foreground truncate">— {currentCustom}</span>
            )}
          </div>
        </div>

        <div className="p-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1 mb-2">Default</p>
          <div className="space-y-0.5">
            {STATUS_OPTIONS.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelectStatus(option.value)}
                className={cn(
                  "w-full flex items-start gap-3 px-2 py-2 rounded-md text-left hover-elevate transition-colors",
                  currentStatus === option.value && "bg-muted"
                )}
                data-testid={`status-option-${option.value}`}
              >
                <span className={cn("h-3 w-3 rounded-full flex-shrink-0 mt-0.5", option.dot)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight">{option.label}</p>
                  <p className="text-xs text-muted-foreground leading-snug mt-0.5">{option.description}</p>
                </div>
                {currentStatus === option.value && (
                  <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 border-t">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1 mb-2">Custom Status</p>
          <div className="flex gap-1.5">
            <Input
              value={customInput || currentCustom}
              onChange={e => setCustomInput(e.target.value)}
              onFocus={() => setCustomInput(currentCustom)}
              placeholder="e.g., In Client Meeting, At Branch..."
              className="text-sm h-8"
              data-testid="input-custom-status"
              onKeyDown={e => {
                if (e.key === "Enter") handleCustomSubmit(customInput);
              }}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 flex-shrink-0"
              onClick={() => handleCustomSubmit(customInput)}
              data-testid="button-submit-custom-status"
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
          </div>
          {currentCustom && (
            <button
              type="button"
              onClick={handleClearCustom}
              className="text-xs text-muted-foreground hover:text-foreground mt-1.5 px-1"
            >
              Clear custom status
            </button>
          )}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {QUICK_STATUSES.map(chip => (
              <button
                key={chip}
                type="button"
                onClick={() => handleCustomSubmit(chip)}
                className="text-xs px-2 py-1 rounded-md bg-muted hover-elevate border border-border"
                data-testid={`chip-status-${chip.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
