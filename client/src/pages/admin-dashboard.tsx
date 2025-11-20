import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
// Tabs removed - navigation now in AdminSidebar only
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Users, Building2, BookOpen, ShieldCheck, ShieldOff, Search, Plus, Edit, Trash2, Home, GraduationCap, FileText, CheckCircle2, Clock, XCircle, Upload, Sparkles } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { AdminCsvImportPanel } from "@/pages/admin-csv-import";
import { GoogleAddressAutocomplete, AddressComponents } from "@/components/ui/google-address-autocomplete";
import { AIInstitutionExtractor } from "@/components/ai-institution-extractor";
import { AICourseExtractor } from "@/components/ai-course-extractor";
import { GalleryImageManager } from "@/components/gallery-image-manager";
import { AdminSidebar } from "@/components/admin-sidebar";
import { AdminBlogManagement } from "@/components/admin-blog-management";
import { AdminScrapingPanel } from "@/components/admin-scraping-panel";
import { ActivityFeed } from "@/components/activity-feed";
import { AdminApplicationsKanban } from "@/components/admin-applications-kanban";

interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  userType: string;
  role: string | null;
  isActive: boolean | null;
  lastLogin: string | null;
  createdAt: string | null;
}

interface Institution {
  id: string;
  name: string;
  description: string | null;
  country: string;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  userId: string | null;
  providerType: string | null;
  numberOfCampuses: number | null;
  establishedYear: number | null;
  scholarshipPercentageMin: number | null;
  scholarshipPercentageMax: number | null;
  topDisciplines: string[] | null;
  logo: string | null;
  topCourses: string[] | null;
  institutionGallery: string[] | null;
  campusAddresses: Array<{
    address: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  }> | null;
  approvalStatus: string | null;
  isActive: boolean;
  createdAt: string | null;
}

interface Course {
  id: string;
  universityId: string;
  title: string;
  description: string | null;
  duration: string | null;
  fees: number | null;
  level: string | null;
  subject: string;
  isActive: boolean;
  institutionName?: string;
  createdAt: string | null;
  approvalStatus: string;
  rejectionReason: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
}

interface StudentLead {
  userId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  nationality: string | null;
  country: string | null;
  educationLevel: string | null;
  fieldOfStudy: string | null;
  createdAt: string | null;
  profileComplete: boolean;
}

interface InquiryLead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  visaStatus: string;
  courseId: string;
  universityId: string;
  status: string;
  notes: string | null;
  createdAt: string | null;
  course: {
    id: string;
    title: string;
    level: string | null;
    subject: string | null;
  } | null;
  university: {
    id: string;
    name: string;
  } | null;
}

interface Application {
  id: string;
  status: string;
  createdAt: string | null;
  personalStatement: string | null;
  additionalInfo: string | null;
  student: {
    id: string;
    name: string;
    email: string | null;
    nationality: string | null;
  };
  course: {
    id: string;
    title: string;
    level: string | null;
    subject: string | null;
  };
  university: {
    id: string;
    name: string;
  };
}

// Helper function to format user type labels
const formatUserType = (userType: string): string => {
  const labels: Record<string, string> = {
    admin: "Super Admin",
    student: "Student",
    university: "University"
  };
  return labels[userType] || userType;
};

const userSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").optional().or(z.literal("")),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  userType: z.enum(["student", "university", "admin"]),
  role: z.string().optional(),
});

const institutionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  country: z.string().min(1, "Country is required"),
  description: z.string().optional(),
  contactEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  providerType: z.string().min(1, "Provider type is required"),
  numberOfCampuses: z.coerce.number().int().positive().optional().or(z.literal("")),
  establishedYear: z.coerce.number().int().min(1800).max(new Date().getFullYear()).optional().or(z.literal("")),
  scholarshipPercentageMin: z.coerce.number().min(0).max(100).optional().or(z.literal("")),
  scholarshipPercentageMax: z.coerce.number().min(0).max(100).optional().or(z.literal("")),
  logo: z.string().optional(),
  topDisciplines: z.string().optional(),
  topCourses: z.string().optional(),
  institutionGallery: z.array(z.string()).optional(),
  campusAddresses: z.array(z.object({
    address: z.string(),
    city: z.string(),
    state: z.string(),
    postcode: z.string(),
    country: z.string(),
  })).optional(),
  hasScholarship: z.boolean().optional(),
});

