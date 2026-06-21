import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Clock, Bell } from "lucide-react";
import { format, addDays, addHours, setHours, setMinutes } from "date-fns";
import { cn } from "@/lib/utils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export type ReminderEntityType = 'application' | 'task' | 'crm_contact' | 'invoice' | 'account';

const ENTITY_LABELS: Record<ReminderEntityType, string> = {
  application: 'application',
  task: 'task',
  crm_contact: 'contact',
  invoice: 'invoice',
  account: 'account',
};

const ENTITY_FIELD_MAP: Record<ReminderEntityType, string> = {
  application: 'applicationId',
  task: 'taskId',
  crm_contact: 'crmContactId',
  invoice: 'accInvoiceId',
  account: 'accountId',
};

interface CreateReminderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Legacy props (kept for backwards compat)
  applicationId?: string;
  taskId?: string;
  // Generic entity props
  entityType?: ReminderEntityType;
  entityId?: string;
  onSuccess?: () => void;
}

const QUICK_OPTIONS = [
  { label: "In 1 hour", value: "1h" },
  { label: "In 3 hours", value: "3h" },
  { label: "Tomorrow morning", value: "tomorrow_am" },
  { label: "Tomorrow afternoon", value: "tomorrow_pm" },
  { label: "In 2 days", value: "2d" },
  { label: "In 1 week", value: "1w" },
  { label: "Custom", value: "custom" },
];

export function CreateReminderModal({
  open,
  onOpenChange,
  applicationId,
  taskId,
  entityType,
  entityId,
  onSuccess,
}: CreateReminderModalProps) {
  const { toast } = useToast();
  const [quickOption, setQuickOption] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState("09:00");
  const [message, setMessage] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const resolvedEntityLabel = (() => {
    if (entityType) return ENTITY_LABELS[entityType];
    if (applicationId) return 'application';
    if (taskId) return 'task';
    return 'item';
  })();

  const calculateReminderDate = (option: string): Date => {
    const now = new Date();
    
    switch (option) {
      case "1h":
        return addHours(now, 1);
      case "3h":
        return addHours(now, 3);
      case "tomorrow_am":
        return setMinutes(setHours(addDays(now, 1), 9), 0);
      case "tomorrow_pm":
        return setMinutes(setHours(addDays(now, 1), 14), 0);
      case "2d":
        return setMinutes(setHours(addDays(now, 2), 9), 0);
      case "1w":
        return setMinutes(setHours(addDays(now, 7), 9), 0);
      default:
        return now;
    }
  };

  const getCustomDateTime = (): Date | null => {
    if (!selectedDate) return null;
    const [hours, minutes] = selectedTime.split(":").map(Number);
    return setMinutes(setHours(selectedDate, hours), minutes);
  };

  const getReminderAt = (): Date | null => {
    if (quickOption === "custom") {
      return getCustomDateTime();
    } else if (quickOption) {
      return calculateReminderDate(quickOption);
    }
    return null;
  };

  const buildRequestBody = (reminderAt: string, msg: string): Record<string, unknown> => {
    const body: Record<string, unknown> = { reminderAt, message: msg };
    if (entityType && entityId) {
      body[ENTITY_FIELD_MAP[entityType]] = entityId;
    } else {
      if (applicationId) body.applicationId = applicationId;
      if (taskId) body.taskId = taskId;
    }
    return body;
  };

  const createReminderMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return apiRequest("POST", "/api/reminders", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders/upcoming"] });
      if (entityType && entityId) {
        queryClient.invalidateQueries({ queryKey: ["/api/reminders/by-entity", { entityType, entityId }] });
      }
      toast({
        title: "Reminder created",
        description: "You'll be notified at the scheduled time",
      });
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create reminder",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setQuickOption("");
    setSelectedDate(undefined);
    setSelectedTime("09:00");
    setMessage("");
    setShowDatePicker(false);
  };

  const handleSubmit = () => {
    const reminderAt = getReminderAt();
    if (!reminderAt) {
      toast({
        title: "Select a time",
        description: "Please select when you want to be reminded",
        variant: "destructive",
      });
      return;
    }

    createReminderMutation.mutate(buildRequestBody(reminderAt.toISOString(), message.trim() || ""));
  };

  const handleQuickOptionChange = (value: string) => {
    setQuickOption(value);
    if (value !== "custom") {
      setShowDatePicker(false);
    } else {
      setShowDatePicker(true);
    }
  };

  const reminderAt = getReminderAt();

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetForm();
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-[425px]" data-testid="dialog-create-reminder">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Create Reminder
          </DialogTitle>
          <DialogDescription>
            Set a follow-up reminder for this {resolvedEntityLabel}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>When to remind</Label>
            <Select value={quickOption} onValueChange={handleQuickOptionChange}>
              <SelectTrigger data-testid="select-reminder-time">
                <SelectValue placeholder="Select timing" />
              </SelectTrigger>
              <SelectContent>
                {QUICK_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showDatePicker && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                      data-testid="button-select-date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Time</Label>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-32"
                    data-testid="input-reminder-time"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a note to your reminder..."
              className="min-h-[80px]"
              data-testid="textarea-reminder-message"
            />
          </div>

          {reminderAt && (
            <div className="p-3 rounded-lg bg-muted text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Bell className="h-4 w-4" />
                <span>
                  Reminder set for{" "}
                  <strong className="text-foreground">
                    {format(reminderAt, "PPP 'at' p")}
                  </strong>
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-reminder"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!quickOption || createReminderMutation.isPending}
            data-testid="button-create-reminder"
          >
            {createReminderMutation.isPending ? "Creating..." : "Create Reminder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
