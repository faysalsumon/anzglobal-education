import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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

const leadFormSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
  visaStatus: z.enum(['no_visa', 'student_visa', 'work_visa', 'pr', 'citizen']),
});

type LeadFormValues = z.infer<typeof leadFormSchema>;

interface LeadFormDialogProps {
  courseId: string;
  universityId: string;
  courseName: string;
  universityName: string;
  trigger?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  buttonVariant?: "default" | "outline" | "secondary" | "ghost";
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
}: LeadFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const { toast } = useToast();
  
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      visaStatus: "no_visa",
    },
  });

  const createLeadMutation = useMutation({
    mutationFn: async (data: LeadFormValues) => {
      const response = await apiRequest("POST", "/api/public/leads", {
        ...data,
        courseId,
        universityId,
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Request Submitted",
        description: data.message || "We'll be in touch soon!",
      });
      form.reset();
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
            className="w-full border-accent text-accent hover:bg-accent hover:text-white" 
            data-testid="button-request-info"
          >
            <Info className="h-3.5 w-3.5 mr-1.5" />
            Request More Information
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
                      placeholder="+61 400 000 000"
                      {...field}
                      data-testid="input-phone"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="visaStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Visa Status *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-visa-status">
                        <SelectValue placeholder="Select your visa status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="no_visa">No Visa</SelectItem>
                      <SelectItem value="student_visa">Student Visa</SelectItem>
                      <SelectItem value="work_visa">Work Visa</SelectItem>
                      <SelectItem value="pr">Permanent Resident</SelectItem>
                      <SelectItem value="citizen">Citizen</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
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