const courseSchema = z.object({
  universityId: z.string().min(1, "Institution is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  duration: z.string().optional(),
  fees: z.coerce.number().positive().optional().or(z.literal("")),
  level: z.string().optional(),
  subject: z.string().min(1, "Subject is required"),
});

const PROVIDER_TYPES = ["Institution", "TAFE", "University", "College", "School"];

export default function AdminDashboard() {
  const { toast } = useToast();
  const { adminRole, isConsultant, isSuperAdmin, hasFullAdminAccess } = useAuth();
  
  // Default tab based on role: restricted admins use applications, full admins use users
  const defaultTab = (isConsultant || !hasFullAdminAccess) ? "applications" : "users";
  
  // Initialize activeTab from hash with access control validation
  const getInitialTab = () => {
    const hash = window.location.hash.replace('#', '');
    const validTabs = ['users', 'institutions', 'courses', 'student-leads', 'inquiry-leads', 'applications', 'data-import', 'web-scraping', 'activity-logs'];
    const fullAdminOnlyTabs = ['users', 'institutions', 'data-import', 'web-scraping', 'activity-logs'];
    
    if (hash && validTabs.includes(hash)) {
      // Check access for full-admin-only tabs
      if (fullAdminOnlyTabs.includes(hash) && !hasFullAdminAccess) {
        return defaultTab; // Restricted admin - use default
      }
      return hash; // Valid tab with proper access
    }
    return defaultTab; // No hash or invalid hash
  };
  
  const [activeTab, setActiveTab] = useState(getInitialTab);

  // Sync active tab to URL hash only when it changes and differs from current hash
  useEffect(() => {
    const currentHash = window.location.hash.replace('#', '');
    if (currentHash !== activeTab) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${activeTab}`);
    }
  }, [activeTab]);
  
  // User state
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  // Institution state
  const [institutionSearchQuery, setInstitutionSearchQuery] = useState("");
  const [institutionDialogOpen, setInstitutionDialogOpen] = useState(false);
  const [aiExtractorDialogOpen, setAiExtractorDialogOpen] = useState(false);
  const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null);
  const [deletingInstitution, setDeletingInstitution] = useState<Institution | null>(null);
  const [rejectingInstitution, setRejectingInstitution] = useState<Institution | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedInstitutions, setSelectedInstitutions] = useState<Set<string>>(new Set());

  // Course state
  const [courseSearchQuery, setCourseSearchQuery] = useState("");
  const [courseStatusFilter, setCourseStatusFilter] = useState<string>("all");
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(new Set());
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [aiCourseExtractorDialogOpen, setAiCourseExtractorDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);
  const [rejectingCourse, setRejectingCourse] = useState<Course | null>(null);
  const [courseRejectionReason, setCourseRejectionReason] = useState("");

  // Student leads state
  const [studentLeadSearchQuery, setStudentLeadSearchQuery] = useState("");

  // Applications state
  const [applicationSearchQuery, setApplicationSearchQuery] = useState("");
  const [applicationStatusFilter, setApplicationStatusFilter] = useState<string>("all");

  // Logo upload state
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  // Forms
  const userForm = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      userType: "student",
      role: "",
    },
  });

  const institutionForm = useForm<z.infer<typeof institutionSchema>>({
    resolver: zodResolver(institutionSchema),
    defaultValues: {
      name: "",
      country: "",
      description: "",
      contactEmail: "",
      contactPhone: "",
      website: "",
      providerType: "",
      logo: "",
      topDisciplines: "",
      topCourses: "",
      institutionGallery: [],
      campusAddresses: [],
      hasScholarship: false,
      scholarshipPercentageMin: "" as any,
      scholarshipPercentageMax: "" as any,
      numberOfCampuses: "" as any,
    },
  });

  const courseForm = useForm<z.infer<typeof courseSchema>>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      universityId: "",
      title: "",
      description: "",
      duration: "",
      fees: "" as any,
      level: "",
      subject: "",
    },
  });

  // Queries - Conditionally loaded based on role
  // Users and Institutions: Only for super_admin and support_manager (full admin access)
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/super-admin/users"],
    enabled: hasFullAdminAccess, // Only full admins can access users
  });

  const { data: institutions, isLoading: institutionsLoading } = useQuery<Institution[]>({
    queryKey: ["/api/super-admin/institutions"],
    enabled: hasFullAdminAccess, // Only full admins can access institutions
  });

  // Courses, Student Leads, Applications: All admin roles
  const { data: courses, isLoading: coursesLoading } = useQuery<Course[]>({
    queryKey: ["/api/super-admin/courses"],
  });

  const { data: studentLeads, isLoading: studentLeadsLoading } = useQuery<StudentLead[]>({
    queryKey: ["/api/super-admin/student-leads"],
  });

  const { data: applications, isLoading: applicationsLoading } = useQuery<Application[]>({
    queryKey: ["/api/super-admin/applications"],
  });

  const { data: inquiryLeads, isLoading: inquiryLeadsLoading } = useQuery<InquiryLead[]>({
    queryKey: ["/api/admin/leads"],
  });

  // Watch numberOfCampuses and update campusAddresses array
  useEffect(() => {
    const numberOfCampuses = institutionForm.watch("numberOfCampuses");
    if (numberOfCampuses && numberOfCampuses > 0) {
      const currentAddresses = institutionForm.getValues("campusAddresses") || [];
      const newAddresses = Array.from({ length: numberOfCampuses }, (_, i) => 
        currentAddresses[i] || { address: "", city: "", state: "", postcode: "", country: "" }
      );
      institutionForm.setValue("campusAddresses", newAddresses);
    }
  }, [institutionForm.watch("numberOfCampuses")]);

  // User mutations
  const createUserMutation = useMutation({
    mutationFn: async (data: z.infer<typeof userSchema>) => {
      return await apiRequest("POST", "/api/super-admin/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      setUserDialogOpen(false);
      userForm.reset();
      toast({
        title: "User created",
        description: "User has been created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<z.infer<typeof userSchema>> }) => {
      return await apiRequest("PATCH", `/api/super-admin/users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      setUserDialogOpen(false);
      setEditingUser(null);
      userForm.reset();
      toast({
        title: "User updated",
        description: "User has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/super-admin/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      setDeletingUser(null);
      toast({
        title: "User deleted",
        description: "User has been deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, userType, role }: { userId: string; userType: string; role: string }) => {
      return await apiRequest("PATCH", `/api/super-admin/users/${userId}/role`, { userType, role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      toast({
        title: "Role updated",
        description: "User role has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      return await apiRequest("PATCH", `/api/super-admin/users/${userId}/status`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      toast({
        title: "Status updated",
        description: "User status has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Institution mutations
  const createInstitutionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof institutionSchema>) => {
      return await apiRequest("POST", "/api/super-admin/institutions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/institutions"] });
      setInstitutionDialogOpen(false);
      institutionForm.reset();
      toast({
        title: "Institution created",
        description: "Institution has been created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateInstitutionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<z.infer<typeof institutionSchema>> }) => {
      return await apiRequest("PATCH", `/api/super-admin/institutions/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/institutions"] });
      setInstitutionDialogOpen(false);
      setEditingInstitution(null);
      institutionForm.reset();
      toast({
        title: "Institution updated",
        description: "Institution has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteInstitutionMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/super-admin/institutions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/institutions"] });
      setDeletingInstitution(null);
      toast({
        title: "Institution deleted",
        description: "Institution has been deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleInstitutionStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return await apiRequest("PATCH", `/api/super-admin/institutions/${id}/status`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/institutions"] });
      toast({
        title: "Status updated",
        description: "Institution status has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Course mutations
  const createCourseMutation = useMutation({
    mutationFn: async (data: z.infer<typeof courseSchema>) => {
      return await apiRequest("POST", "/api/super-admin/courses", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/courses"] });
      setCourseDialogOpen(false);
      courseForm.reset();
      toast({
        title: "Course created",
        description: "Course has been created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateCourseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<z.infer<typeof courseSchema>> }) => {
      return await apiRequest("PATCH", `/api/super-admin/courses/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/courses"] });
      setCourseDialogOpen(false);
      setEditingCourse(null);
      courseForm.reset();
      toast({
        title: "Course updated",
        description: "Course has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/super-admin/courses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/courses"] });
      setDeletingCourse(null);
      toast({
        title: "Course deleted",
        description: "Course has been deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Bulk action mutations
  const bulkDeleteUsersMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      return await apiRequest("POST", "/api/super-admin/users/bulk-delete", { userIds });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      setSelectedUsers(new Set());
      toast({
        title: "Users deleted",
        description: data.message || `Successfully deleted ${data.count} user(s)`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkDeleteInstitutionsMutation = useMutation({
    mutationFn: async (institutionIds: string[]) => {
      return await apiRequest("POST", "/api/super-admin/institutions/bulk-delete", { institutionIds });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/institutions"] });
      setSelectedInstitutions(new Set());
      toast({
        title: "Institutions deleted",
        description: data.message || `Successfully deleted ${data.count} institution(s)`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkUpdateInstitutionStatusMutation = useMutation({
    mutationFn: async ({ institutionIds, status }: { institutionIds: string[]; status: string }) => {
      return await apiRequest("POST", "/api/super-admin/institutions/bulk-update-status", { institutionIds, status });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/institutions"] });
      setSelectedInstitutions(new Set());
      toast({
        title: "Status updated",
        description: data.message || `Successfully updated ${data.count} institution(s)`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkDeleteCoursesMutation = useMutation({
    mutationFn: async (courseIds: string[]) => {
      return await apiRequest("POST", "/api/super-admin/courses/bulk-delete", { courseIds });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/courses"] });
      setSelectedCourses(new Set());
      toast({
        title: "Courses deleted",
        description: data.message || `Successfully deleted ${data.count} course(s)`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkUpdateCourseStatusMutation = useMutation({
    mutationFn: async ({ courseIds, status }: { courseIds: string[]; status: string }) => {
      return await apiRequest("POST", "/api/super-admin/courses/bulk-update-status", { courseIds, status });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/courses"] });
      setSelectedCourses(new Set());
      toast({
        title: "Status updated",
        description: data.message || `Successfully updated ${data.count} course(s)`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleCourseStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return await apiRequest("PATCH", `/api/super-admin/courses/${id}/status`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/courses"] });
      toast({
        title: "Status updated",
        description: "Course status has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const approveInstitutionMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("PATCH", `/api/admin/institutions/${id}/approve`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/institutions"] });
      toast({
        title: "Institution approved",
        description: "The institution has been approved and is now publicly visible",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectInstitutionMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return await apiRequest("PATCH", `/api/admin/institutions/${id}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/institutions"] });
      setRejectingInstitution(null);
      setRejectionReason("");
      toast({
        title: "Institution rejected",
        description: "The institution has been rejected and will remain hidden from public",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const approveCourseMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("PATCH", `/api/admin/courses/${id}/approve`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/courses"] });
      toast({
        title: "Course approved",
        description: "The course has been approved and is now publicly visible",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectCourseMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return await apiRequest("PATCH", `/api/admin/courses/${id}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/courses"] });
      setRejectingCourse(null);
      setCourseRejectionReason("");
      toast({
        title: "Course rejected",
        description: "The course has been rejected and will remain hidden from public",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter users
  const filteredUsers = users?.filter(user => {
    const matchesSearch = 
      userSearchQuery === "" ||
      user.email?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      user.firstName?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(userSearchQuery.toLowerCase());
    
    const matchesType = filterType === "all" || user.userType === filterType;
    const matchesStatus = 
      filterStatus === "all" ||
      (filterStatus === "active" && user.isActive) ||
      (filterStatus === "inactive" && !user.isActive);
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // Filter institutions
  const filteredInstitutions = institutions?.filter(institution => {
    return (
      institutionSearchQuery === "" ||
      institution.name?.toLowerCase().includes(institutionSearchQuery.toLowerCase()) ||
      institution.country?.toLowerCase().includes(institutionSearchQuery.toLowerCase())
    );
  });

  // Filter courses
  const filteredCourses = courses?.filter(course => {
    const matchesSearch =
      courseSearchQuery === "" ||
      course.title?.toLowerCase().includes(courseSearchQuery.toLowerCase()) ||
      course.institutionName?.toLowerCase().includes(courseSearchQuery.toLowerCase());

    const matchesStatus =
      courseStatusFilter === "all" ||
      (courseStatusFilter === "active" && course.isActive) ||
      (courseStatusFilter === "inactive" && !course.isActive);

    return matchesSearch && matchesStatus;
  });

  // User stats
  const userStats = {
    total: users?.length || 0,
    active: users?.filter(u => u.isActive).length || 0,
    inactive: users?.filter(u => !u.isActive).length || 0,
    students: users?.filter(u => u.userType === "student").length || 0,
    universities: users?.filter(u => u.userType === "university").length || 0,
    admins: users?.filter(u => u.userType === "admin").length || 0,
  };

  // Institution stats
  const institutionStats = {
    total: institutions?.length || 0,
    active: institutions?.filter(i => i.isActive).length || 0,
    inactive: institutions?.filter(i => !i.isActive).length || 0,
    pending: institutions?.filter(i => i.approvalStatus === 'pending').length || 0,
  };

  // Course stats
  const courseStats = {
    total: courses?.length || 0,
    active: courses?.filter(c => c.isActive).length || 0,
    inactive: courses?.filter(c => !c.isActive).length || 0,
  };

  // Bulk action handlers
  const toggleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const toggleSelectAllUsers = (users: User[]) => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map(u => u.id)));
    }
  };

  const toggleSelectInstitution = (institutionId: string) => {
    const newSelected = new Set(selectedInstitutions);
    if (newSelected.has(institutionId)) {
      newSelected.delete(institutionId);
    } else {
      newSelected.add(institutionId);
    }
    setSelectedInstitutions(newSelected);
  };

  const toggleSelectAllInstitutions = (institutions: Institution[]) => {
    if (selectedInstitutions.size === institutions.length) {
      setSelectedInstitutions(new Set());
    } else {
      setSelectedInstitutions(new Set(institutions.map(i => i.id)));
    }
  };

  const toggleSelectCourse = (courseId: string) => {
    const newSelected = new Set(selectedCourses);
    if (newSelected.has(courseId)) {
      newSelected.delete(courseId);
    } else {
      newSelected.add(courseId);
    }
    setSelectedCourses(newSelected);
  };

  const toggleSelectAllCourses = (courses: Course[]) => {
    if (selectedCourses.size === courses.length) {
      setSelectedCourses(new Set());
    } else {
      setSelectedCourses(new Set(courses.map(c => c.id)));
    }
  };

  // User handlers
  const handleCreateUser = () => {
    setEditingUser(null);
    userForm.reset();
    setUserDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    userForm.reset({
      email: user.email || "",
      password: "", // Don't pre-fill password
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      userType: user.userType as any,
      role: user.role || "",
    });
    setUserDialogOpen(true);
  };

  const handleSubmitUser = (data: z.infer<typeof userSchema>) => {
    if (editingUser) {
      // For edit, don't send password if it's empty
      const updateData: any = {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
      };
      if (data.password) {
        updateData.password = data.password;
      }
      updateUserMutation.mutate({ id: editingUser.id, data: updateData });
    } else {
      createUserMutation.mutate(data);
    }
  };

  // Institution handlers
  const handleCreateInstitution = () => {
    setEditingInstitution(null);
    setLogoPreview(null);
    institutionForm.reset();
    setInstitutionDialogOpen(true);
  };

  const handleEditInstitution = (institution: Institution) => {
    setEditingInstitution(institution);
    setLogoPreview(institution.logo || null);
    // Use explicit null/undefined check to handle 0% scholarships
    const hasScholarship = (
      institution.scholarshipPercentageMin !== null && institution.scholarshipPercentageMin !== undefined ||
      institution.scholarshipPercentageMax !== null && institution.scholarshipPercentageMax !== undefined
    );
    institutionForm.reset({
      name: institution.name,
      country: institution.country,
      description: institution.description || "",
      contactEmail: institution.contactEmail || "",
      contactPhone: institution.contactPhone || "",
      website: institution.website || "",
      providerType: institution.providerType || "",
      numberOfCampuses: institution.numberOfCampuses as any,
      establishedYear: institution.establishedYear as any,
      scholarshipPercentageMin: institution.scholarshipPercentageMin as any,
      scholarshipPercentageMax: institution.scholarshipPercentageMax as any,
      logo: institution.logo || "",
      topDisciplines: institution.topDisciplines?.join(", ") || "",
      topCourses: institution.topCourses?.join(", ") || "",
      institutionGallery: institution.institutionGallery || [],
      campusAddresses: institution.campusAddresses || [],
      hasScholarship,
    });
    setInstitutionDialogOpen(true);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("logo", file);

    try {
      const response = await fetch("/api/university/upload-logo", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to upload logo");
      }

      const data = await response.json();
      institutionForm.setValue("logo", data.logoPath);
      setLogoPreview(data.logoPath);
      
      toast({
        title: "Logo uploaded",
        description: "Institution logo has been uploaded successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmitInstitution = (data: z.infer<typeof institutionSchema>) => {
    // Transform form data to API format
    const apiData: any = {
      ...data,
      topDisciplines: data.topDisciplines 
        ? data.topDisciplines.split(',').map(d => d.trim()).filter(Boolean)
        : undefined,
      topCourses: data.topCourses
        ? data.topCourses.split(',').map(c => c.trim()).filter(Boolean)
        : undefined,
      scholarshipPercentageMin: data.hasScholarship ? data.scholarshipPercentageMin : undefined,
      scholarshipPercentageMax: data.hasScholarship ? data.scholarshipPercentageMax : undefined,
    };
    
    // Remove hasScholarship as it's not a database field
    delete apiData.hasScholarship;
    
    if (editingInstitution) {
      updateInstitutionMutation.mutate({ id: editingInstitution.id, data: apiData });
    } else {
      createInstitutionMutation.mutate(apiData);
    }
  };

  // Course handlers
  const handleCreateCourse = () => {
    setEditingCourse(null);
    courseForm.reset();
    setCourseDialogOpen(true);
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    courseForm.reset({
      universityId: course.universityId,
      title: course.title,
      description: course.description || "",
      duration: course.duration || "",
      fees: course.fees as any,
      level: course.level || "",
      subject: course.subject || "",
    });
    setCourseDialogOpen(true);
  };

  const handleSubmitCourse = (data: z.infer<typeof courseSchema>) => {
    if (editingCourse) {
      updateCourseMutation.mutate({ id: editingCourse.id, data });
    } else {
      createCourseMutation.mutate(data);
    }
  };

  // Sidebar styling - compact and responsive
  const sidebarStyle = {
    "--sidebar-width": "14rem",        // Compact: 224px (was 256px)
    "--sidebar-width-icon": "3.5rem",  // Icon mode: 56px (was 72px)
  } as React.CSSProperties;

  // Handle tab change with scroll to top
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex min-h-screen w-full">
        {/* Left Sidebar */}
        <AdminSidebar 
          activeTab={activeTab} 
          onTabChange={handleTabChange} 
          hasFullAdminAccess={hasFullAdminAccess} 
        />

        {/* Main Content Area */}
        <div className="flex flex-col flex-1">
          {/* Top Header with Breadcrumb */}
          <header className="sticky top-0 z-30 flex items-center gap-4 border-b bg-background px-4 md:px-6 py-3">
            <SidebarTrigger className="lg:hidden" data-testid="button-sidebar-toggle" />
            <div className="flex flex-1 items-center justify-between gap-4">
              <Breadcrumb data-testid="breadcrumb">
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link href="/admin/dashboard" data-testid="breadcrumb-home">
                        <Home className="h-4 w-4" />
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage data-testid="breadcrumb-current">Admin Dashboard</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <Button variant="outline" size="sm" asChild data-testid="button-public-site" className="hidden md:flex">
                <Link href="/">
                  <Home className="h-4 w-4 mr-2" />
                  Public Site
                </Link>
              </Button>
            </div>
          </header>

          {/* Main Content */}
          <div className="flex-1">
            <div className="mx-auto w-full max-w-7xl px-4 md:px-6 py-4 md:py-6">
              {/* Responsive Grid: Stacked on mobile, 2-column on xl+ */}
              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)] gap-6 md:gap-8">
                {/* Main Column */}
                <main className="space-y-4 md:space-y-6 min-w-0">
                  <div>
                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold" data-testid="text-dashboard-title">
                      {isConsultant 
                        ? "Consultant Dashboard" 
                        : isSuperAdmin 
                          ? "Super Admin Dashboard" 
                          : "Admin Dashboard"}
                    </h1>
                    <p className="text-muted-foreground text-sm md:text-base mt-1">
                      {isConsultant 
                        ? "Manage student applications and leads" 
                        : "Manage all platform users, institutions, and courses"}
                    </p>
                  </div>

                  <div className="space-y-6 md:space-y-8">
        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="space-y-6 md:space-y-8">
          {/* Stats */}
          <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userStats.total}</div>
                <p className="text-xs text-muted-foreground">
                  {userStats.active} active, {userStats.inactive} inactive
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userStats.students}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Universities</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userStats.universities}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Admins</CardTitle>
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userStats.admins}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Create Button */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>View and manage all platform users</CardDescription>
                </div>
                <Button onClick={handleCreateUser} data-testid="button-create-user">
                  <Plus className="h-4 w-4 mr-2" />
                  Create User
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Bulk Actions Toolbar */}
              {selectedUsers.size > 0 && (
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {selectedUsers.size} user(s) selected
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Delete ${selectedUsers.size} selected user(s)?`)) {
                          bulkDeleteUsersMutation.mutate(Array.from(selectedUsers));
                        }
                      }}
                      disabled={bulkDeleteUsersMutation.isPending}
                      data-testid="button-bulk-delete-users"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selected
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedUsers(new Set())}
                      data-testid="button-clear-selection-users"
                    >
                      Clear Selection
                    </Button>
                  </div>
                </div>
              )}

              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-users"
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-filter-type">
                    <SelectValue placeholder="User Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="student">Students</SelectItem>
                    <SelectItem value="university">Universities</SelectItem>
                    <SelectItem value="admin">Super Admins</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-filter-status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto border rounded-md sm:rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={filteredUsers && filteredUsers.length > 0 && selectedUsers.size === filteredUsers.length}
                          onCheckedChange={() => filteredUsers && toggleSelectAllUsers(filteredUsers)}
                          data-testid="checkbox-select-all-users"
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">Loading...</TableCell>
                      </TableRow>
                    ) : filteredUsers && filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                          <TableCell>
                            <Checkbox
                              checked={selectedUsers.has(user.id)}
                              onCheckedChange={() => toggleSelectUser(user.id)}
                              data-testid={`checkbox-user-${user.id}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {user.firstName} {user.lastName}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={user.userType === "admin" ? "default" : "secondary"}>
                              {formatUserType(user.userType)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={user.role || "user"}
                              onValueChange={(value) => updateRoleMutation.mutate({
                                userId: user.id,
                                userType: user.userType,
                                role: value,
                              })}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="super_admin">Super Admin</SelectItem>
                                <SelectItem value="support_manager">Support Manager</SelectItem>
                                <SelectItem value="support_staff">Support Staff</SelectItem>
                                <SelectItem value="operations_staff">Operations Staff</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateStatusMutation.mutate({
                                userId: user.id,
                                isActive: !user.isActive,
                              })}
                              data-testid={`button-toggle-status-${user.id}`}
                            >
                              {user.isActive ? (
                                <><ShieldCheck className="h-4 w-4 mr-1 text-green-600" /> Active</>
                              ) : (
                                <><ShieldOff className="h-4 w-4 mr-1 text-red-600" /> Inactive</>
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditUser(user)}
                                data-testid={`button-edit-user-${user.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingUser(user)}
                                data-testid={`button-delete-user-${user.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">No users found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
        )}

        {/* Institutions Tab */}
        {activeTab === "institutions" && (
          <div className="space-y-6 md:space-y-8">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                  <CardTitle>Institution Management</CardTitle>
                  <CardDescription>View and manage all institutions</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setAiExtractorDialogOpen(true)} variant="outline" data-testid="button-ai-extract">
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI Extract
                  </Button>
                  <Button onClick={handleCreateInstitution} data-testid="button-create-institution">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Institution
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Bulk Actions Toolbar */}
              {selectedInstitutions.size > 0 && (
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {selectedInstitutions.size} institution(s) selected
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Delete ${selectedInstitutions.size} selected institution(s)?`)) {
                          bulkDeleteInstitutionsMutation.mutate(Array.from(selectedInstitutions));
                        }
                      }}
                      disabled={bulkDeleteInstitutionsMutation.isPending}
                      data-testid="button-bulk-delete-institutions"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selected
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedInstitutions(new Set())}
                      data-testid="button-clear-selection-institutions"
                    >
                      Clear Selection
                    </Button>
                  </div>
                </div>
              )}

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or country..."
                  value={institutionSearchQuery}
                  onChange={(e) => setInstitutionSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-institutions"
                />
              </div>

              {/* Institutions Table */}
              <div className="overflow-x-auto border rounded-md sm:rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={filteredInstitutions && filteredInstitutions.length > 0 && selectedInstitutions.size === filteredInstitutions.length}
                          onCheckedChange={() => filteredInstitutions && toggleSelectAllInstitutions(filteredInstitutions)}
                          data-testid="checkbox-select-all-institutions"
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Provider Type</TableHead>
                      <TableHead>Approval Status</TableHead>
                      <TableHead>Active Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {institutionsLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">Loading...</TableCell>
                      </TableRow>
                    ) : filteredInstitutions && filteredInstitutions.length > 0 ? (
                      filteredInstitutions.map((institution) => (
                        <TableRow key={institution.id} data-testid={`row-institution-${institution.id}`}>
                          <TableCell>
                            <Checkbox
                              checked={selectedInstitutions.has(institution.id)}
                              onCheckedChange={() => toggleSelectInstitution(institution.id)}
                              data-testid={`checkbox-institution-${institution.id}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{institution.name}</TableCell>
                          <TableCell>{institution.country}</TableCell>
                          <TableCell>{institution.providerType || "N/A"}</TableCell>
                          <TableCell>
                            {institution.approvalStatus === "approved" && (
                              <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Approved
                              </Badge>
                            )}
                            {institution.approvalStatus === "pending" && (
                              <Badge variant="secondary">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                            {institution.approvalStatus === "rejected" && (
                              <Badge variant="destructive">
                                <XCircle className="h-3 w-3 mr-1" />
                                Rejected
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleInstitutionStatusMutation.mutate({
                                id: institution.id,
                                isActive: !institution.isActive,
                              })}
                              data-testid={`button-toggle-institution-${institution.id}`}
                            >
                              {institution.isActive ? (
                                <Badge variant="default" className="cursor-pointer">
                                  <ShieldCheck className="h-3 w-3 mr-1" />
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="cursor-pointer">
                                  <ShieldOff className="h-3 w-3 mr-1" />
                                  Inactive
                                </Badge>
                              )}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              {/* Approve/Reject buttons for pending institutions */}
                              {hasFullAdminAccess && institution.approvalStatus === "pending" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => approveInstitutionMutation.mutate(institution.id)}
                                    disabled={approveInstitutionMutation.isPending}
                                    data-testid={`button-approve-institution-${institution.id}`}
                                  >
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setRejectingInstitution(institution)}
                                    data-testid={`button-reject-institution-${institution.id}`}
                                  >
                                    <XCircle className="h-4 w-4 text-destructive" />
                                  </Button>
                                </>
                              )}
                              {/* Edit button (only for full admins) */}
                              {hasFullAdminAccess && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditInstitution(institution)}
                                  data-testid={`button-edit-institution-${institution.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {/* Delete button (only for full admins) */}
                              {hasFullAdminAccess && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeletingInstitution(institution)}
                                  data-testid={`button-delete-institution-${institution.id}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">No institutions found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
        )}

        {/* Courses Tab */}
        {activeTab === "courses" && (
          <div className="space-y-6 md:space-y-8">
          {/* Stats */}
          <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{courseStats.total}</div>
                <p className="text-xs text-muted-foreground">
                  {courseStats.active} active, {courseStats.inactive} inactive
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{courseStats.active}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Inactive Courses</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{courseStats.inactive}</div>
              </CardContent>
            </Card>
          </div>

          {/* Course Management */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                  <CardTitle>Course Management</CardTitle>
                  <CardDescription>
                    {isConsultant ? "View all courses" : "View and manage all courses"}
                  </CardDescription>
                </div>
                {/* Only full admins (super_admin & support_manager) can create courses */}
                {hasFullAdminAccess && (
                  <div className="flex gap-2">
                    {isSuperAdmin && (
                      <Button onClick={() => setAiCourseExtractorDialogOpen(true)} variant="outline" data-testid="button-ai-extract-course">
                        <Sparkles className="h-4 w-4 mr-2" />
                        AI Extract
                      </Button>
                    )}
                    <Button onClick={handleCreateCourse} data-testid="button-create-course">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Course
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Bulk Actions Toolbar */}
              {selectedCourses.size > 0 && (
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {selectedCourses.size} course(s) selected
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Delete ${selectedCourses.size} selected course(s)?`)) {
                          bulkDeleteCoursesMutation.mutate(Array.from(selectedCourses));
                        }
                      }}
                      disabled={bulkDeleteCoursesMutation.isPending}
                      data-testid="button-bulk-delete-courses"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selected
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedCourses(new Set())}
                      data-testid="button-clear-selection-courses"
                    >
                      Clear Selection
                    </Button>
                  </div>
                </div>
              )}

              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by course title or institution..."
                    value={courseSearchQuery}
                    onChange={(e) => setCourseSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-courses"
                  />
                </div>
                <Select value={courseStatusFilter} onValueChange={setCourseStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-filter-course-status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Courses Table */}
              <div className="overflow-x-auto border rounded-md sm:rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={filteredCourses && filteredCourses.length > 0 && selectedCourses.size === filteredCourses.length}
                          onCheckedChange={() => filteredCourses && toggleSelectAllCourses(filteredCourses)}
                          data-testid="checkbox-select-all-courses"
                        />
                      </TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Institution</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Fees</TableHead>
                      <TableHead>Approval</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coursesLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center">Loading...</TableCell>
                      </TableRow>
                    ) : filteredCourses && filteredCourses.length > 0 ? (
                      filteredCourses.map((course) => (
                        <TableRow key={course.id} data-testid={`row-course-${course.id}`}>
                          <TableCell>
                            <Checkbox
                              checked={selectedCourses.has(course.id)}
                              onCheckedChange={() => toggleSelectCourse(course.id)}
                              data-testid={`checkbox-course-${course.id}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{course.title}</TableCell>
                          <TableCell>{course.institutionName}</TableCell>
                          <TableCell>{course.level || "-"}</TableCell>
                          <TableCell>{course.duration || "-"}</TableCell>
                          <TableCell>
                            {course.fees ? `$${Number(course.fees).toLocaleString()}` : "-"}
                          </TableCell>
                          <TableCell>
                            {/* Approval Status Badge */}
                            {course.approvalStatus === 'pending' && (
                              <Badge variant="secondary" data-testid={`badge-course-approval-${course.id}`}>
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                            {course.approvalStatus === 'approved' && (
                              <Badge variant="default" className="bg-green-600 hover:bg-green-700" data-testid={`badge-course-approval-${course.id}`}>
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Approved
                              </Badge>
                            )}
                            {course.approvalStatus === 'rejected' && (
                              <Badge variant="destructive" data-testid={`badge-course-approval-${course.id}`}>
                                <XCircle className="h-3 w-3 mr-1" />
                                Rejected
                              </Badge>
                            )}
                            {/* Approve/Reject buttons for pending courses */}
                            {hasFullAdminAccess && course.approvalStatus === 'pending' && (
                              <div className="flex gap-1 mt-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => approveCourseMutation.mutate(course.id)}
                                  disabled={approveCourseMutation.isPending}
                                  data-testid={`button-approve-course-${course.id}`}
                                >
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setRejectingCourse(course)}
                                  data-testid={`button-reject-course-${course.id}`}
                                >
                                  <XCircle className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {/* Only full admins can change status */}
                            {hasFullAdminAccess ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleCourseStatusMutation.mutate({
                                  id: course.id,
                                  isActive: !course.isActive,
                                })}
                                data-testid={`button-toggle-course-${course.id}`}
                              >
                                {course.isActive ? (
                                  <Badge variant="default" className="cursor-pointer">
                                    <ShieldCheck className="h-3 w-3 mr-1" />
                                    Active
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="cursor-pointer">
                                    <ShieldOff className="h-3 w-3 mr-1" />
                                    Inactive
                                  </Badge>
                                )}
                              </Button>
                            ) : (
                              <Badge variant={course.isActive ? "default" : "secondary"}>
                                {course.isActive ? "Active" : "Inactive"}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {/* Only full admins can edit/delete */}
                            {hasFullAdminAccess && (
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditCourse(course)}
                                  data-testid={`button-edit-course-${course.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeletingCourse(course)}
                                  data-testid={`button-delete-course-${course.id}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center">No courses found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
        )}

        {/* Student Leads Tab */}
        {activeTab === "student-leads" && (
          <div className="space-y-6 md:space-y-8">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                  <CardTitle>Student Leads</CardTitle>
                  <CardDescription>View all registered students on the platform</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, nationality..."
                  value={studentLeadSearchQuery}
                  onChange={(e) => setStudentLeadSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-student-leads"
                />
              </div>

              {/* Table */}
              <div className="overflow-x-auto border rounded-md sm:rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Nationality</TableHead>
                      <TableHead>Education Level</TableHead>
                      <TableHead>Field of Study</TableHead>
                      <TableHead>Profile Status</TableHead>
                      <TableHead>Registered</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentLeadsLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          Loading student leads...
                        </TableCell>
                      </TableRow>
                    ) : !studentLeads || studentLeads.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No student leads found
                        </TableCell>
                      </TableRow>
                    ) : (
                      studentLeads
                        .filter((lead) => {
                          const searchLower = studentLeadSearchQuery.toLowerCase();
                          return (
                            !searchLower ||
                            lead.email?.toLowerCase().includes(searchLower) ||
                            lead.firstName?.toLowerCase().includes(searchLower) ||
                            lead.lastName?.toLowerCase().includes(searchLower) ||
                            lead.nationality?.toLowerCase().includes(searchLower)
                          );
                        })
                        .map((lead) => (
                          <TableRow key={lead.userId} data-testid={`row-student-lead-${lead.userId}`}>
                            <TableCell className="font-medium">
                              {lead.firstName && lead.lastName
                                ? `${lead.firstName} ${lead.lastName}`
                                : 'Not set'}
                            </TableCell>
                            <TableCell>{lead.email || 'N/A'}</TableCell>
                            <TableCell>{lead.phone || 'N/A'}</TableCell>
                            <TableCell>{lead.nationality || 'N/A'}</TableCell>
                            <TableCell>{lead.educationLevel || 'N/A'}</TableCell>
                            <TableCell>{lead.fieldOfStudy || 'N/A'}</TableCell>
                            <TableCell>
                              <Badge variant={lead.profileComplete ? "default" : "secondary"}>
                                {lead.profileComplete ? 'Complete' : 'Incomplete'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {lead.createdAt
                                ? new Date(lead.createdAt).toLocaleDateString()
                                : 'N/A'}
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
        )}

        {/* Inquiry Leads Tab */}
        {activeTab === "inquiry-leads" && (
          <div className="space-y-6 md:space-y-8">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                  <CardTitle>Inquiry Leads</CardTitle>
                  <CardDescription>Manage course information requests from prospective students</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto border rounded-md sm:rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Visa Status</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>University</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inquiryLeadsLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          Loading inquiry leads...
                        </TableCell>
                      </TableRow>
                    ) : !inquiryLeads || inquiryLeads.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No inquiry leads found
                        </TableCell>
                      </TableRow>
                    ) : (
                      inquiryLeads.map((lead) => (
                        <TableRow key={lead.id} data-testid={`row-inquiry-lead-${lead.id}`}>
                          <TableCell className="font-medium" data-testid={`text-lead-name-${lead.id}`}>
                            {lead.firstName} {lead.lastName}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 text-sm">
                              <span data-testid={`text-lead-email-${lead.id}`}>{lead.email}</span>
                              <span className="text-muted-foreground" data-testid={`text-lead-phone-${lead.id}`}>{lead.phone}</span>
                            </div>
                          </TableCell>
                          <TableCell data-testid={`text-lead-visa-${lead.id}`}>
                            <Badge variant="outline">
                              {lead.visaStatus.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell data-testid={`text-lead-course-${lead.id}`}>
                            {lead.course?.title || 'N/A'}
                          </TableCell>
                          <TableCell data-testid={`text-lead-university-${lead.id}`}>
                            {lead.university?.name || 'N/A'}
                          </TableCell>
                          <TableCell data-testid={`status-lead-${lead.id}`}>
                            <Badge
                              variant={
                                lead.status === 'new' ? 'default' :
                                lead.status === 'contacted' ? 'secondary' :
                                lead.status === 'converted' ? 'default' :
                                'secondary'
                              }
                            >
                              {lead.status}
                            </Badge>
                          </TableCell>
                          <TableCell data-testid={`text-lead-date-${lead.id}`}>
                            {lead.createdAt
                              ? new Date(lead.createdAt).toLocaleDateString()
                              : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
        )}

        {/* Applications Tab */}
        {activeTab === "applications" && (
          <div className="space-y-6 md:space-y-8">
            <AdminApplicationsKanban />
          </div>
        )}

        {/* Data Import Tab */}
        {activeTab === "blogs" && (
          <div className="space-y-6 md:space-y-8">
            <AdminBlogManagement />
          </div>
        )}

        {activeTab === "data-import" && (
          <div className="space-y-6 md:space-y-8">
            <AdminCsvImportPanel />
          </div>
        )}

        {activeTab === "web-scraping" && (
          <div className="space-y-6 md:space-y-8">
            <AdminScrapingPanel />
          </div>
        )}

        {/* Activity Logs Tab */}
        {activeTab === "activity-logs" && (
          <div className="space-y-6 md:space-y-8">
            <ActivityFeed
              title="Platform Activity Feed"
              showFilters={true}
              limit={50}
            />
          </div>
        )}
      </div>
              </main>

              {/* Right Rail - Quick Actions (Stacks below on mobile, sidebar on xl+) */}
              <aside className="flex flex-col gap-4" data-testid="admin-quick-actions">
                {/* Quick Create Actions */}
                {hasFullAdminAccess && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Button 
                        className="w-full justify-start" 
                        variant="outline"
                        onClick={() => {
                          setEditingUser(null);
                          userForm.reset();
                          setUserDialogOpen(true);
                        }}
                        data-testid="quick-action-new-user"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        New User
                      </Button>
                      <Button 
                        className="w-full justify-start" 
                        variant="outline"
                        onClick={() => {
                          setEditingInstitution(null);
                          institutionForm.reset();
                          setInstitutionDialogOpen(true);
                        }}
                        data-testid="quick-action-new-institution"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        New Institution
                      </Button>
                      <Button 
                        className="w-full justify-start" 
                        variant="outline"
                        onClick={() => {
                          setEditingCourse(null);
                          courseForm.reset();
                          setCourseDialogOpen(true);
                        }}
                        data-testid="quick-action-new-course"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        New Course
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* AI Extractors */}
                {hasFullAdminAccess && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        AI Tools
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Button 
                        className="w-full justify-start" 
                        variant="outline"
                        onClick={() => setAiExtractorDialogOpen(true)}
                        data-testid="quick-action-ai-institution"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        AI Institution Extract
                      </Button>
                      <Button 
                        className="w-full justify-start" 
                        variant="outline"
                        onClick={() => setAiCourseExtractorDialogOpen(true)}
                        data-testid="quick-action-ai-course"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        AI Course Extract
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Quick Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {hasFullAdminAccess && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Users</span>
                          <span className="font-semibold">{userStats.total}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Institutions</span>
                          <span className="font-semibold">{institutionStats.total}</span>
                        </div>
                      </>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Courses</span>
                      <span className="font-semibold">{courseStats.total}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Applications</span>
                      <span className="font-semibold">{applications?.length || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Student Leads</span>
                      <span className="font-semibold">{studentLeads?.length || 0}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Pending Approvals */}
                {hasFullAdminAccess && institutionStats.pending > 0 && (
                  <Card className="border-orange-500/50">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2 text-orange-600">
                        <Clock className="h-4 w-4" />
                        Pending Approvals
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Institutions</span>
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
                          {institutionStats.pending}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </aside>
              </div>
            </div>
          </div>
        </div>

      {/* User Create/Edit Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Create User"}</DialogTitle>
            <DialogDescription>
              {editingUser ? "Update user information" : "Create a new user account"}
            </DialogDescription>
          </DialogHeader>
          <Form {...userForm}>
            <form onSubmit={userForm.handleSubmit(handleSubmitUser)} className="space-y-4">
              <FormField
                control={userForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="user@example.com" data-testid="input-user-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={userForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{editingUser ? "Password (leave blank to keep current)" : "Password"}</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" placeholder={editingUser ? "Leave blank to keep current" : "Min. 8 characters"} data-testid="input-user-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={userForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="John" data-testid="input-user-firstname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={userForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Doe" data-testid="input-user-lastname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={userForm.control}
                name="userType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-user-type">
                          <SelectValue placeholder="Select user type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="university">University</SelectItem>
                        <SelectItem value="admin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setUserDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createUserMutation.isPending || updateUserMutation.isPending} data-testid="button-submit-user">
                  {editingUser ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Institution Create/Edit Dialog */}
      <Dialog open={institutionDialogOpen} onOpenChange={setInstitutionDialogOpen}>
        <DialogContent 
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          onPointerDownOutside={(e) => {
            // Prevent dialog from closing when clicking on Google Places autocomplete dropdown
            // Google renders .pac-container outside React tree at document.body level
            // Radix wraps the event in CustomEvent - must access detail.originalEvent.target
            const originalEvent = (e as any).detail?.originalEvent;
            if (originalEvent && !e.defaultPrevented) {
              const target = originalEvent.target as HTMLElement;
              if (target?.closest('.pac-container')) {
                e.preventDefault();
              }
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{editingInstitution ? "Edit Institution" : "Create Institution"}</DialogTitle>
            <DialogDescription>
              {editingInstitution ? "Update institution information" : "Create a new institution"}
            </DialogDescription>
          </DialogHeader>
          <Form {...institutionForm}>
            <form onSubmit={institutionForm.handleSubmit(handleSubmitInstitution)} className="space-y-4">
              {/* Logo Upload */}
              <div className="space-y-3">
                <FormLabel>Institution Logo</FormLabel>
                <FormDescription className="text-xs">
                  Upload any size image - it will be automatically resized to 160x160px and displayed as circular
                </FormDescription>
                <div className="flex items-center gap-4">
                  {logoPreview && (
                    <div className="w-20 h-20 rounded-full border border-[#F0F0F0] bg-white flex items-center justify-center overflow-hidden">
                      <img
                        src={logoPreview}
                        alt="Institution logo"
                        className="w-full h-full object-cover"
                        data-testid="img-admin-logo-preview"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      ref={logoFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      data-testid="input-admin-logo-file"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => logoFileInputRef.current?.click()}
                      data-testid="button-admin-upload-logo"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {logoPreview ? "Change Logo" : "Upload Logo"}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Any size accepted - automatically resized to 160x160px
                    </p>
                  </div>
                </div>
              </div>

              {/* Name */}
              <FormField
                control={institutionForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Institution/University name" data-testid="input-admin-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Country */}
              <FormField
                control={institutionForm.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Australia" data-testid="input-admin-country" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Provider Type - Select Dropdown */}
              <FormField
                control={institutionForm.control}
                name="providerType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-admin-providerType">
                          <SelectValue placeholder="Select provider type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROVIDER_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={institutionForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Brief description" rows={3} data-testid="input-admin-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Contact Information */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={institutionForm.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="contact@university.edu" data-testid="input-admin-contactEmail" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={institutionForm.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="+1234567890" data-testid="input-admin-contactPhone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Website */}
              <FormField
                control={institutionForm.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://university.edu" data-testid="input-admin-website" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Established Year and Number of Campuses */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={institutionForm.control}
                  name="establishedYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Established Year</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" placeholder="1950" onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : "")} data-testid="input-admin-establishedYear" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={institutionForm.control}
                  name="numberOfCampuses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Campuses</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" placeholder="1" onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : "")} data-testid="input-admin-numberOfCampuses" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Top Disciplines */}
              <FormField
                control={institutionForm.control}
                name="topDisciplines"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Top Disciplines (comma-separated)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Computer Science, Business, Engineering" data-testid="input-admin-topDisciplines" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Top Courses */}
              <FormField
                control={institutionForm.control}
                name="topCourses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Top Courses (comma-separated)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Bachelor of IT, Master of Business, Diploma in Nursing" data-testid="input-admin-topCourses" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Gallery Images - Upload, AI Generate, or URL */}
              <GalleryImageManager
                value={institutionForm.watch("institutionGallery") || []}
                onChange={(urls) => institutionForm.setValue("institutionGallery", urls)}
                institutionName={institutionForm.watch("name")}
                institutionLocation={institutionForm.watch("country")}
                institutionProviderType={institutionForm.watch("providerType")}
              />

              {/* Scholarship Toggle */}
              <div className="space-y-3">
                <FormLabel>Does this institution offer scholarships?</FormLabel>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={institutionForm.watch("hasScholarship") === true ? "default" : "outline"}
                    onClick={() => institutionForm.setValue("hasScholarship", true)}
                    data-testid="button-admin-scholarshipYes"
                  >
                    Yes
                  </Button>
                  <Button
                    type="button"
                    variant={institutionForm.watch("hasScholarship") === false ? "default" : "outline"}
                    onClick={() => {
                      institutionForm.setValue("hasScholarship", false);
                      institutionForm.setValue("scholarshipPercentageMin", "" as any);
                      institutionForm.setValue("scholarshipPercentageMax", "" as any);
                    }}
                    data-testid="button-admin-scholarshipNo"
                  >
                    No
                  </Button>
                </div>
                {institutionForm.watch("hasScholarship") === true && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={institutionForm.control}
                      name="scholarshipPercentageMin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Scholarship Min %</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" placeholder="10" onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : "")} data-testid="input-admin-scholarshipPercentageMin" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={institutionForm.control}
                      name="scholarshipPercentageMax"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Scholarship Max %</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" placeholder="20" onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : "")} data-testid="input-admin-scholarshipPercentageMax" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>

              {/* Dynamic Campus Addresses */}
              {institutionForm.watch("numberOfCampuses") && Number(institutionForm.watch("numberOfCampuses")) > 0 && (
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <FormLabel>Campus Addresses</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      {institutionForm.watch("numberOfCampuses")} campus{Number(institutionForm.watch("numberOfCampuses") ?? 0) > 1 ? "es" : ""} to configure
                    </p>
                  </div>
                  {Array.from({ length: Number(institutionForm.watch("numberOfCampuses") ?? 0) }).map((_, index) => {
                    const campusAddresses = institutionForm.watch("campusAddresses") || [];
                    const currentAddress = campusAddresses[index] || { address: "", city: "", state: "", postcode: "", country: "" };

                    return (
                      <div key={index} className="space-y-3 p-4 border rounded-lg bg-muted/30">
                        <h4 className="font-medium text-sm">Campus {index + 1}</h4>
                        
                        <div className="space-y-2">
                          <FormLabel>Street Address</FormLabel>
                          <GoogleAddressAutocomplete
                            value={currentAddress.address || ""}
                            onAddressSelect={(components: AddressComponents) => {
                              // Merge address fields into existing entry to preserve any additional properties
                              const newAddresses = [...(institutionForm.watch("campusAddresses") || [])];
                              newAddresses[index] = {
                                ...currentAddress,
                                address: components.address,
                                city: components.city,
                                state: components.state,
                                postcode: components.postcode,
                                country: components.country,
                              };
                              institutionForm.setValue("campusAddresses", newAddresses);
                            }}
                            onInputChange={(value: string) => {
                              // Allow manual typing
                              const newAddresses = [...(institutionForm.watch("campusAddresses") || [])];
                              newAddresses[index] = { ...currentAddress, address: value };
                              institutionForm.setValue("campusAddresses", newAddresses);
                            }}
                            placeholder="Start typing an address..."
                            testId={`input-admin-campusAddress-${index}`}
                          />
                          <FormDescription className="text-xs">
                            Start typing to search for an address, or enter manually
                          </FormDescription>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <FormLabel>City</FormLabel>
                            <Input
                              value={currentAddress.city || ""}
                              onChange={(e) => {
                                const newAddresses = [...(institutionForm.watch("campusAddresses") || [])];
                                newAddresses[index] = { ...currentAddress, city: e.target.value };
                                institutionForm.setValue("campusAddresses", newAddresses);
                              }}
                              placeholder="Sydney"
                              data-testid={`input-admin-campusCity-${index}`}
                            />
                          </div>

                          <div className="space-y-2">
                            <FormLabel>State/Province</FormLabel>
                            <Input
                              value={currentAddress.state || ""}
                              onChange={(e) => {
                                const newAddresses = [...(institutionForm.watch("campusAddresses") || [])];
                                newAddresses[index] = { ...currentAddress, state: e.target.value };
                                institutionForm.setValue("campusAddresses", newAddresses);
                              }}
                              placeholder="NSW"
                              data-testid={`input-admin-campusState-${index}`}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <FormLabel>Postcode</FormLabel>
                            <Input
                              value={currentAddress.postcode || ""}
                              onChange={(e) => {
                                const newAddresses = [...(institutionForm.watch("campusAddresses") || [])];
                                newAddresses[index] = { ...currentAddress, postcode: e.target.value };
                                institutionForm.setValue("campusAddresses", newAddresses);
                              }}
                              placeholder="2000"
                              data-testid={`input-admin-campusPostcode-${index}`}
                            />
                          </div>

                          <div className="space-y-2">
                            <FormLabel>Country</FormLabel>
                            <Input
                              value={currentAddress.country || ""}
                              onChange={(e) => {
                                const newAddresses = [...(institutionForm.watch("campusAddresses") || [])];
                                newAddresses[index] = { ...currentAddress, country: e.target.value };
                                institutionForm.setValue("campusAddresses", newAddresses);
                              }}
                              placeholder="Australia"
                              data-testid={`input-admin-campusCountry-${index}`}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setInstitutionDialogOpen(false)} data-testid="button-admin-cancel">
                  Cancel
                </Button>
                <Button type="submit" disabled={createInstitutionMutation.isPending || updateInstitutionMutation.isPending} data-testid="button-admin-submit">
                  {editingInstitution ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* AI Institution Data Extractor Dialog */}
      <Dialog open={aiExtractorDialogOpen} onOpenChange={setAiExtractorDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Institution Data Extractor
            </DialogTitle>
            <DialogDescription>
              Enter an institution's website URL and AI will automatically extract profile information for your review.
            </DialogDescription>
          </DialogHeader>
          <AIInstitutionExtractor
            onDataApproved={(approvedData) => {
              // Pre-fill the institution form with approved data
              // Convert arrays to comma-separated strings for form compatibility
              institutionForm.reset({
                name: approvedData.name || "",
                country: approvedData.country || "",
                description: approvedData.description || "",
                contactEmail: approvedData.contactEmail || "",
                contactPhone: approvedData.contactPhone || "",
                website: approvedData.website || "",
                providerType: approvedData.providerType || "",
                topDisciplines: Array.isArray(approvedData.topDisciplines) 
                  ? approvedData.topDisciplines.join(", ") 
                  : (approvedData.topDisciplines || ""),
                topCourses: Array.isArray(approvedData.topCourses)
                  ? approvedData.topCourses.join(", ")
                  : (approvedData.topCourses || ""),
                numberOfCampuses: approvedData.numberOfCampuses || undefined,
                establishedYear: approvedData.establishedYear || undefined,
                scholarshipPercentageMin: approvedData.scholarshipPercentageMin || undefined,
                scholarshipPercentageMax: approvedData.scholarshipPercentageMax || undefined,
                campusAddresses: approvedData.campusAddresses || [],
                logo: "",
                institutionGallery: [],
              });

              // Close AI extractor and open institution form
              setAiExtractorDialogOpen(false);
              setEditingInstitution(null);
              setInstitutionDialogOpen(true);

              toast({
                title: "Data loaded",
                description: "AI-extracted data has been loaded into the institution form. Review and submit when ready.",
              });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation */}
      <AlertDialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user <strong>{deletingUser?.firstName} {deletingUser?.lastName}</strong> and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingUser && deleteUserMutation.mutate(deletingUser.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-user"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Institution Confirmation */}
      <AlertDialog open={!!deletingInstitution} onOpenChange={() => setDeletingInstitution(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deletingInstitution?.name}</strong> and all associated courses. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingInstitution && deleteInstitutionMutation.mutate(deletingInstitution.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-institution"
            >
              Delete Institution
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AI Course Data Extractor Dialog */}
      <Dialog open={aiCourseExtractorDialogOpen} onOpenChange={setAiCourseExtractorDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Course Data Extractor
            </DialogTitle>
            <DialogDescription>
              Enter a course's website URL and AI will automatically extract comprehensive course information for your review.
            </DialogDescription>
          </DialogHeader>
          <AICourseExtractor
            onDataApproved={(approvedData) => {
              // Close the AI extractor dialog
              setAiCourseExtractorDialogOpen(false);
              
              // Prepare form data by merging AI-extracted data with defaults
              const formData = {
                universityId: approvedData.universityId || "",
                title: approvedData.title || "",
                description: approvedData.description || "",
                subject: approvedData.subject || "",
                level: approvedData.level || "",
                duration: approvedData.duration || "",
                fees: (approvedData.fees !== null && approvedData.fees !== undefined) ? approvedData.fees : ("" as any),
              };
              
              // Reset form with the merged data - this sets all fields at once
              courseForm.reset(formData);
              
              // Open the course creation dialog
              setEditingCourse(null);
              setCourseDialogOpen(true);

              toast({
                title: "Course data loaded",
                description: "AI-extracted course information has been loaded into the form. Review and submit when ready.",
              });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Course Create/Edit Dialog */}
      <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingCourse ? "Edit Course" : "Create Course"}</DialogTitle>
            <DialogDescription>
              {editingCourse ? "Update course information" : "Create a new course"}
            </DialogDescription>
          </DialogHeader>
          <Form {...courseForm}>
            <form onSubmit={courseForm.handleSubmit(handleSubmitCourse)} className="space-y-4">
              <FormField
                control={courseForm.control}
                name="universityId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Institution</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-course-institution">
                          <SelectValue placeholder="Select institution" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {institutions?.map((institution) => (
                          <SelectItem key={institution.id} value={institution.id}>
                            {institution.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={courseForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Bachelor of Computer Science" data-testid="input-course-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={courseForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Course description..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={courseForm.control}
                  name="level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Level</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Certificate">Certificate</SelectItem>
                          <SelectItem value="Diploma">Diploma</SelectItem>
                          <SelectItem value="Bachelor">Bachelor</SelectItem>
                          <SelectItem value="Master">Master</SelectItem>
                          <SelectItem value="Doctorate">Doctorate</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={courseForm.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Computer Science" data-testid="input-course-subject" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={courseForm.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="3 years" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={courseForm.control}
                  name="fees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fees ($)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" placeholder="30000" data-testid="input-course-fees" onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : "")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCourseDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createCourseMutation.isPending || updateCourseMutation.isPending} data-testid="button-submit-course">
                  {editingCourse ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Course Confirmation */}
      <AlertDialog open={!!deletingCourse} onOpenChange={() => setDeletingCourse(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the course <strong>{deletingCourse?.title}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCourse && deleteCourseMutation.mutate(deletingCourse.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-course"
            >
              Delete Course
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Institution Dialog */}
      <Dialog open={!!rejectingInstitution} onOpenChange={(open) => {
        if (!open) {
          setRejectingInstitution(null);
          setRejectionReason("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Institution</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting <strong>{rejectingInstitution?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Rejection Reason</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Please provide a clear reason for the rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                data-testid="input-rejection-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setRejectingInstitution(null);
                setRejectionReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (rejectingInstitution && rejectionReason.trim()) {
                  rejectInstitutionMutation.mutate({
                    id: rejectingInstitution.id,
                    reason: rejectionReason.trim(),
                  });
                }
              }}
              disabled={!rejectionReason.trim() || rejectInstitutionMutation.isPending}
              data-testid="button-confirm-reject-institution"
            >
              Reject Institution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Course Dialog */}
      <Dialog open={!!rejectingCourse} onOpenChange={(open) => {
        if (!open) {
          setRejectingCourse(null);
          setCourseRejectionReason("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Course</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting <strong>{rejectingCourse?.title}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="course-rejection-reason">Rejection Reason</Label>
              <Textarea
                id="course-rejection-reason"
                placeholder="Please provide a clear reason for the rejection..."
                value={courseRejectionReason}
                onChange={(e) => setCourseRejectionReason(e.target.value)}
                rows={4}
                data-testid={rejectingCourse ? `input-course-rejection-reason-${rejectingCourse.id}` : "input-course-rejection-reason"}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setRejectingCourse(null);
                setCourseRejectionReason("");
              }}
              data-testid="button-cancel-reject-course"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (rejectingCourse && courseRejectionReason.trim()) {
                  rejectCourseMutation.mutate({
                    id: rejectingCourse.id,
                    reason: courseRejectionReason.trim(),
                  });
                }
              }}
              disabled={!courseRejectionReason.trim() || rejectCourseMutation.isPending}
              data-testid="button-confirm-reject-course"
            >
              Reject Course
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </SidebarProvider>
  );
}
