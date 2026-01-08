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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Users, Building2, BookOpen, ShieldCheck, ShieldOff, Search, Plus, Edit, Trash2, Home, GraduationCap, FileText, CheckCircle2, Clock, XCircle, Upload, Sparkles, User, LogOut, Menu, X, UserPlus, Eye } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { performLogout } from "@/lib/logout";
import { useSupabaseAuth } from "@/lib/supabase-auth";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { AdminCsvImportPanel } from "@/pages/admin-csv-import";
import { GoogleAddressAutocomplete, AddressComponents } from "@/components/ui/google-address-autocomplete";
import { AIInstitutionExtractor } from "@/components/ai-institution-extractor";
import { AICourseExtractor } from "@/components/ai-course-extractor";
import { GalleryImageManager } from "@/components/gallery-image-manager";
import { AdminMegaSidebar } from "@/components/admin-mega-sidebar";
import { AdminBlogManagement } from "@/components/admin-blog-management";
import { AdminScrapingPanel } from "@/components/admin-scraping-panel";
import { ActivityFeed } from "@/components/activity-feed";
import { AdminApplicationsKanban } from "@/components/admin-applications-kanban";
import { MyTasksPanel } from "@/components/my-tasks-panel";
import { TeamWorkloadPanel } from "@/components/team-workload-panel";
import { UpcomingRemindersPanel } from "@/components/upcoming-reminders-panel";
import { CrmLeadsPanel } from "@/components/crm-leads-panel";
import { CrmContactsPanel } from "@/components/crm-contacts-panel";
import { AdminCmsPanel } from "@/components/admin-cms-panel";
import { AdminAffiliatesPanel } from "@/components/admin-affiliates-panel";
import { AdminRegionsPanel } from "@/components/admin-regions-panel";
import { AdminRoleManagementPanel } from "@/components/admin-role-management-panel";
import { AdminTeamPanel } from "@/components/admin-team-panel";
import { AdminBranchesPanel } from "@/components/admin-branches-panel";
import { NotificationBell } from "@/components/NotificationBell";
import { MessageCircle } from "lucide-react";

interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  userType: string;
  role: string | null;
  roleId: string | null;
  isActive: boolean | null;
  lastLogin: string | null;
  createdAt: string | null;
  approvalStatus: string | null;
}

interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  userType: string;
  isActive: boolean;
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
    name?: string;
    address: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  }> | null;
  approvalStatus: string | null;
  isActive: boolean;
  createdAt: string | null;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  assignedToUserId: string | null;
  createdByName: string | null;
  updatedByName: string | null;
  assignedToName: string | null;
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
// Note: 'Super Admin' is a ROLE, not a user type
const formatUserType = (userType: string): string => {
  const labels: Record<string, string> = {
    platform_admin: "Platform Admin",
    admin: "Admin",
    student: "Student",
    institution_admin: "Institution Admin",
    // Legacy support - map old values
    university: "Institution Admin"
  };
  return labels[userType] || userType;
};

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
    name: z.string().optional(),
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
  subject: z.string().min(1, "Subject is required"),
  level: z.string().optional(),
  discipline: z.string().optional(),
  
  // Duration & Fees
  duration: z.string().optional(),
  durationMonths: z.coerce.number().int().positive().optional().or(z.literal("")),
  durationWeeks: z.coerce.number().int().positive().optional().or(z.literal("")),
  fees: z.coerce.number().positive().optional().or(z.literal("")),
  applicationFees: z.coerce.number().nonnegative().optional().or(z.literal("")),
  costOfLiving: z.coerce.number().positive().optional().or(z.literal("")),
  currency: z.string().optional(),
  
  // Location & Dates
  location: z.string().optional(),
  country: z.string().optional(),
  startDate: z.string().optional(),
  applicationDeadline: z.string().optional(),
  intakes: z.string().optional(), // Comma-separated, will convert to array
  
  // Requirements
  prerequisites: z.string().optional(),
  eligibilityRequirements: z.string().optional(),
  englishRequirements: z.string().optional(),
  
  // Additional Details
  courseCode: z.string().optional(),
  scholarshipPercentageMin: z.coerce.number().int().min(0).max(100).optional().or(z.literal("")),
  scholarshipPercentageMax: z.coerce.number().int().min(0).max(100).optional().or(z.literal("")),
  thumbnailUrl: z.string().url().optional().or(z.literal("")),
  curriculumUrl: z.string().url().optional().or(z.literal("")),
  images: z.string().optional(), // Comma-separated URLs, will convert to array
  pathways: z.string().optional(), // Comma-separated, will convert to array
  studyAreas: z.string().optional(), // Comma-separated, will convert to array
  careerOutcomes: z.string().optional(), // Comma-separated, will convert to array
  careerPath: z.string().optional(),
});

const PROVIDER_TYPES = ["Institution", "TAFE", "University", "College", "School"];

