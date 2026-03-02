import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { trackLead } from "@/lib/meta-pixel";
import { useRegion } from "@/context/RegionContext";
import { TurnstileWidget } from "@/components/turnstile-widget";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";

const VISA_STATUS_OPTIONS = [
  { value: 'no_visa', label: 'No Visa' },
  { value: 'student_visa_500', label: 'Student Visa (Subclass 500)' },
  { value: 'graduate_visa_485', label: 'Graduate Visa (Subclass 485)' },
  { value: 'tourist_visa_600', label: 'Tourist/Visitor Visa (Subclass 600)' },
  { value: 'working_holiday_417', label: 'Working Holiday Visa (Subclass 417)' },
  { value: 'work_holiday_462', label: 'Work and Holiday Visa (Subclass 462)' },
  { value: 'skilled_worker_482', label: 'Skilled Worker Visa (Subclass 482)' },
  { value: 'skilled_independent_189', label: 'Skilled Independent Visa (Subclass 189)' },
  { value: 'skilled_nominated_190', label: 'Skilled Nominated Visa (Subclass 190)' },
  { value: 'partner_visa_820', label: 'Partner Visa (Subclass 820/801)' },
  { value: 'bridging_visa_a', label: 'Bridging Visa A' },
  { value: 'bridging_visa_b', label: 'Bridging Visa B' },
  { value: 'bridging_visa_c', label: 'Bridging Visa C' },
  { value: 'bridging_visa_e', label: 'Bridging Visa E' },
  { value: 'pr', label: 'Permanent Resident' },
  { value: 'citizen', label: 'Australian Citizen' },
  { value: 'other', label: 'Other Visa' },
] as const;

const leadFormSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
  visaStatus: z.string().optional(),
});

type LeadFormValues = z.infer<typeof leadFormSchema>;

function getCountryFromRegion(regionCode: string | null): string {
  const code = regionCode?.toUpperCase();
  if (code === "AU") return "Australia";
  if (code === "BD") return "Bangladesh";
  return "";
}

function getPhonePrefix(regionCode: string | null): string {
  const code = regionCode?.toUpperCase();
  if (code === "AU") return "+61 ";
  if (code === "BD") return "+880 ";
  return "";
}

function getPhonePlaceholder(regionCode: string | null): string {
  const code = regionCode?.toUpperCase();
  if (code === "AU") return "+61 400 000 000";
  if (code === "BD") return "+880 1XXXXXXXXX";
  return "+XX ...";
}

interface LeadFormDialogProps {
  courseId: string;
  universityId: string;
  courseName: string;
  universityName: string;
  trigger?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  buttonVariant?: "default" | "outline" | "secondary" | "ghost";
  buttonClassName?: string;
  buttonLabel?: string;
}

export function LeadFormDialog({
  courseId,
  universityId,
  courseName,
  universityName,
  trigger = true,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  buttonVariant = "default",
  buttonClassName,
  buttonLabel,
}: LeadFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const { toast } = useToast();
  const { regionCode } = useRegion();

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  const isAU = regionCode?.toUpperCase() === "AU";
  const phonePrefix = getPhonePrefix(regionCode);
  const phonePlaceholder = getPhonePlaceholder(regionCode);

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: phonePrefix,
      visaStatus: "",
    },
  });

  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const handleTurnstileSuccess = useCallback((token: string) => setTurnstileToken(token), []);
  const handleTurnstileExpire = useCallback(() => setTurnstileToken(""), []);

  // Pre-populate phone prefix when dialog opens
  useEffect(() => {
    if (open) {
      const currentPhone = form.getValues("phone");
      if (!currentPhone || currentPhone.trim() === "") {
        form.setValue("phone", phonePrefix);
      }
    }
  }, [open, phonePrefix, form]);

  const createLeadMutation = useMutation({
    mutationFn: async (data: LeadFormValues) => {
      const response = await apiRequest("POST", "/api/public/leads", {
        ...data,
        country: getCountryFromRegion(regionCode),
        courseId,
        universityId,
        regionCode: regionCode || undefined,
        turnstileToken: turnstileToken || undefined,
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      trackLead("Course Lead", "Course Inquiry");
      toast({
        title: "Request Submitted",
        description: data.message || "We'll be in touch soon!",
      });
      form.reset({
        firstName: "",
        lastName: "",
        email: "",
        phone: phonePrefix,
        visaStatus: "",
      });
      setTurnstileToken("");
      setOpen(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: error.message || "Please try again later",
      });
    },
  });

  const onSubmit = (data: LeadFormValues) => {
    createLeadMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && (
        <DialogTrigger asChild>
          <Button
            size="sm"
            variant={buttonVariant}
            className={buttonClassName || "w-full"}
            data-testid="button-request-info"
          >
            <Info className="h-3.5 w-3.5 mr-1.5" />
            {buttonLabel || "Request More Information"}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-lead-form">
        <DialogHeader>
          <DialogTitle data-testid="text-dialog-title">Request Course Information</DialogTitle>
          <DialogDescription data-testid="text-dialog-description">
            Get more information about <span className="font-medium">{courseName}</span> at{" "}
            <span className="font-medium">{universityName}</span>. We'll be in touch soon!
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="John"
                        {...field}
                        data-testid="input-first-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Smith"
                        {...field}
                        data-testid="input-last-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="john.smith@example.com"
                      {...field}
                      data-testid="input-email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number *</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder={phonePlaceholder}
                      {...field}
                      data-testid="input-phone"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isAU && (
              <FormField
                control={form.control}
                name="visaStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Visa Status *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-visa-status">
                          <SelectValue placeholder="Select your visa status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {VISA_STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <TurnstileWidget
              onSuccess={handleTurnstileSuccess}
              onExpire={handleTurnstileExpire}
              className="flex justify-center"
            />

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1"
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={createLeadMutation.isPending}
                data-testid="button-submit-lead"
              >
                {createLeadMutation.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