export default function AdminDashboard() {
  const { toast } = useToast();
  const { user, isLoading, isAuthenticated, isAuthResolved, adminRole, isConsultant, isSuperAdmin, isMarketingExecutive, hasFullAdminAccess, isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const { signOut } = useSupabaseAuth();

  const handleLogout = () => {
    performLogout(signOut);
  };

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "AD";
  };
  
  // Redirect unauthenticated users to admin login
  useEffect(() => {
    if (isAuthResolved && !isAuthenticated) {
      setLocation("/admin/login");
    }
  }, [isAuthResolved, isAuthenticated, setLocation]);

  // Redirect non-admin users to appropriate dashboard
  useEffect(() => {
    if (isAuthResolved && isAuthenticated && !isAdmin) {
      setLocation("/dashboard");
    }
  }, [isAuthResolved, isAuthenticated, isAdmin, setLocation]);

  // Show loading state while auth is being resolved
  if (isLoading || !isAuthResolved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render dashboard content until authentication is confirmed
  if (!isAuthenticated || !isAdmin) {
    return null;
  }
  
  // Default tab based on role: restricted admins use my-tasks, full admins use users
  const defaultTab = (isConsultant || !hasFullAdminAccess) ? "my-tasks" : "users";
  
  // Initialize activeTab from hash with access control validation
  const getInitialTab = () => {
    const hash = window.location.hash.replace('#', '');
    const validTabs = ['my-tasks', 'team-workload', 'users', 'institutions', 'courses', 'crm-leads', 'crm-contacts', 'applications', 'data-import', 'web-scraping', 'activity-logs', 'team', 'blogs', 'website-content', 'regions', 'branches', 'affiliates', 'role-management'];
    const fullAdminOnlyTabs = ['team-workload', 'users', 'data-import', 'web-scraping', 'activity-logs', 'team'];
    const superAdminOnlyTabs = ['role-management'];
    // Marketing Executive can access institutions tab along with full admins
    const marketingExecutiveTabs = ['institutions'];
    
    if (hash && validTabs.includes(hash)) {
      // Check access for super-admin-only tabs (role management requires super admin)
      if (superAdminOnlyTabs.includes(hash) && !isSuperAdmin) {
        return defaultTab;
      }
      // Check access for full-admin-only tabs
      if (fullAdminOnlyTabs.includes(hash) && !hasFullAdminAccess) {
        return defaultTab; // Restricted admin - use default
      }
      // Marketing Executive tabs - accessible by full admins OR marketing executives
      if (marketingExecutiveTabs.includes(hash) && !hasFullAdminAccess && !isMarketingExecutive) {
        return defaultTab;
      }
      return hash; // Valid tab with proper access
    }
    return defaultTab; // No hash or invalid hash
  };
  
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
  const [transferringInstitution, setTransferringInstitution] = useState<Institution | null>(null);
  const [selectedTransferUserId, setSelectedTransferUserId] = useState<string>("");

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
  const [selectedCampusIds, setSelectedCampusIds] = useState<string[]>([]);
  
  // Admin approval state
  const [approvingUser, setApprovingUser] = useState<User | null>(null);
  const [approvalRole, setApprovalRole] = useState<string>("platform_admin");
  const [rejectingUser, setRejectingUser] = useState<User | null>(null);
  const [userRejectionReason, setUserRejectionReason] = useState("");
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string | null>(null);

  // (Student leads state removed - consolidated into CRM Leads)

  // Applications state
  const [applicationSearchQuery, setApplicationSearchQuery] = useState("");
  const [applicationStatusFilter, setApplicationStatusFilter] = useState<string>("all");

  // Logo upload state
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  // Forms
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
      subject: "",
      level: "",
      discipline: "",
      duration: "",
      durationMonths: "" as any,
      durationWeeks: "" as any,
      fees: "" as any,
      applicationFees: "" as any,
      costOfLiving: "" as any,
      currency: "AUD",
      location: "",
      country: "",
      startDate: "",
      applicationDeadline: "",
      intakes: "",
      prerequisites: "",
      eligibilityRequirements: "",
      englishRequirements: "",
      courseCode: "",
      scholarshipPercentageMin: "" as any,
      scholarshipPercentageMax: "" as any,
      thumbnailUrl: "",
      curriculumUrl: "",
      images: "",
      pathways: "",
      studyAreas: "",
      careerOutcomes: "",
      careerPath: "",
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

  // (studentLeads query removed - consolidated into CRM Leads)

  const { data: applications, isLoading: applicationsLoading } = useQuery<Application[]>({
    queryKey: ["/api/super-admin/applications"],
  });

  // Fetch roles for role assignment dropdown (new RBAC system)
  const { data: roles } = useQuery<Role[]>({
    queryKey: ["/api/admin/roles"],
    enabled: hasFullAdminAccess,
  });

  // (inquiryLeads query removed - consolidated into CRM Leads)

  // Fetch selected institution to get its campusAddresses
  const { data: selectedInstitution, isLoading: institutionDetailsLoading } = useQuery<Institution>({
    queryKey: ["/api/institutions", selectedInstitutionId],
    enabled: !!selectedInstitutionId,
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

  // Watch for changes to the selected institution and update state
  useEffect(() => {
    const subscription = courseForm.watch((value, { name }) => {
      if (name === "universityId" && value.universityId) {
        setSelectedInstitutionId(value.universityId);
      }
    });
    return () => subscription.unsubscribe();
  }, [courseForm]);

  // Load existing course campus locations when editing
  useEffect(() => {
    if (editingCourse?.campusLocations && editingCourse.campusLocations.length > 0) {
      setSelectedCampusIds(editingCourse.campusLocations);
    } else if (!editingCourse) {
      // Reset when creating new course
      setSelectedCampusIds([]);
    }
  }, [editingCourse]);

  // User mutations
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
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      return await apiRequest("PATCH", `/api/admin/users/${userId}/assign-role`, { roleId });
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

  // Transfer institution mutation
  const transferInstitutionMutation = useMutation({
    mutationFn: async ({ id, assignedToUserId }: { id: string; assignedToUserId: string }) => {
      return await apiRequest("PATCH", `/api/super-admin/institutions/${id}/transfer`, { assignedToUserId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/institutions"] });
      setTransferringInstitution(null);
      setSelectedTransferUserId("");
      toast({
        title: "Institution transferred",
        description: "Institution has been successfully transferred to the selected user",
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

  // Fetch admin users for transfer dropdown
  const { data: adminUsers } = useQuery<Array<{ id: string; name: string; email: string; roleName: string | null }>>({
    queryKey: ["/api/super-admin/admin-users"],
    enabled: !!transferringInstitution,
  });

  // Course mutations
  const createCourseMutation = useMutation({
    mutationFn: async (data: z.infer<typeof courseSchema>) => {
      // Include campusLocations in the course data
      const courseData = {
        ...data,
        campusLocations: selectedCampusIds.length > 0 ? selectedCampusIds : undefined,
      };
      return await apiRequest("POST", "/api/super-admin/courses", courseData);
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/courses"] });
      setCourseDialogOpen(false);
      courseForm.reset();
      setSelectedCampusIds([]);
      setSelectedInstitutionId(null);
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
      // Include campusLocations in the update data
      const courseData = {
        ...data,
        campusLocations: selectedCampusIds.length > 0 ? selectedCampusIds : undefined,
      };
      return await apiRequest("PATCH", `/api/super-admin/courses/${id}`, courseData);
    },
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/courses"] });
      setCourseDialogOpen(false);
      setEditingCourse(null);
      courseForm.reset();
      setSelectedCampusIds([]);
      setSelectedInstitutionId(null);
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

  // Admin user approval mutation
  const approveUserMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      return await apiRequest("POST", `/api/super-admin/users/${id}/approve`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      setApprovingUser(null);
      setApprovalRole("platform_admin");
      toast({
        title: "User approved",
        description: "The admin user has been approved and notified via email",
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

  // Admin user rejection mutation
  const rejectUserMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      return await apiRequest("POST", `/api/super-admin/users/${id}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      setRejectingUser(null);
      setUserRejectionReason("");
      toast({
        title: "User rejected",
        description: "The admin signup request has been rejected and the user notified",
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
      (filterStatus === "inactive" && !user.isActive) ||
      (filterStatus === "pending" && user.approvalStatus === "pending");
    
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
    institutions: users?.filter(u => u.userType === "institution_admin" || u.userType === "university").length || 0,
    admins: users?.filter(u => u.userType === "admin" || u.userType === "platform_admin").length || 0,
    pending: users?.filter(u => u.approvalStatus === "pending").length || 0,
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

  const handleEditCourse = (course: any) => {
    setEditingCourse(course);
    setSelectedInstitutionId(course.universityId); // Set institution ID to load campuses
    // Load all course fields into the form
    courseForm.reset({
      universityId: course.universityId || "",
      title: course.title || "",
      description: course.description || "",
      subject: course.subject || "",
      level: course.level || "",
      discipline: course.discipline || "",
      
      // Duration & Fees
      duration: course.duration || "",
      durationMonths: course.durationMonths || ("" as any),
      durationWeeks: course.durationWeeks || ("" as any),
      fees: course.fees || ("" as any),
      applicationFees: course.applicationFees || ("" as any),
      costOfLiving: course.costOfLiving || ("" as any),
      currency: course.currency || "AUD",
      
      // Location & Dates
      location: course.location || "",
      country: course.country || "",
      startDate: course.startDate || "",
      applicationDeadline: course.applicationDeadline || "",
      intakes: Array.isArray(course.intakes) ? course.intakes.join(", ") : "",
      
      // Requirements
      prerequisites: course.prerequisites || "",
      eligibilityRequirements: course.eligibilityRequirements || "",
      englishRequirements: course.englishRequirements || "",
      
      // Additional Details
      courseCode: course.courseCode || "",
      scholarshipPercentageMin: course.scholarshipPercentageMin || ("" as any),
      scholarshipPercentageMax: course.scholarshipPercentageMax || ("" as any),
      thumbnailUrl: course.thumbnailUrl || "",
      curriculumUrl: course.curriculumUrl || "",
      images: Array.isArray(course.images) ? course.images.join(", ") : "",
      pathways: Array.isArray(course.pathways) ? course.pathways.join(", ") : "",
      studyAreas: Array.isArray(course.studyAreas) ? course.studyAreas.join(", ") : "",
      careerOutcomes: Array.isArray(course.careerOutcomes) ? course.careerOutcomes.join(", ") : "",
      careerPath: course.careerPath || "",
    });
    setCourseDialogOpen(true);
  };

  const handleSubmitCourse = (data: z.infer<typeof courseSchema>) => {
    // Transform comma-separated strings to arrays for backend
    const transformedData: any = {
      ...data,
      intakes: data.intakes ? data.intakes.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      images: data.images ? data.images.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      pathways: data.pathways ? data.pathways.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      studyAreas: data.studyAreas ? data.studyAreas.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      careerOutcomes: data.careerOutcomes ? data.careerOutcomes.split(',').map(s => s.trim()).filter(Boolean) : undefined,
    };

    if (editingCourse) {
      updateCourseMutation.mutate({ id: editingCourse.id, data: transformedData });
    } else {
      createCourseMutation.mutate(transformedData);
    }
  };

  // Sidebar styling - compact and responsive
  const sidebarStyle = {
    "--sidebar-width": "14rem",        // Compact: 224px (was 256px)
    "--sidebar-width-icon": "3.5rem",  // Icon mode: 56px (was 72px)
  } as React.CSSProperties;

  // Handle tab change with scroll to top
  const handleTabChange = (tab: string) => {
    // Prevent non-super admins from accessing role-management tab
    if (tab === 'role-management' && !isSuperAdmin) {
      return;
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-muted/30">
      {/* Left Mega Sidebar (3-column navigation) - Fixed height, no scroll */}
      <AdminMegaSidebar 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
        hasFullAdminAccess={hasFullAdminAccess}
        isSuperAdmin={isSuperAdmin}
        isMarketingExecutive={isMarketingExecutive}
        isMobileMenuOpen={isMobileMenuOpen}
        onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      {/* Main Content Area - Flex column with fixed header and scrollable content */}
      <div className="flex flex-col flex-1 min-w-0 h-full">
        {/* Top Header with Breadcrumb - Fixed height, never scrolls */}
        <header className="flex-shrink-0 h-14 flex items-center gap-2 border-b bg-background px-4 md:px-6">
          {/* Mobile menu toggle - only visible on mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden flex-shrink-0"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            data-testid="button-mobile-menu-toggle"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          
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
              
              {/* Platform-wide Notifications, Messages, Profile, and Logout */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  data-testid="button-messages"
                  onClick={() => {
                    // Open chat widget or navigate to messages
                    const chatWidget = document.querySelector('[data-testid="chat-widget-toggle"]') as HTMLButtonElement;
                    if (chatWidget) chatWidget.click();
                  }}
                >
                  <MessageCircle className="h-5 w-5" />
                </Button>
                <NotificationBell />
                
                {/* Profile Avatar */}
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Link href="/admin/profile">
                      <Avatar className="h-9 w-9 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all" data-testid="button-admin-profile">
                        {user?.profileImageUrl && (
                          <AvatarImage src={user.profileImageUrl} alt={user.email || "Admin"} />
                        )}
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>My Profile</TooltipContent>
                </Tooltip>

                {/* Logout Button */}
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={handleLogout}
                      data-testid="button-logout"
                    >
                      <LogOut className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Logout</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </header>

          {/* Main Content - Scrollable area */}
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-6xl px-4 md:px-6 py-4">
              {/* Simple single-column layout */}
              <div className="space-y-4">
                {/* Dashboard Header */}
                <div>
                  <h1 className="text-xl md:text-2xl font-bold" data-testid="text-dashboard-title">
                    {user?.roleName 
                      ? `${user.roleName} Dashboard`
                      : isConsultant 
                        ? "Consultant Dashboard" 
                        : isSuperAdmin 
                          ? "Super Admin Dashboard" 
                          : "Admin Dashboard"}
                  </h1>
                  <p className="text-muted-foreground text-xs md:text-sm">
                    {isConsultant 
                      ? "Manage student applications and leads" 
                      : "Manage all platform users, institutions, and courses"}
                  </p>
                </div>

                <div className="space-y-4 md:space-y-5">
        {/* My Tasks Tab */}
        {activeTab === "my-tasks" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <MyTasksPanel />
              </div>
              <div className="lg:col-span-1">
                <UpcomingRemindersPanel />
              </div>
            </div>
          </div>
        )}

        {/* Team Workload Tab */}
        {activeTab === "team-workload" && hasFullAdminAccess && (
          <div className="space-y-4">
            <TeamWorkloadPanel />
          </div>
        )}

        {/* CRM Leads Tab */}
        {activeTab === "crm-leads" && (
          <div className="space-y-4">
            <CrmLeadsPanel />
          </div>
        )}

        {/* CRM Contacts Tab */}
        {activeTab === "crm-contacts" && (
          <div className="space-y-4">
            <CrmContactsPanel />
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="space-y-4">
          {/* Stats - Compact Cards */}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <Card className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Users</p>
                  <p className="text-xl font-bold">{userStats.total}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {userStats.active} active, {userStats.inactive} inactive
                  </p>
                </div>
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
            </Card>

            <Card className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Students</p>
                  <p className="text-xl font-bold">{userStats.students}</p>
                </div>
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
            </Card>

            <Card className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Institutions</p>
                  <p className="text-xl font-bold">{userStats.institutions}</p>
                </div>
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
            </Card>

            <Card className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Admins</p>
                  <p className="text-xl font-bold">{userStats.admins}</p>
                </div>
                <ShieldCheck className="h-5 w-5 text-muted-foreground" />
              </div>
            </Card>
          </div>

          {/* User Management */}
          <Card>
            <CardHeader className="py-3 px-4">
              <div>
                <CardTitle className="text-base">User Management</CardTitle>
                <CardDescription className="text-xs">View and manage all platform users. Use Team Invitations to add new team members.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 px-4 py-3">
              {/* Bulk Actions Toolbar */}
              {selectedUsers.size > 0 && (
                <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                  <span className="text-xs font-medium">
                    {selectedUsers.size} selected
                  </span>
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
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete Selected
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedUsers(new Set())}
                      data-testid="button-clear-selection-users"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              )}

              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-sm"
                    data-testid="input-search-users"
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-full sm:w-[140px] h-8 text-sm" data-testid="select-filter-type">
                    <SelectValue placeholder="User Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="student">Students</SelectItem>
                    <SelectItem value="institution_admin">Institution Admins</SelectItem>
                    <SelectItem value="admin">Admins</SelectItem>
                    <SelectItem value="platform_admin">Platform Admins</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-[160px] h-8 text-sm" data-testid="select-filter-status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">
                      <span className="flex items-center gap-2">
                        Pending Approval
                        {userStats.pending > 0 && (
                          <Badge variant="destructive" className="text-xs px-1.5 py-0">
                            {userStats.pending}
                          </Badge>
                        )}
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Users Table - Compact */}
              <div className="overflow-x-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-10 py-2">
                        <Checkbox
                          checked={filteredUsers && filteredUsers.length > 0 && selectedUsers.size === filteredUsers.length}
                          onCheckedChange={() => filteredUsers && toggleSelectAllUsers(filteredUsers)}
                          data-testid="checkbox-select-all-users"
                        />
                      </TableHead>
                      <TableHead className="py-2 text-xs font-semibold">Name</TableHead>
                      <TableHead className="py-2 text-xs font-semibold">Email</TableHead>
                      <TableHead className="py-2 text-xs font-semibold">Type</TableHead>
                      <TableHead className="py-2 text-xs font-semibold">Role</TableHead>
                      <TableHead className="py-2 text-xs font-semibold">Status</TableHead>
                      <TableHead className="py-2 text-xs font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-3 text-sm">Loading...</TableCell>
                      </TableRow>
                    ) : filteredUsers && filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <TableRow key={user.id} data-testid={`row-user-${user.id}`} className="hover:bg-muted/50">
                          <TableCell className="py-2">
                            <Checkbox
                              checked={selectedUsers.has(user.id)}
                              onCheckedChange={() => toggleSelectUser(user.id)}
                              data-testid={`checkbox-user-${user.id}`}
                            />
                          </TableCell>
                          <TableCell className="py-2 font-medium text-sm">
                            {user.firstName} {user.lastName}
                          </TableCell>
                          <TableCell className="py-2 text-sm text-muted-foreground">{user.email}</TableCell>
                          <TableCell className="py-2">
                            <Badge variant={user.userType === "admin" ? "default" : "secondary"} className="text-xs">
                              {formatUserType(user.userType)}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2">
                            <Select
                              value={user.roleId ?? undefined}
                              onValueChange={(value) => updateRoleMutation.mutate({
                                userId: user.id,
                                roleId: value,
                              })}
                            >
                              <SelectTrigger className="w-[150px] h-7 text-xs" data-testid={`select-role-${user.id}`}>
                                <SelectValue placeholder="Assign role" />
                              </SelectTrigger>
                              <SelectContent>
                                {roles?.map((role) => (
                                  <SelectItem key={role.id} value={role.id}>
                                    {role.displayName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="py-2">
                            {user.approvalStatus === "pending" ? (
                              <Badge variant="outline" className="text-xs bg-yellow-50 border-yellow-300 text-yellow-700">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending Approval
                              </Badge>
                            ) : user.approvalStatus === "rejected" ? (
                              <Badge variant="outline" className="text-xs bg-red-50 border-red-300 text-red-700">
                                <XCircle className="h-3 w-3 mr-1" />
                                Rejected
                              </Badge>
                            ) : (
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
                            )}
                          </TableCell>
                          <TableCell className="py-2 text-right">
                            <div className="flex justify-end gap-1">
                              {user.approvalStatus === "pending" ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                    onClick={() => setApprovingUser(user)}
                                    data-testid={`button-approve-user-${user.id}`}
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => setRejectingUser(user)}
                                    data-testid={`button-reject-user-${user.id}`}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Reject
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeletingUser(user)}
                                  data-testid={`button-delete-user-${user.id}`}
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
          <div className="space-y-4">
          <Card>
            <CardHeader className="py-3 px-4">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div>
                  <CardTitle className="text-base">Institution Management</CardTitle>
                  <CardDescription className="text-xs">View and manage all institutions</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setAiExtractorDialogOpen(true)} variant="outline" data-testid="button-ai-extract">
                    <Sparkles className="h-4 w-4 mr-1" />
                    AI Extract
                  </Button>
                  <Button size="sm" onClick={handleCreateInstitution} data-testid="button-create-institution">
                    <Plus className="h-4 w-4 mr-1" />
                    Create
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 px-4 py-3">
              {/* Bulk Actions Toolbar */}
              {selectedInstitutions.size > 0 && (
                <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                  <span className="text-xs font-medium">
                    {selectedInstitutions.size} selected
                  </span>
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
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete Selected
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedInstitutions(new Set())}
                      data-testid="button-clear-selection-institutions"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              )}

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or country..."
                  value={institutionSearchQuery}
                  onChange={(e) => setInstitutionSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-sm"
                  data-testid="input-search-institutions"
                />
              </div>

              {/* Institutions Table - Compact */}
              <div className="overflow-x-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-10 py-2">
                        <Checkbox
                          checked={filteredInstitutions && filteredInstitutions.length > 0 && selectedInstitutions.size === filteredInstitutions.length}
                          onCheckedChange={() => filteredInstitutions && toggleSelectAllInstitutions(filteredInstitutions)}
                          data-testid="checkbox-select-all-institutions"
                        />
                      </TableHead>
                      <TableHead className="py-2 text-xs font-semibold">Name</TableHead>
                      <TableHead className="py-2 text-xs font-semibold">Location</TableHead>
                      <TableHead className="py-2 text-xs font-semibold">Assigned To</TableHead>
                      <TableHead className="py-2 text-xs font-semibold">Approval</TableHead>
                      <TableHead className="py-2 text-xs font-semibold">Status</TableHead>
                      <TableHead className="py-2 text-xs font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {institutionsLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-3 text-sm">Loading...</TableCell>
                      </TableRow>
                    ) : filteredInstitutions && filteredInstitutions.length > 0 ? (
                      filteredInstitutions.map((institution) => (
                        <TableRow key={institution.id} data-testid={`row-institution-${institution.id}`} className="hover:bg-muted/50">
                          <TableCell className="py-2">
                            <Checkbox
                              checked={selectedInstitutions.has(institution.id)}
                              onCheckedChange={() => toggleSelectInstitution(institution.id)}
                              data-testid={`checkbox-institution-${institution.id}`}
                            />
                          </TableCell>
                          <TableCell className="py-2 font-medium text-sm">{institution.name}</TableCell>
                          <TableCell className="py-2 text-sm text-muted-foreground">{institution.country}</TableCell>
                          <TableCell className="py-2 text-sm text-muted-foreground">
                            {institution.assignedToName || institution.createdByName || "-"}
                          </TableCell>
                          <TableCell className="py-2">
                            {institution.approvalStatus === "approved" && (
                              <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-xs">
                                Approved
                              </Badge>
                            )}
                            {institution.approvalStatus === "pending" && (
                              <Badge variant="secondary" className="text-xs">
                                Pending
                              </Badge>
                            )}
                            {institution.approvalStatus === "rejected" && (
                              <Badge variant="destructive" className="text-xs">
                                Rejected
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="py-2">
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
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="cursor-pointer">
                                  Inactive
                                </Badge>
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="py-2">
                            <div className="flex justify-end gap-1">
                              {/* View button - opens public institution page */}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.open(`/institutions/${institution.id}`, '_blank')}
                                title="View public page"
                                data-testid={`button-view-institution-${institution.id}`}
                              >
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              </Button>
                              {/* Approve/Reject buttons for pending institutions */}
                              {hasFullAdminAccess && institution.approvalStatus === "pending" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => approveInstitutionMutation.mutate(institution.id)}
                                    disabled={approveInstitutionMutation.isPending}
                                    data-testid={`button-approve-institution-${institution.id}`}
                                  >
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setRejectingInstitution(institution)}
                                    data-testid={`button-reject-institution-${institution.id}`}
                                  >
                                    <XCircle className="h-4 w-4 text-destructive" />
                                  </Button>
                                </>
                              )}
                              {/* Edit button (for full admins or marketing executives) */}
                              {(hasFullAdminAccess || isMarketingExecutive) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditInstitution(institution)}
                                  data-testid={`button-edit-institution-${institution.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {/* Transfer button (for admins to reassign institutions) */}
                              {(hasFullAdminAccess || isMarketingExecutive) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setTransferringInstitution(institution)}
                                  title="Transfer to another user"
                                  data-testid={`button-transfer-institution-${institution.id}`}
                                >
                                  <UserPlus className="h-4 w-4 text-primary" />
                                </Button>
                              )}
                              {/* Delete button (only for full admins) */}
                              {hasFullAdminAccess && (
                                <Button
                                  variant="ghost"
                                  size="icon"
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
          <div className="space-y-4">
          {/* Stats - Compact Cards */}
          <div className="grid gap-3 grid-cols-3">
            <Card className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Courses</p>
                  <p className="text-xl font-bold">{courseStats.total}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {courseStats.active} active, {courseStats.inactive} inactive
                  </p>
                </div>
                <BookOpen className="h-5 w-5 text-muted-foreground" />
              </div>
            </Card>

            <Card className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Active</p>
                  <p className="text-xl font-bold">{courseStats.active}</p>
                </div>
                <BookOpen className="h-5 w-5 text-muted-foreground" />
              </div>
            </Card>

            <Card className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Inactive</p>
                  <p className="text-xl font-bold">{courseStats.inactive}</p>
                </div>
                <BookOpen className="h-5 w-5 text-muted-foreground" />
              </div>
            </Card>
          </div>

          {/* Course Management */}
          <Card>
            <CardHeader className="py-3 px-4">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div>
                  <CardTitle className="text-base">Course Management</CardTitle>
                  <CardDescription className="text-xs">
                    {isConsultant ? "View all courses" : "View and manage all courses"}
                  </CardDescription>
                </div>
                {/* Only full admins (super_admin & support_manager) can create courses */}
                {hasFullAdminAccess && (
                  <div className="flex gap-2">
                    {isSuperAdmin && (
                      <Button size="sm" onClick={() => setAiCourseExtractorDialogOpen(true)} variant="outline" data-testid="button-ai-extract-course">
                        <Sparkles className="h-4 w-4 mr-1" />
                        AI Extract
                      </Button>
                    )}
                    <Button size="sm" onClick={handleCreateCourse} data-testid="button-create-course">
                      <Plus className="h-4 w-4 mr-1" />
                      Create
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 px-4 py-3">
              {/* Bulk Actions Toolbar */}
              {selectedCourses.size > 0 && (
                <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                  <span className="text-xs font-medium">
                    {selectedCourses.size} selected
                  </span>
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
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete Selected
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedCourses(new Set())}
                      data-testid="button-clear-selection-courses"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              )}

              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by course title or institution..."
                    value={courseSearchQuery}
                    onChange={(e) => setCourseSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-sm"
                    data-testid="input-search-courses"
                  />
                </div>
                <Select value={courseStatusFilter} onValueChange={setCourseStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[120px] h-8 text-sm" data-testid="select-filter-course-status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Courses Table - Compact */}
              <div className="overflow-x-auto border rounded-md">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-10 py-2">
                        <Checkbox
                          checked={filteredCourses && filteredCourses.length > 0 && selectedCourses.size === filteredCourses.length}
                          onCheckedChange={() => filteredCourses && toggleSelectAllCourses(filteredCourses)}
                          data-testid="checkbox-select-all-courses"
                        />
                      </TableHead>
                      <TableHead className="py-2 text-xs font-semibold min-w-[200px]">Title</TableHead>
                      <TableHead className="py-2 text-xs font-semibold hidden md:table-cell">Institution</TableHead>
                      <TableHead className="py-2 text-xs font-semibold hidden lg:table-cell">Level</TableHead>
                      <TableHead className="py-2 text-xs font-semibold hidden xl:table-cell">Duration</TableHead>
                      <TableHead className="py-2 text-xs font-semibold hidden sm:table-cell">Fees</TableHead>
                      <TableHead className="py-2 text-xs font-semibold">Approval</TableHead>
                      <TableHead className="py-2 text-xs font-semibold hidden md:table-cell">Status</TableHead>
                      <TableHead className="py-2 text-xs font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coursesLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-3 text-sm">Loading...</TableCell>
                      </TableRow>
                    ) : filteredCourses && filteredCourses.length > 0 ? (
                      filteredCourses.map((course) => (
                        <TableRow key={course.id} data-testid={`row-course-${course.id}`} className="hover:bg-muted/50">
                          <TableCell className="py-2">
                            <Checkbox
                              checked={selectedCourses.has(course.id)}
                              onCheckedChange={() => toggleSelectCourse(course.id)}
                              data-testid={`checkbox-course-${course.id}`}
                            />
                          </TableCell>
                          <TableCell className="py-2 font-medium text-sm min-w-[200px]">{course.title}</TableCell>
                          <TableCell className="py-2 text-sm text-muted-foreground hidden md:table-cell">{course.institutionName}</TableCell>
                          <TableCell className="py-2 text-sm hidden lg:table-cell">{course.level || "-"}</TableCell>
                          <TableCell className="py-2 text-sm hidden xl:table-cell">{course.duration || "-"}</TableCell>
                          <TableCell className="py-2 text-sm hidden sm:table-cell">
                            {course.fees ? `$${Number(course.fees).toLocaleString()}` : "-"}
                          </TableCell>
                          <TableCell className="py-2">
                            {/* Approval Status Badge */}
                            {course.approvalStatus === 'pending' && (
                              <Badge variant="secondary" className="text-xs" data-testid={`badge-course-approval-${course.id}`}>
                                Pending
                              </Badge>
                            )}
                            {course.approvalStatus === 'approved' && (
                              <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-xs" data-testid={`badge-course-approval-${course.id}`}>
                                Approved
                              </Badge>
                            )}
                            {course.approvalStatus === 'rejected' && (
                              <Badge variant="destructive" className="text-xs" data-testid={`badge-course-approval-${course.id}`}>
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
                          <TableCell className="hidden md:table-cell">
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

        {/* Applications Tab */}
        {activeTab === "applications" && (
          <div className="space-y-4">
            <AdminApplicationsKanban />
          </div>
        )}

        {/* Data Import Tab */}
        {activeTab === "blogs" && (
          <div className="space-y-4">
            <AdminBlogManagement />
          </div>
        )}

        {activeTab === "website-content" && (
          <div className="space-y-4">
            <AdminCmsPanel />
          </div>
        )}

        {activeTab === "data-import" && (
          <div className="space-y-4">
            <AdminCsvImportPanel />
          </div>
        )}

        {activeTab === "web-scraping" && (
          <div className="space-y-4">
            <AdminScrapingPanel />
          </div>
        )}

        {/* Affiliates Tab */}
        {activeTab === "affiliates" && (
          <AdminAffiliatesPanel />
        )}

        {/* Regions Tab */}
        {activeTab === "regions" && (
          <AdminRegionsPanel />
        )}

        {/* Branches Tab */}
        {activeTab === "branches" && (
          <AdminBranchesPanel />
        )}

        {/* Role Management Tab - Super Admin Only */}
        {activeTab === "role-management" && isSuperAdmin && (
          <AdminRoleManagementPanel />
        )}

        {/* Activity Logs Tab */}
        {activeTab === "activity-logs" && (
          <div className="space-y-4">
            <ActivityFeed
              title="Platform Activity Feed"
              showFilters={true}
              limit={50}
            />
          </div>
        )}

        {/* Team Management Tab */}
        {activeTab === "team" && hasFullAdminAccess && (
          <div className="space-y-4">
            <AdminTeamPanel />
          </div>
        )}
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Institution Create/Edit Dialog */}
      <Dialog open={institutionDialogOpen} onOpenChange={setInstitutionDialogOpen}>
        <DialogContent 
          className="max-w-[95vw] sm:max-w-2xl max-h-[75vh] sm:max-h-[80vh] flex flex-col gap-0 p-0 my-4 sm:my-8"
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
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>{editingInstitution ? "Edit Institution" : "Create Institution"}</DialogTitle>
            <DialogDescription>
              {editingInstitution ? "Update institution information" : "Create a new institution"}
            </DialogDescription>
          </DialogHeader>
          <Form {...institutionForm}>
            <form onSubmit={institutionForm.handleSubmit(handleSubmitInstitution)} className="flex flex-col min-h-0 flex-1">
              <div className="overflow-y-auto px-6 flex-1 space-y-4 pb-6">
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
                    const currentAddress = campusAddresses[index] || { name: "", address: "", city: "", state: "", postcode: "", country: "" };

                    return (
                      <div key={index} className="space-y-3 p-4 border rounded-lg bg-muted/30">
                        <h4 className="font-medium text-sm">Campus {index + 1}</h4>
                        
                        <div className="space-y-2">
                          <FormLabel>Campus Name</FormLabel>
                          <Input
                            value={currentAddress.name || ""}
                            onChange={(e) => {
                              const newAddresses = [...(institutionForm.watch("campusAddresses") || [])];
                              newAddresses[index] = { ...currentAddress, name: e.target.value };
                              institutionForm.setValue("campusAddresses", newAddresses);
                            }}
                            placeholder="e.g., Sydney Campus, Melbourne CBD"
                            data-testid={`input-admin-campusName-${index}`}
                          />
                          <FormDescription className="text-xs">
                            A friendly name to identify this campus
                          </FormDescription>
                        </div>

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
              </div>

              <DialogFooter className="px-6 py-4 mt-0 shrink-0 border-t">
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

      {/* Approve Admin User Dialog */}
      <Dialog open={!!approvingUser} onOpenChange={() => setApprovingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Admin Signup</DialogTitle>
            <DialogDescription>
              Approve <strong>{approvingUser?.firstName} {approvingUser?.lastName}</strong> ({approvingUser?.email}) as a platform administrator. Select a role for this user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Assign Role</label>
              <Select value={approvalRole} onValueChange={setApprovalRole}>
                <SelectTrigger className="w-full" data-testid="select-approval-role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="platform_admin">Platform Admin</SelectItem>
                  <SelectItem value="support_manager">Support Manager</SelectItem>
                  <SelectItem value="support_staff">Support Staff</SelectItem>
                  <SelectItem value="operations_staff">Operations Staff</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The user will receive an email notification with their access details.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovingUser(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => approvingUser && approveUserMutation.mutate({ id: approvingUser.id, role: approvalRole })}
              disabled={approveUserMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-confirm-approve-user"
            >
              {approveUserMutation.isPending ? "Approving..." : "Approve User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Admin User Dialog */}
      <Dialog open={!!rejectingUser} onOpenChange={() => setRejectingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Admin Signup</DialogTitle>
            <DialogDescription>
              Reject the admin signup request from <strong>{rejectingUser?.firstName} {rejectingUser?.lastName}</strong> ({rejectingUser?.email}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason (Optional)</label>
              <Textarea
                placeholder="Provide a reason for rejection..."
                value={userRejectionReason}
                onChange={(e) => setUserRejectionReason(e.target.value)}
                className="resize-none"
                rows={3}
                data-testid="input-rejection-reason"
              />
              <p className="text-xs text-muted-foreground">
                The user will receive an email notification about the rejection.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingUser(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectingUser && rejectUserMutation.mutate({ id: rejectingUser.id, reason: userRejectionReason })}
              disabled={rejectUserMutation.isPending}
              data-testid="button-confirm-reject-user"
            >
              {rejectUserMutation.isPending ? "Rejecting..." : "Reject User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Transfer Institution Dialog */}
      <Dialog open={!!transferringInstitution} onOpenChange={() => { setTransferringInstitution(null); setSelectedTransferUserId(""); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer Institution</DialogTitle>
            <DialogDescription>
              Transfer <strong>{transferringInstitution?.name}</strong> to another team member for editing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Assign to</label>
              <Select value={selectedTransferUserId} onValueChange={setSelectedTransferUserId}>
                <SelectTrigger data-testid="select-transfer-user">
                  <SelectValue placeholder="Select a team member" />
                </SelectTrigger>
                <SelectContent>
                  {adminUsers?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email} {user.roleName ? `(${user.roleName})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The selected user will be assigned to manage this institution.
              </p>
            </div>
            {transferringInstitution?.assignedToName && (
              <p className="text-sm text-muted-foreground">
                Currently assigned to: <strong>{transferringInstitution.assignedToName}</strong>
              </p>
            )}
            {transferringInstitution?.createdByName && (
              <p className="text-sm text-muted-foreground">
                Created by: <strong>{transferringInstitution.createdByName}</strong>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setTransferringInstitution(null); setSelectedTransferUserId(""); }}>
              Cancel
            </Button>
            <Button
              onClick={() => transferringInstitution && selectedTransferUserId && transferInstitutionMutation.mutate({ id: transferringInstitution.id, assignedToUserId: selectedTransferUserId })}
              disabled={!selectedTransferUserId || transferInstitutionMutation.isPending}
              data-testid="button-confirm-transfer-institution"
            >
              {transferInstitutionMutation.isPending ? "Transferring..." : "Transfer Institution"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              // Convert arrays to comma-separated strings for form fields
              const formData: any = {
                universityId: approvedData.universityId || "",
                title: approvedData.title || "",
                description: approvedData.description || "",
                subject: approvedData.subject || "",
                level: approvedData.level || "",
                discipline: approvedData.discipline || "",
                courseCode: approvedData.courseCode || "",
                
                // Duration & Fees
                duration: approvedData.duration || "",
                durationMonths: approvedData.durationMonths !== null && approvedData.durationMonths !== undefined ? approvedData.durationMonths : ("" as any),
                durationWeeks: approvedData.durationWeeks !== null && approvedData.durationWeeks !== undefined ? approvedData.durationWeeks : ("" as any),
                fees: approvedData.fees !== null && approvedData.fees !== undefined ? approvedData.fees : ("" as any),
                applicationFees: approvedData.applicationFees !== null && approvedData.applicationFees !== undefined ? approvedData.applicationFees : ("" as any),
                costOfLiving: approvedData.costOfLiving !== null && approvedData.costOfLiving !== undefined ? approvedData.costOfLiving : ("" as any),
                currency: approvedData.currency || "AUD",
                
                // Location & Dates
                location: approvedData.location || "",
                country: approvedData.country || "",
                startDate: approvedData.startDate || "",
                applicationDeadline: approvedData.applicationDeadline || "",
                intakes: Array.isArray(approvedData.intakes) ? approvedData.intakes.join(", ") : "",
                
                // Requirements
                prerequisites: approvedData.prerequisites || "",
                eligibilityRequirements: approvedData.eligibilityRequirements || "",
                englishRequirements: approvedData.englishRequirements || "",
                
                // Additional Details
                scholarshipPercentageMin: approvedData.scholarshipPercentageMin !== null && approvedData.scholarshipPercentageMin !== undefined ? approvedData.scholarshipPercentageMin : ("" as any),
                scholarshipPercentageMax: approvedData.scholarshipPercentageMax !== null && approvedData.scholarshipPercentageMax !== undefined ? approvedData.scholarshipPercentageMax : ("" as any),
                thumbnailUrl: approvedData.thumbnailUrl || "",
                curriculumUrl: approvedData.curriculumUrl || "",
                images: Array.isArray(approvedData.images) ? approvedData.images.join(", ") : "",
                pathways: Array.isArray(approvedData.pathways) ? approvedData.pathways.join(", ") : "",
                studyAreas: Array.isArray(approvedData.studyAreas) ? approvedData.studyAreas.join(", ") : "",
                careerOutcomes: Array.isArray(approvedData.careerOutcomes) ? approvedData.careerOutcomes.join(", ") : "",
                careerPath: approvedData.careerPath || "",
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
        <DialogContent className="max-w-[95vw] sm:max-w-3xl lg:max-w-4xl max-h-[75vh] sm:max-h-[80vh] flex flex-col gap-0 p-0 my-4 sm:my-8">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>{editingCourse ? "Edit Course" : "Create Course"}</DialogTitle>
            <DialogDescription>
              {editingCourse ? "Update course information" : "Create a new course"}
            </DialogDescription>
          </DialogHeader>
          <Form {...courseForm}>
            <form onSubmit={courseForm.handleSubmit(handleSubmitCourse)} className="flex flex-col min-h-0 flex-1">
              <div className="overflow-y-auto px-6 flex-1 space-y-4 pb-6">
              <Tabs defaultValue="basic" className="w-full">
                <div className="overflow-x-auto -mx-6 px-6 pb-2">
                  <TabsList className="inline-flex w-auto min-w-full">
                    <TabsTrigger value="basic" className="flex-1 sm:flex-none">Basic</TabsTrigger>
                    <TabsTrigger value="fees" className="flex-1 sm:flex-none">Fees</TabsTrigger>
                    <TabsTrigger value="location" className="flex-1 sm:flex-none">Location</TabsTrigger>
                    <TabsTrigger value="requirements" className="flex-1 sm:flex-none">Requirements</TabsTrigger>
                    <TabsTrigger value="additional" className="flex-1 sm:flex-none">Additional</TabsTrigger>
                  </TabsList>
                </div>

                {/* Basic Information Tab */}
                <TabsContent value="basic" className="space-y-4 mt-4">
                  <FormField
                    control={courseForm.control}
                    name="universityId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Institution *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-course-institution">
                              <SelectValue placeholder="Select institution" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
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
                        <FormLabel>Course Title *</FormLabel>
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
                          <Textarea {...field} placeholder="Course description..." rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={courseForm.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Computer Science" data-testid="input-course-subject" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={courseForm.control}
                      name="courseCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Course Code</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="CS101" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                              <SelectItem value="Certificate II">Certificate II</SelectItem>
                              <SelectItem value="Certificate III">Certificate III</SelectItem>
                              <SelectItem value="Certificate IV">Certificate IV</SelectItem>
                              <SelectItem value="Diploma">Diploma</SelectItem>
                              <SelectItem value="Advanced Diploma">Advanced Diploma</SelectItem>
                              <SelectItem value="Bachelor Degree">Bachelor Degree</SelectItem>
                              <SelectItem value="Masters Degree">Masters Degree</SelectItem>
                              <SelectItem value="Doctoral Degree">Doctoral Degree</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={courseForm.control}
                      name="discipline"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Discipline</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select discipline" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                              <SelectItem value="Accounting, Business & Finance">Accounting, Business & Finance</SelectItem>
                              <SelectItem value="Agriculture & Forestry">Agriculture & Forestry</SelectItem>
                              <SelectItem value="Applied Sciences & Professions">Applied Sciences & Professions</SelectItem>
                              <SelectItem value="Arts, Design & Architecture">Arts, Design & Architecture</SelectItem>
                              <SelectItem value="Computer Science & IT">Computer Science & IT</SelectItem>
                              <SelectItem value="Education & Training">Education & Training</SelectItem>
                              <SelectItem value="Engineering & Technology">Engineering & Technology</SelectItem>
                              <SelectItem value="Environmental Studies & Earth Sciences">Environmental Studies & Earth Sciences</SelectItem>
                              <SelectItem value="Hospitality, Leisure & Sports">Hospitality, Leisure & Sports</SelectItem>
                              <SelectItem value="Humanities">Humanities</SelectItem>
                              <SelectItem value="Journalism & Media">Journalism & Media</SelectItem>
                              <SelectItem value="Law">Law</SelectItem>
                              <SelectItem value="Medicine & Health">Medicine & Health</SelectItem>
                              <SelectItem value="Short Courses">Short Courses</SelectItem>
                              <SelectItem value="Trade">Trade</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Fees & Duration Tab */}
                <TabsContent value="fees" className="space-y-4 mt-4">
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={courseForm.control}
                      name="duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration (Text)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="3 years" />
                          </FormControl>
                          <FormDescription>e.g., "2 years", "6 months"</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={courseForm.control}
                      name="durationMonths"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration (Months)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" placeholder="24" onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : "")} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={courseForm.control}
                      name="durationWeeks"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration (Weeks)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" placeholder="104" onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : "")} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={courseForm.control}
                      name="fees"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tuition Fees</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" placeholder="30000" data-testid="input-course-fees" onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : "")} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={courseForm.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Currency</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select currency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="AUD">AUD</SelectItem>
                              <SelectItem value="USD">USD</SelectItem>
                              <SelectItem value="GBP">GBP</SelectItem>
                              <SelectItem value="EUR">EUR</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={courseForm.control}
                      name="applicationFees"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Application Fees</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" placeholder="100" onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : "")} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={courseForm.control}
                      name="costOfLiving"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cost of Living (Annual)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" placeholder="20000" onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : "")} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Location & Dates Tab */}
                <TabsContent value="location" className="space-y-4 mt-4">
                  {/* Campus Multi-Select */}
                  <div className="space-y-3">
                    <div>
                      <FormLabel>Campuses Offering This Course *</FormLabel>
                      <FormDescription className="text-xs">
                        Select all campuses where this course is available
                      </FormDescription>
                    </div>
                    {!selectedInstitutionId ? (
                      <p className="text-sm text-muted-foreground">Please select an institution first</p>
                    ) : institutionDetailsLoading ? (
                      <p className="text-sm text-muted-foreground">Loading institution details...</p>
                    ) : !selectedInstitution?.campusAddresses || selectedInstitution.campusAddresses.length === 0 ? (
                      <div className="p-4 border rounded-md bg-muted/30">
                        <p className="text-sm text-muted-foreground">No campuses configured for this institution</p>
                        <p className="text-xs text-muted-foreground mt-1">Edit the institution to add campus addresses</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 border rounded-md">
                        {selectedInstitution.campusAddresses.map((campus, index) => {
                          // Always use full address as key for consistency with existing data
                          const campusKey = `${campus.address}, ${campus.city}, ${campus.state} ${campus.postcode}`;
                          return (
                            <div key={index} className="flex items-start space-x-2">
                              <Checkbox
                                id={`campus-${index}`}
                                checked={selectedCampusIds.includes(campusKey)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedCampusIds([...selectedCampusIds, campusKey]);
                                  } else {
                                    setSelectedCampusIds(selectedCampusIds.filter(id => id !== campusKey));
                                  }
                                }}
                                data-testid={`checkbox-campus-${index}`}
                              />
                              <label
                                htmlFor={`campus-${index}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {campus.name && (
                                  <div className="font-semibold">{campus.name}</div>
                                )}
                                <div className={campus.name ? "text-xs text-muted-foreground" : ""}>{campus.address}</div>
                                <div className="text-xs text-muted-foreground">
                                  {campus.city}, {campus.state} {campus.postcode}
                                </div>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={courseForm.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location/Campus</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Sydney Campus" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={courseForm.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Australia" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={courseForm.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="February 2025" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={courseForm.control}
                      name="applicationDeadline"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Application Deadline</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="December 31, 2024" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={courseForm.control}
                    name="intakes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Intakes (Comma-separated)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="January, March, July, September" />
                        </FormControl>
                        <FormDescription>Enter multiple intakes separated by commas</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* Requirements Tab */}
                <TabsContent value="requirements" className="space-y-4 mt-4">
                  <FormField
                    control={courseForm.control}
                    name="prerequisites"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prerequisites</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="High school diploma or equivalent..." rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={courseForm.control}
                    name="eligibilityRequirements"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Eligibility Requirements</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Academic and other eligibility requirements..." rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={courseForm.control}
                    name="englishRequirements"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>English Language Requirements</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="IELTS 6.5 overall, no band less than 6.0..." rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* Additional Details Tab */}
                <TabsContent value="additional" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={courseForm.control}
                      name="scholarshipPercentageMin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Scholarship Min %</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" placeholder="10" min="0" max="100" onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : "")} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={courseForm.control}
                      name="scholarshipPercentageMax"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Scholarship Max %</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" placeholder="50" min="0" max="100" onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : "")} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={courseForm.control}
                      name="thumbnailUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Thumbnail URL</FormLabel>
                          <FormControl>
                            <Input {...field} type="url" placeholder="https://..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={courseForm.control}
                      name="curriculumUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Curriculum URL</FormLabel>
                          <FormControl>
                            <Input {...field} type="url" placeholder="https://..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={courseForm.control}
                    name="images"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Images (Comma-separated URLs)</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="https://image1.jpg, https://image2.jpg" rows={2} />
                        </FormControl>
                        <FormDescription>Enter multiple image URLs separated by commas</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={courseForm.control}
                    name="pathways"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pathways (Comma-separated)</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="University degrees, Advanced studies" rows={2} />
                        </FormControl>
                        <FormDescription>Enter progression routes separated by commas</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={courseForm.control}
                    name="studyAreas"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Study Areas (Comma-separated)</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Programming, Database Design, Web Development" rows={2} />
                        </FormControl>
                        <FormDescription>Enter study topics separated by commas</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={courseForm.control}
                    name="careerOutcomes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Career Outcomes (Comma-separated)</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Software Engineer, Data Analyst, Web Developer" rows={2} />
                        </FormControl>
                        <FormDescription>Enter career paths separated by commas</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={courseForm.control}
                    name="careerPath"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Career Path Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Detailed career progression and trajectory..." rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>
              </div>
              
              <DialogFooter className="px-6 py-4 mt-0 shrink-0 border-t">
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
  );
}
