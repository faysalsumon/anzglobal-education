import { useState, useEffect, useRef, useCallback } from "react";
import { Helmet } from "react-helmet";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Users, Building2, BookOpen, ShieldCheck, ShieldOff, Search, Plus, Edit, Trash2, Home, GraduationCap, FileText, CheckCircle2, Clock, XCircle, Upload, Sparkles, User, LogOut, Menu, X, UserPlus, Eye, ChevronsUpDown, Check, RefreshCw, ChevronRight, ChevronLeft, Lock, Globe } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { performLogout } from "@/lib/logout";
import { useSupabaseAuth } from "@/lib/supabase-auth";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";
import { useLocation, useSearch } from "wouter";
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
import { CrmContactsPanel } from "@/components/crm-contacts-panel";
import { CrmLeadsPanel } from "@/components/crm-leads-panel";
import { AdminCmsPanel } from "@/components/admin-cms-panel";
import { AdminSeoPanel } from "@/components/admin-seo-panel";
import { AdminAffiliatesPanel } from "@/components/admin-affiliates-panel";
import { AdminRegionsPanel } from "@/components/admin-regions-panel";
import { AdminRoleManagementPanel } from "@/components/admin-role-management-panel";
import { AdminProfileManagementPanel } from "@/components/admin-profile-management-panel";
import { AdminTeamPanel } from "@/components/admin-team-panel";
import { AdminBranchesPanel } from "@/components/admin-branches-panel";
import { NotificationBell } from "@/components/NotificationBell";
import { AdminDashboardOverview } from "@/components/admin-dashboard-overview";
import { BranchManagerDashboard } from "@/components/branch-manager-dashboard";
import { InstitutionEditor } from "@/components/institution-editor";
import { CourseEditor } from "@/components/course-editor";
import { AdminTagsPanel } from "@/components/admin-tags-panel";
import { AdminAiSettingsPanel } from "@/components/admin-ai-settings-panel";
import { AdminQualificationTypesPanel } from "@/components/admin-qualification-types";
import { AdminCourseLevelRequirementsPanel } from "@/components/admin-course-level-requirements";
import { ListPagination } from "@/components/list-pagination";
import { AdminApiKeysPanel } from "@/components/admin-api-keys-panel";
import { AdminThumbnailManager } from "@/components/admin-thumbnail-manager";
import { AdminNotificationSettingsPanel } from "@/components/admin-notification-settings-panel";
import { AdminMessagesTab } from "@/components/admin-messages-tab";
import { AdminMailTab } from "@/components/admin-mail-tab";
import { AdminMobileBottomNav } from "@/components/admin-mobile-bottom-nav";
import { AdminBottomBar } from "@/components/admin-bottom-bar";
import { FloatingChatBar } from "@/components/floating-chat-bar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ClockInButton } from "@/components/clock-in-button";
import { AttendancePanel } from "@/components/attendance-panel";
import { FinanceDashboardPanel } from "@/components/accounting/finance-dashboard";
import { InvoicesPanel } from "@/components/accounting/invoices-panel";
import { CustomersPanel } from "@/components/accounting/customers-panel";
import { ItemsPanel } from "@/components/accounting/items-panel";
import { ChartOfAccountsPanel } from "@/components/accounting/chart-of-accounts-panel";
import AdminAccountingPanel from "@/components/admin-accounting-panel";

// Helper function to get ISO 2-letter country code for flag-icons library
const getCountryIsoCode = (country: string | null | undefined): string | null => {
  if (!country) return null;
  const countryMap: Record<string, string> = {
    'Australia': 'au',
    'Bangladesh': 'bd',
    'United States': 'us',
    'USA': 'us',
    'United Kingdom': 'gb',
    'UK': 'gb',
    'Canada': 'ca',
    'New Zealand': 'nz',
    'India': 'in',
    'China': 'cn',
    'Japan': 'jp',
    'Germany': 'de',
    'France': 'fr',
    'Singapore': 'sg',
    'Malaysia': 'my',
    'Indonesia': 'id',
    'Philippines': 'ph',
    'Vietnam': 'vn',
    'Thailand': 'th',
    'South Korea': 'kr',
    'Pakistan': 'pk',
    'Nepal': 'np',
    'Sri Lanka': 'lk',
    'UAE': 'ae',
    'United Arab Emirates': 'ae',
    'Saudi Arabia': 'sa',
    'Ireland': 'ie',
    'Netherlands': 'nl',
    'Sweden': 'se',
    'Switzerland': 'ch',
    'Italy': 'it',
    'Spain': 'es',
    'Brazil': 'br',
    'Mexico': 'mx',
    'South Africa': 'za',
  };
  return countryMap[country] || null;
};

interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone?: string | null;
  userType: string;
  role: string | null;
  roleId: string | null;
  branchId?: string | null;
  branchName?: string | null;
  branchCode?: string | null;
  roleName?: string | null;
  isActive: boolean | null;
  lastLogin: string | null;
  createdAt: string | null;
  updatedAt?: string | null;
  approvalStatus: string | null;
}

interface Branch {
  id: string;
  name: string;
  code: string;
  city: string | null;
  country: string | null;
  regionId: string | null;
  regionName?: string | null;
  isActive: boolean;
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
  slug: string | null;
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
  cricosProviderCode: string | null;
  rtoNumber: string | null;
  approvalStatus: string | null;
  publishStatus: 'draft' | 'published';
  isActive: boolean;
  createdAt: string | null;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  assignedToUserId: string | null;
  createdByName: string | null;
  updatedByName: string | null;
  assignedToName: string | null;
  createdByProfileImage: string | null;
  assignedToProfileImage: string | null;
}

interface Course {
  id: string;
  slug: string | null;
  universityId: string;
  title: string;
  description: string | null;
  duration: string | null;
  fees: number | null;
  level: string | null;
  subject: string;
  isActive: boolean;
  institutionName?: string;
  institutionLogo?: string | null;
  createdAt: string | null;
  approvalStatus: string;
  publishStatus: 'draft' | 'published';
  rejectionReason: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  campusLocations: string[] | null;
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
// Note: 'CTO' is a ROLE, not a user type
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

const optionalNumber = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z.coerce.number().optional()
);

const optionalPositiveInt = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z.coerce.number().int().positive().optional()
);

const optionalYear = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z.coerce.number().int().min(1800).max(new Date().getFullYear()).optional()
);

const optionalPercentage = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z.coerce.number().min(0).max(100).optional()
);

const institutionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  country: z.string().min(1, "Country is required"),
  description: z.string().optional(),
  contactEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  providerType: z.string().min(1, "Provider type is required"),
  numberOfCampuses: optionalPositiveInt,
  establishedYear: optionalYear,
  scholarshipPercentageMin: optionalPercentage,
  scholarshipPercentageMax: optionalPercentage,
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

const optionalPositiveNumber = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z.coerce.number().positive().optional()
);

const optionalNonNegativeNumber = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z.coerce.number().nonnegative().optional()
);

const optionalIntPercentage = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z.coerce.number().int().min(0).max(100).optional()
);

const optionalUrl = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z.string().url().optional()
);

const courseSchema = z.object({
  universityId: z.string().min(1, "Institution is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  subject: z.string().min(1, "Subject is required"),
  level: z.string().optional(),
  discipline: z.string().optional(),
  
  // Duration & Fees
  duration: z.string().optional(),
  durationMonths: optionalPositiveInt,
  durationWeeks: optionalPositiveInt,
  fees: optionalPositiveNumber,
  applicationFees: optionalNonNegativeNumber,
  currency: z.string().optional(),
  
  // Location & Dates
  location: z.string().optional(),
  country: z.string().optional(),
  startDate: z.string().optional(),
  applicationDeadline: z.string().optional(),
  intakes: z.string().optional(),
  
  // Requirements
  prerequisites: z.string().optional(),
  eligibilityRequirements: z.string().optional(),
  englishRequirements: z.string().optional(),
  
  // Additional Details
  courseCode: z.string().optional(),
  scholarshipPercentageMin: optionalIntPercentage,
  scholarshipPercentageMax: optionalIntPercentage,
  thumbnailUrl: optionalUrl,
  curriculumUrl: optionalUrl,
  images: z.string().optional(),
  pathways: z.string().optional(),
  studyAreas: z.string().optional(),
  careerOutcomes: z.string().optional(),
  careerPath: z.string().optional(),
});

const PROVIDER_TYPES = ["Institution", "TAFE", "University", "College", "School"];

export default function AdminDashboard() {
  const { toast } = useToast();
  const { user, isLoading, isAuthenticated, isAuthResolved, adminRole, isConsultant, isCTO, isMarketingExecutive, hasFullAdminAccess, isAdmin, isBranchManager, isAccountsOfficer } = useAuth();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { signOut } = useSupabaseAuth();

  const { showWarning: showInactivityWarning, secondsRemaining: inactivitySeconds, stayLoggedIn } = useInactivityLogout({
    enabled: !!isAdmin,
  });

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
  
  // Default tab based on role: all users start with overview
  const defaultTab = "overview";
  
  // Initialize activeTab from hash OR query parameters (for notification deep-linking)
  const getInitialTab = () => {
    const validTabs = ['overview', 'my-tasks', 'team-workload', 'users', 'institutions', 'courses', 'crm-contacts', 'crm-leads', 'applications', 'data-import', 'web-scraping', 'activity-logs', 'team', 'blogs', 'website-content', 'seo-metadata', 'tags', 'qualification-types', 'entry-requirement-templates', 'regions', 'branches', 'affiliates', 'role-management', 'profile-management', 'messages', 'email', 'ai-settings', 'notification-settings', 'attendance', 'finance-dashboard', 'finance-invoices', 'finance-customers', 'finance-items', 'finance-accounts', 'accounting', 'thumbnails'];
    const fullAdminOnlyTabs = ['team-workload', 'users', 'data-import', 'web-scraping', 'activity-logs', 'team', 'notification-settings', 'attendance', 'finance-dashboard', 'finance-invoices', 'finance-customers', 'finance-items', 'finance-accounts', 'accounting', 'thumbnails'];
    const financeTabsForAccountsOfficer = ['finance-dashboard', 'finance-invoices', 'finance-customers', 'finance-items', 'finance-accounts', 'accounting'];
    const ctoOnlyTabs = ['ai-settings'];
    const superAdminOnlyTabs = ['role-management', 'profile-management'];
    const marketingExecutiveTabs = ['institutions'];
    
    // First check query parameters (for notification deep-linking)
    const searchParams = new URLSearchParams(window.location.search);
    const tabFromQuery = searchParams.get('tab');
    
    // Fall back to hash if no query param
    const hash = window.location.hash.replace('#', '');
    const tabCandidate = tabFromQuery || hash;
    
    const validateTabAccess = (tab: string): string => {
      if (!tab || !validTabs.includes(tab)) {
        return defaultTab;
      }
      // Check access for super-admin-only tabs (role management requires super admin)
      if (superAdminOnlyTabs.includes(tab) && !isCTO) {
        return defaultTab;
      }
      // Check access for full-admin-only tabs (accounts_officer may access finance tabs)
      if (fullAdminOnlyTabs.includes(tab) && !hasFullAdminAccess) {
        if (isAccountsOfficer && financeTabsForAccountsOfficer.includes(tab)) {
          // accounts_officer has full finance access — allow
        } else {
          return defaultTab;
        }
      }
      // Marketing Executive tabs - accessible by full admins OR marketing executives
      if (marketingExecutiveTabs.includes(tab) && !hasFullAdminAccess && !isMarketingExecutive) {
        return defaultTab;
      }
      // Contacts is hidden from junior_consultant and support_staff
      if (tab === 'crm-contacts' && (adminRole === 'junior_consultant' || adminRole === 'support_staff')) {
        return 'crm-leads';
      }
      return tab; // Valid tab with proper access
    };
    
    return validateTabAccess(tabCandidate);
  };
  
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isChatSheetOpen, setIsChatSheetOpen] = useState(false);

  // Tab display name mapping for breadcrumb
  const tabDisplayNames: Record<string, string> = {
    'overview': 'Overview',
    'my-tasks': 'My Tasks',
    'team-workload': 'Team Workload',
    'users': 'Users',
    'institutions': 'Institutions',
    'courses': 'Courses',
    'crm-contacts': 'Contacts',
    'crm-leads': 'Leads',
    'applications': 'Applications',
    'data-import': 'Data Import',
    'web-scraping': 'Web Scraping',
    'activity-logs': 'Activity Logs',
    'ai-settings': 'AI Settings',
    'team': 'Team Invitations',
    'blogs': 'Blogs',
    'website-content': 'Website Content',
    'seo-metadata': 'SEO Management',
    'regions': 'Regions',
    'branches': 'Branches',
    'affiliates': 'Affiliates',
    'role-management': 'Role Management',
    'profile-management': 'Permission Profiles',
    'messages': 'Messages',
    'email': 'Email',
    'notification-settings': 'Notification Settings',
    'attendance': 'Attendance',
    'finance-dashboard': 'Finance Dashboard',
    'finance-invoices': 'Invoices',
    'finance-customers': 'Customers',
    'finance-items': 'Items',
    'finance-accounts': 'Chart of Accounts',
    'accounting': 'Accounting',
    'api-keys': 'Partner API',
    'tags': 'Tag Manager',
    'qualification-types': 'Qualification Types',
    'entry-requirement-templates': 'Entry Requirements',
    'thumbnails': 'Thumbnails',
  };
  
  const getCurrentBreadcrumbName = () => tabDisplayNames[activeTab] || 'Dashboard';

  // Sync active tab to URL hash only when it changes and differs from current hash
  useEffect(() => {
    const currentHash = window.location.hash.replace('#', '');
    if (currentHash !== activeTab) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${activeTab}`);
    }
  }, [activeTab]);
  
  // Listen for URL search param changes (for notification deep-linking while on admin page)
  useEffect(() => {
    const searchParams = new URLSearchParams(searchString);
    const tabFromQuery = searchParams.get('tab');
    if (tabFromQuery && tabFromQuery !== activeTab) {
      const validTabs = ['overview', 'my-tasks', 'team-workload', 'users', 'institutions', 'courses', 'crm-contacts', 'crm-leads', 'applications', 'data-import', 'web-scraping', 'activity-logs', 'team', 'blogs', 'website-content', 'seo-metadata', 'tags', 'qualification-types', 'entry-requirement-templates', 'regions', 'branches', 'affiliates', 'role-management', 'profile-management', 'messages', 'email', 'ai-settings', 'notification-settings', 'attendance', 'finance-dashboard', 'finance-invoices', 'finance-customers', 'finance-items', 'finance-accounts', 'accounting', 'thumbnails'];
      if (validTabs.includes(tabFromQuery)) {
        const isContactsRestricted = tabFromQuery === 'crm-contacts' && (adminRole === 'junior_consultant' || adminRole === 'support_staff');
        setActiveTab(isContactsRestricted ? 'crm-leads' : tabFromQuery);
      }
    }
  }, [searchString]);
  
  // User state
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [viewEditUserDialogOpen, setViewEditUserDialogOpen] = useState(false);
  const [viewEditUserMode, setViewEditUserMode] = useState<'view' | 'edit'>('view');
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<User | null>(null);

  // Institution state
  const [institutionSearchQuery, setInstitutionSearchQuery] = useState("");
  const [institutionPublishFilter, setInstitutionPublishFilter] = useState<string>("all");
  const [showInstitutionEditor, setShowInstitutionEditor] = useState(false);
  const [institutionDialogOpen, setInstitutionDialogOpen] = useState(false);
  const [aiExtractorDialogOpen, setAiExtractorDialogOpen] = useState(false);
  const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null);
  const [deletingInstitution, setDeletingInstitution] = useState<Institution | null>(null);
  const [rejectingInstitution, setRejectingInstitution] = useState<Institution | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedInstitutions, setSelectedInstitutions] = useState<Set<string>>(new Set());
  const [transferringInstitution, setTransferringInstitution] = useState<Institution | null>(null);
  const [selectedTransferUserId, setSelectedTransferUserId] = useState<string>("");
  const [assigningInstitutionId, setAssigningInstitutionId] = useState<string | null>(null);
  const [institutionPage, setInstitutionPage] = useState(1);
  const [institutionPageSize, setInstitutionPageSize] = useState(20);

  // Course state
  const [courseSearchQuery, setCourseSearchQuery] = useState("");
  const [courseStatusFilter, setCourseStatusFilter] = useState<string>("all");
  const [coursePublishFilter, setCoursePublishFilter] = useState<string>("all");
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(new Set());
  const [showCourseEditor, setShowCourseEditor] = useState(false);
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [aiCourseExtractorDialogOpen, setAiCourseExtractorDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);
  const [rejectingCourse, setRejectingCourse] = useState<Course | null>(null);
  const [courseRejectionReason, setCourseRejectionReason] = useState("");
  const [selectedCampusIds, setSelectedCampusIds] = useState<string[]>([]);
  const [transferringCourse, setTransferringCourse] = useState<Course | null>(null);
  const [selectedTransferCourseUserId, setSelectedTransferCourseUserId] = useState<string>("");
  const [assigningCourseId, setAssigningCourseId] = useState<string | null>(null);
  const [coursePage, setCoursePage] = useState(1);
  const [coursePageSize, setCoursePageSize] = useState(20);
  
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
  const coursesTableScrollRef = useRef<HTMLDivElement>(null);
  const [showCourseScrollLeft, setShowCourseScrollLeft] = useState(false);
  const [showCourseScrollRight, setShowCourseScrollRight] = useState(true);

  // Handle courses table horizontal scroll
  const handleCoursesTableScroll = useCallback(() => {
    const el = coursesTableScrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const hasOverflow = scrollWidth > clientWidth;
    setShowCourseScrollLeft(hasOverflow && scrollLeft > 10);
    setShowCourseScrollRight(hasOverflow && scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  const scrollCoursesTable = (direction: 'left' | 'right') => {
    const el = coursesTableScrollRef.current;
    if (!el) return;
    const scrollAmount = 300;
    el.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
  };

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
  // Users and Institutions: Only for CTO and branch_manager (full admin access)
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/super-admin/users"],
    enabled: hasFullAdminAccess, // Only full admins can access users
  });

  // Full admins see all institutions
  const { data: allInstitutions, isLoading: allInstitutionsLoading } = useQuery<Institution[]>({
    queryKey: ["/api/super-admin/institutions"],
    enabled: hasFullAdminAccess,
  });

  // Non-full-admin team members see only their assigned/created institutions
  const { data: myInstitutions, isLoading: myInstitutionsLoading } = useQuery<Institution[]>({
    queryKey: ["/api/admin/my-institutions"],
    enabled: !hasFullAdminAccess && isAdmin,
  });

  // Use the appropriate institutions data based on access level
  const institutions = hasFullAdminAccess ? allInstitutions : myInstitutions;
  const institutionsLoading = hasFullAdminAccess ? allInstitutionsLoading : myInstitutionsLoading;

  // Courses: Full admins see all, team members see only assigned/created
  const { data: allCourses, isLoading: allCoursesLoading } = useQuery<Course[]>({
    queryKey: ["/api/super-admin/courses"],
    enabled: hasFullAdminAccess,
  });

  const { data: myCourses, isLoading: myCoursesLoading } = useQuery<Course[]>({
    queryKey: ["/api/admin/my-courses"],
    enabled: !hasFullAdminAccess && isAdmin,
  });

  // Use the appropriate courses data based on access level
  const courses = hasFullAdminAccess ? allCourses : myCourses;
  const coursesLoading = hasFullAdminAccess ? allCoursesLoading : myCoursesLoading;

  // (studentLeads query removed - consolidated into CRM Leads)

  const { data: applications, isLoading: applicationsLoading } = useQuery<Application[]>({
    queryKey: ["/api/super-admin/applications"],
  });

  // Fetch roles for role assignment dropdown (new RBAC system)
  const { data: roles } = useQuery<Role[]>({
    queryKey: ["/api/admin/roles"],
    enabled: hasFullAdminAccess,
  });

  // Fetch branches for branch assignment dropdown
  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/admin/branches"],
    enabled: hasFullAdminAccess,
  });

  // Fetch regions for region assignment dropdown
  const { data: regions } = useQuery<{ id: string; name: string; code: string; isActive: boolean }[]>({
    queryKey: ["/api/admin/regions"],
    enabled: hasFullAdminAccess,
  });

  // Fetch profiles for permission profile assignment dropdown
  const { data: profilesList } = useQuery<{ id: string; name: string; description: string | null; isActive: boolean }[]>({
    queryKey: ["/api/admin/profiles"],
    enabled: hasFullAdminAccess,
  });

  // Fetch single user details for view/edit dialog
  const { data: userDetails, isLoading: userDetailsLoading, refetch: refetchUserDetails } = useQuery<User>({
    queryKey: ["/api/super-admin/users", selectedUserForEdit?.id],
    enabled: !!selectedUserForEdit?.id && viewEditUserDialogOpen,
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

  // Sync users to CRM contacts mutation
  const syncUsersToCrmMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/crm/contacts/sync-users");
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/contacts"] });
      const stats = data.stats || {};
      const total = stats.total || 0;
      const created = stats.created || 0;
      const linked = stats.linked || 0;
      const updated = stats.updated || 0;
      
      let description = "";
      if (created > 0 || linked > 0 || updated > 0) {
        const parts: string[] = [];
        if (created > 0) parts.push(`Created: ${created}`);
        if (linked > 0) parts.push(`Linked: ${linked}`);
        if (updated > 0) parts.push(`Updated: ${updated}`);
        description = parts.join(", ");
      } else if (total > 0) {
        description = `All ${total} users processed`;
      } else {
        description = "No eligible users found to sync";
      }
      
      toast({
        title: "Sync completed",
        description,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error syncing users",
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

  // Update user details mutation (for edit dialog)
  const updateUserMutation = useMutation({
    mutationFn: async (data: { userId: string; firstName?: string; lastName?: string; email?: string; phone?: string; branchId?: string | null; regionId?: string | null; profileId?: string | null; userType?: string; roleId?: string | null; isActive?: boolean }) => {
      const { userId, ...updateData } = data;
      return await apiRequest("PATCH", `/api/super-admin/users/${userId}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      if (selectedUserForEdit?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users", selectedUserForEdit.id] });
      }
      setViewEditUserDialogOpen(false);
      setSelectedUserForEdit(null);
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

  // Institution mutations
  const createInstitutionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof institutionSchema>) => {
      return await apiRequest("POST", "/api/super-admin/institutions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/institutions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/my-institutions"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/my-institutions"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/my-institutions"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/my-institutions"] });
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
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/institutions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/my-institutions"] });
      // Also invalidate courses since they may have been transferred
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/my-courses"] });
      setTransferringInstitution(null);
      setSelectedTransferUserId("");
      toast({
        title: "Institution transferred",
        description: data?.message || "Institution has been successfully transferred to the selected user",
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

  // Fetch admin users for transfer dropdown and inline assignment (used for institution and course transfers)
  const { data: adminUsers } = useQuery<Array<{ id: string; name: string; email: string; roleName: string | null; profileImageUrl: string | null }>>({
    queryKey: ["/api/super-admin/admin-users"],
    enabled: !!transferringInstitution || !!transferringCourse || !!assigningInstitutionId || !!assigningCourseId || activeTab === 'institutions' || activeTab === 'courses',
  });

  // Inline assignment mutation for institutions (quick assign from table)
  const assignInstitutionMutation = useMutation({
    mutationFn: async ({ id, assignedToUserId }: { id: string; assignedToUserId: string | null }) => {
      return await apiRequest("PATCH", `/api/super-admin/institutions/${id}/transfer`, { assignedToUserId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/institutions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/my-institutions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/my-courses"] });
      setAssigningInstitutionId(null);
      toast({
        title: "Assignment updated",
        description: "Institution and all its courses have been reassigned",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update assignment",
        variant: "destructive",
      });
    },
  });

  // Transfer course mutation
  const transferCourseMutation = useMutation({
    mutationFn: async ({ id, assignedToUserId }: { id: string; assignedToUserId: string }) => {
      return await apiRequest("PATCH", `/api/super-admin/courses/${id}/transfer`, { assignedToUserId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/my-courses"] });
      setTransferringCourse(null);
      setSelectedTransferCourseUserId("");
      toast({
        title: "Course transferred",
        description: "Course has been successfully transferred to the selected user",
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

  // Inline assignment mutation for courses (quick assign from table)
  const assignCourseMutation = useMutation({
    mutationFn: async ({ id, assignedToUserId }: { id: string; assignedToUserId: string | null }) => {
      return await apiRequest("PATCH", `/api/super-admin/courses/${id}/transfer`, { assignedToUserId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/my-courses"] });
      setAssigningCourseId(null);
      toast({
        title: "Assignment updated",
        description: "Course has been reassigned",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update assignment",
        variant: "destructive",
      });
    },
  });

  // Update institution publish status mutation
  const updateInstitutionPublishStatusMutation = useMutation({
    mutationFn: async ({ id, publishStatus }: { id: string; publishStatus: 'draft' | 'published' }) => {
      const payload: any = { publishStatus };
      if (publishStatus === 'published') {
        payload.publishedAt = new Date().toISOString();
        payload.publishedByUserId = user?.id;
      } else {
        payload.publishedAt = null;
        payload.publishedByUserId = null;
      }
      return await apiRequest("PATCH", `/api/super-admin/institutions/${id}`, payload);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/institutions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/my-institutions"] });
      toast({
        title: "Publish status updated",
        description: `Institution has been ${variables.publishStatus === 'published' ? 'published' : 'saved as draft'}`,
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
      // Include campusLocations in the course data
      const courseData = {
        ...data,
        campusLocations: selectedCampusIds.length > 0 ? selectedCampusIds : undefined,
      };
      return await apiRequest("POST", "/api/super-admin/courses", courseData);
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/my-courses"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/my-courses"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/my-courses"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/my-institutions"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/my-institutions"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/my-courses"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/my-courses"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/my-courses"] });
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

  // Update course publish status mutation
  const updateCoursePublishStatusMutation = useMutation({
    mutationFn: async ({ id, publishStatus, visibility }: { id: string; publishStatus: 'draft' | 'published'; visibility?: 'public' | 'private' }) => {
      const payload: any = { publishStatus };
      if (visibility !== undefined) payload.visibility = visibility;
      if (publishStatus === 'published') {
        payload.publishedAt = new Date().toISOString();
        payload.publishedByUserId = user?.id;
      } else {
        payload.publishedAt = null;
        payload.publishedByUserId = null;
      }
      return await apiRequest("PATCH", `/api/super-admin/courses/${id}`, payload);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/my-courses"] });
      toast({
        title: "Publish status updated",
        description: `Course has been ${variables.publishStatus === 'published' ? (variables.visibility === 'private' ? 'published privately' : 'published publicly') : 'saved as draft'}`,
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/my-institutions"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/my-institutions"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/my-courses"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/my-courses"] });
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
    const matchesSearch = 
      institutionSearchQuery === "" ||
      institution.name?.toLowerCase().includes(institutionSearchQuery.toLowerCase()) ||
      institution.country?.toLowerCase().includes(institutionSearchQuery.toLowerCase());
    
    const matchesPublishFilter =
      institutionPublishFilter === "all" ||
      (institutionPublishFilter === "draft" && institution.publishStatus !== "published") ||
      (institutionPublishFilter === "published" && institution.publishStatus === "published");

    return matchesSearch && matchesPublishFilter;
  });

  // Paginate institutions
  const paginatedInstitutions = filteredInstitutions?.slice(
    (institutionPage - 1) * institutionPageSize,
    institutionPage * institutionPageSize
  );

  // Reset institution page when filters change
  useEffect(() => {
    setInstitutionPage(1);
  }, [institutionSearchQuery, institutionPublishFilter]);

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

    const matchesPublishFilter =
      coursePublishFilter === "all" ||
      (coursePublishFilter === "draft" && course.publishStatus !== "published") ||
      (coursePublishFilter === "published" && course.publishStatus === "published");

    return matchesSearch && matchesStatus && matchesPublishFilter;
  });

  // Paginate courses
  const paginatedCourses = filteredCourses?.slice(
    (coursePage - 1) * coursePageSize,
    coursePage * coursePageSize
  );

  // Initialize scroll indicators on data load and resize
  useEffect(() => {
    handleCoursesTableScroll();
    window.addEventListener('resize', handleCoursesTableScroll);
    return () => window.removeEventListener('resize', handleCoursesTableScroll);
  }, [handleCoursesTableScroll, paginatedCourses]);

  // Reset course page when filters change
  useEffect(() => {
    setCoursePage(1);
  }, [courseSearchQuery, courseStatusFilter, coursePublishFilter]);

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

  // User handlers
  const handleViewUser = (user: User) => {
    setSelectedUserForEdit(user);
    setViewEditUserMode('view');
    setViewEditUserDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUserForEdit(user);
    setViewEditUserMode('edit');
    setViewEditUserDialogOpen(true);
  };

  const handleCloseUserDialog = () => {
    setViewEditUserDialogOpen(false);
    setSelectedUserForEdit(null);
  };

  // Institution handlers
  const handleCreateInstitution = () => {
    setEditingInstitution(null);
    setShowInstitutionEditor(true);
  };

  const handleEditInstitution = (institution: Institution) => {
    setEditingInstitution(institution);
    setShowInstitutionEditor(true);
  };

  const handleBackFromInstitutionEditor = () => {
    setShowInstitutionEditor(false);
    setEditingInstitution(null);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("logo", file);

    try {
      // Use apiRequest which handles CSRF tokens and auth headers automatically
      const response = await apiRequest("POST", "/api/university/upload-logo", formData);
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

  const handleSubmitInstitution = (data: z.infer<typeof institutionSchema>, publishStatus: 'draft' | 'published' = 'draft') => {
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
      publishStatus,
      // Track who published and when for audit trail
      ...(publishStatus === 'published' && {
        publishedAt: new Date().toISOString(),
        publishedByUserId: user?.id,
      }),
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
    setShowCourseEditor(true);
  };

  const handleEditCourse = (course: any) => {
    setEditingCourse(course);
    setSelectedCampusIds(course.campusLocations || []);
    setShowCourseEditor(true);
  };

  const handleBackFromCourseEditor = () => {
    setShowCourseEditor(false);
    setEditingCourse(null);
    setSelectedCampusIds([]);
  };

  const handleSubmitCourse = (data: z.infer<typeof courseSchema>, publishStatus: 'draft' | 'published' = 'draft') => {
    // Transform comma-separated strings to arrays for backend
    const transformedData: any = {
      ...data,
      intakes: data.intakes ? data.intakes.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      images: data.images ? data.images.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      pathways: data.pathways ? data.pathways.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      studyAreas: data.studyAreas ? data.studyAreas.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      careerOutcomes: data.careerOutcomes ? data.careerOutcomes.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      publishStatus,
      // Track who published and when for audit trail
      ...(publishStatus === 'published' && {
        publishedAt: new Date().toISOString(),
        publishedByUserId: user?.id,
      }),
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

  useEffect(() => {
    const handleAdminTabChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.tab) {
        setActiveTab(detail.tab);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };
    const handleOpenAdminChat = () => {
      setIsChatSheetOpen(true);
    };
    window.addEventListener("admin-tab-change", handleAdminTabChange);
    window.addEventListener("open-admin-chat", handleOpenAdminChat);
    return () => {
      window.removeEventListener("admin-tab-change", handleAdminTabChange);
      window.removeEventListener("open-admin-chat", handleOpenAdminChat);
    };
  }, []);

  // Handle tab change with scroll to top
  const handleTabChange = (tab: string) => {
    // Prevent non-CTO from accessing role-management and profile-management tabs
    if ((tab === 'role-management' || tab === 'profile-management') && !isCTO) {
      return;
    }
    setActiveTab(tab);
    setLocation(`/admin/dashboard?tab=${tab}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <Helmet>
        <title>Admin Dashboard | ANZ Global Education</title>
        <meta name="robots" content="noindex, nofollow, noai, noimageai" />
      </Helmet>
      <div className="flex h-screen w-full overflow-hidden bg-muted/30">
      {/* Left Mega Sidebar (3-column navigation) - Fixed height, no scroll */}
      <AdminMegaSidebar 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
        hasFullAdminAccess={hasFullAdminAccess}
        isCTO={isCTO}
        isMarketingExecutive={isMarketingExecutive}
        isAccountsOfficer={isAccountsOfficer}
        isMobileMenuOpen={isMobileMenuOpen}
        onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      {/* Main Content Area - Flex column with fixed header and scrollable content */}
      <div className="flex flex-col flex-1 min-w-0 h-full">
        {/* Top Header - Fixed height, never scrolls */}
        <header className="flex-shrink-0 h-14 flex items-center gap-2 border-b bg-background px-4 md:px-6">
          {/* Desktop-only: hamburger toggle for sidebar (desktop doesn't need it since sidebar is always shown, kept for legacy) */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden flex-shrink-0"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            data-testid="button-mobile-menu-toggle"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          
          <div className="flex flex-1 items-center justify-between gap-4">
            {/* Mobile: show current section title only */}
            <div className="flex lg:hidden flex-1 items-center min-w-0">
              <span className="text-sm font-semibold truncate" data-testid="mobile-section-title">
                {getCurrentBreadcrumbName()}
              </span>
            </div>

            {/* Desktop: full breadcrumb */}
            <div className="hidden lg:flex flex-1">
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
                    <BreadcrumbLink asChild>
                      <Link href="/admin/dashboard#overview" className="text-muted-foreground hover:text-foreground" data-testid="breadcrumb-dashboard">
                        Admin Dashboard
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage data-testid="breadcrumb-current">{getCurrentBreadcrumbName()}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            {/* Platform-wide Notifications, Profile, and Logout */}
            <div className="flex items-center gap-2">
              <ClockInButton />
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

              {/* Logout Button — desktop only; mobile uses More sheet */}
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden lg:flex text-destructive hover:text-destructive hover:bg-destructive/10"
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

          {/* Main Content - Full-height for Applications and Messages, scrollable for all others */}
          {activeTab === "applications" ? (
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden py-4 pb-20 lg:pb-4">
              <AdminApplicationsKanban />
            </div>
          ) : activeTab === "messages" ? (
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <AdminMessagesTab />
            </div>
          ) : activeTab === "email" ? (
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <AdminMailTab />
            </div>
          ) : (
          <div className="flex-1 overflow-y-auto pb-16 lg:pb-0">
            <div className="mx-auto w-full max-w-6xl px-4 md:px-6 py-4">
              {/* Simple single-column layout */}
              <div className="space-y-4">
                <div className="space-y-4 md:space-y-5">
        {/* Dashboard Overview Tab */}
        {activeTab === "overview" && (
          isBranchManager && user?.branchId
            ? <BranchManagerDashboard
                branchId={user.branchId}
                userName={[user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || ""}
                onNavigate={(tab) => setActiveTab(tab)}
              />
            : <AdminDashboardOverview
                onNavigate={(tab) => setActiveTab(tab)}
                hasFullAdminAccess={hasFullAdminAccess}
              />
        )}

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
        {activeTab === "crm-contacts" && adminRole !== 'junior_consultant' && adminRole !== 'support_staff' && (
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">User Management</CardTitle>
                  <CardDescription className="text-xs">View and manage all platform users. Use Team Invitations to add new team members.</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => syncUsersToCrmMutation.mutate()}
                  disabled={syncUsersToCrmMutation.isPending}
                  data-testid="button-sync-users-to-crm"
                >
                  {syncUsersToCrmMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1.5" />
                      Sync to CRM
                    </>
                  )}
                </Button>
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
                      <TableHead className="py-2 text-xs font-semibold">Branch</TableHead>
                      <TableHead className="py-2 text-xs font-semibold">Status</TableHead>
                      <TableHead className="py-2 text-xs font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-3 text-sm">Loading...</TableCell>
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
                            <Select
                              value={user.branchId ?? "none"}
                              onValueChange={(value) => updateUserMutation.mutate({
                                userId: user.id,
                                branchId: value === "none" ? null : value,
                              })}
                            >
                              <SelectTrigger className="w-[130px] h-7 text-xs" data-testid={`select-branch-${user.id}`}>
                                <SelectValue placeholder="Assign branch" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No Branch</SelectItem>
                                {branches?.filter(b => b.isActive).map((branch) => (
                                  <SelectItem key={branch.id} value={branch.id}>
                                    {branch.name}
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
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleViewUser(user)}
                                    title="View user details"
                                    data-testid={`button-view-user-${user.id}`}
                                  >
                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditUser(user)}
                                    title="Edit user"
                                    data-testid={`button-edit-user-${user.id}`}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setDeletingUser(user)}
                                    title="Delete user"
                                    data-testid={`button-delete-user-${user.id}`}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center">No users found</TableCell>
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
          showInstitutionEditor ? (
            <InstitutionEditor
              institution={editingInstitution}
              onBack={handleBackFromInstitutionEditor}
              userId={user?.id}
            />
          ) : (
          <div className="space-y-4">
          <Card>
            <CardHeader className="py-3 px-4">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div>
                  <CardTitle className="text-base">Institution Management</CardTitle>
                  <CardDescription className="text-xs">View and manage all institutions</CardDescription>
                </div>
                <Button size="sm" onClick={handleCreateInstitution} data-testid="button-create-institution">
                  <Plus className="h-4 w-4 mr-1" />
                  Create
                </Button>
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
                        if (confirm(`Deactivate ${selectedInstitutions.size} selected institution(s)? They will be hidden from the public site but can be restored via the Active/Inactive toggle.`)) {
                          bulkDeleteInstitutionsMutation.mutate(Array.from(selectedInstitutions));
                        }
                      }}
                      disabled={bulkDeleteInstitutionsMutation.isPending}
                      data-testid="button-bulk-delete-institutions"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Deactivate Selected
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

              {/* Search and Filter */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or country..."
                    value={institutionSearchQuery}
                    onChange={(e) => setInstitutionSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-sm"
                    data-testid="input-search-institutions"
                  />
                </div>
                <Select value={institutionPublishFilter} onValueChange={setInstitutionPublishFilter}>
                  <SelectTrigger className="w-[130px] h-8 text-sm" data-testid="select-institution-publish-filter">
                    <SelectValue placeholder="Publish Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="draft">Drafts</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Institutions Table - Compact */}
              <div className="overflow-x-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-10 min-w-[40px] py-2 sticky left-0 z-20 bg-background">
                        <Checkbox
                          checked={filteredInstitutions && filteredInstitutions.length > 0 && selectedInstitutions.size === filteredInstitutions.length}
                          onCheckedChange={() => filteredInstitutions && toggleSelectAllInstitutions(filteredInstitutions)}
                          data-testid="checkbox-select-all-institutions"
                        />
                      </TableHead>
                      <TableHead className="py-2 text-xs font-semibold sticky left-10 z-20 bg-background min-w-[200px] border-r border-border">Name</TableHead>
                      <TableHead className="py-2 text-xs font-semibold">Location</TableHead>
                      <TableHead className="py-2 text-xs font-semibold">Assigned To</TableHead>
                      <TableHead className="py-2 text-xs font-semibold">Approval</TableHead>
                      <TableHead className="py-2 text-xs font-semibold">Publish</TableHead>
                      <TableHead className="py-2 text-xs font-semibold">Status</TableHead>
                      <TableHead className="py-2 text-xs font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {institutionsLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-3 text-sm">Loading...</TableCell>
                      </TableRow>
                    ) : paginatedInstitutions && paginatedInstitutions.length > 0 ? (
                      paginatedInstitutions.map((institution) => (
                        <TableRow key={institution.id} data-testid={`row-institution-${institution.id}`} className="hover:bg-muted/50 group">
                          <TableCell className="py-2 sticky left-0 z-10 bg-background group-hover:bg-muted/50 min-w-[40px]">
                            <Checkbox
                              checked={selectedInstitutions.has(institution.id)}
                              onCheckedChange={() => toggleSelectInstitution(institution.id)}
                              data-testid={`checkbox-institution-${institution.id}`}
                            />
                          </TableCell>
                          <TableCell className="py-2 sticky left-10 z-10 bg-background group-hover:bg-muted/50 min-w-[200px] border-r border-border">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8" data-testid={`img-institution-logo-${institution.id}`}>
                                <AvatarImage src={institution.logo || undefined} alt={institution.name} />
                                <AvatarFallback className="text-xs">{institution.name?.[0]?.toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-sm" data-testid={`text-institution-name-${institution.id}`}>{institution.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              {getCountryIsoCode(institution.country) && (
                                <span className={`fi fi-${getCountryIsoCode(institution.country)} rounded-sm`} />
                              )}
                              <span>{institution.country}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-2 text-sm">
                            <Popover 
                              open={assigningInstitutionId === institution.id} 
                              onOpenChange={(open) => setAssigningInstitutionId(open ? institution.id : null)}
                            >
                              <PopoverTrigger asChild>
                                <Button 
                                  variant="ghost"
                                  data-testid={`button-assign-institution-${institution.id}`}
                                >
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center gap-2">
                                        {institution.assignedToName ? (
                                          <>
                                            <Avatar>
                                              <AvatarImage src={institution.assignedToProfileImage || undefined} alt={institution.assignedToName} />
                                              <AvatarFallback className="bg-primary/10 text-primary">{institution.assignedToName?.[0]?.toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                                          </>
                                        ) : institution.createdByName ? (
                                          <>
                                            <Avatar>
                                              <AvatarImage src={institution.createdByProfileImage || undefined} alt={institution.createdByName} />
                                              <AvatarFallback className="bg-muted">{institution.createdByName?.[0]?.toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                                          </>
                                        ) : (
                                          <>
                                            <UserPlus className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-muted-foreground">Assign</span>
                                            <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                                          </>
                                        )}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{institution.assignedToName || institution.createdByName || 'Click to assign'}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[280px] max-w-[90vw] p-0" align="start">
                                <Command>
                                  <CommandInput placeholder="Search team members..." />
                                  <CommandList>
                                    <CommandEmpty>No team members found.</CommandEmpty>
                                    <CommandGroup>
                                      {!adminUsers ? (
                                        <div className="py-2 px-3 text-sm text-muted-foreground">Loading...</div>
                                      ) : (
                                        <>
                                          <CommandItem
                                            value="unassigned"
                                            onSelect={() => assignInstitutionMutation.mutate({ id: institution.id, assignedToUserId: null })}
                                            className="cursor-pointer"
                                          >
                                            <div className="flex items-center gap-2">
                                              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                              <span>Unassigned</span>
                                            </div>
                                            {!institution.assignedToUserId && <Check className="ml-auto h-4 w-4 flex-shrink-0" />}
                                          </CommandItem>
                                          {adminUsers.map((adminUser) => (
                                            <CommandItem
                                              key={adminUser.id}
                                              value={`${adminUser.name} ${adminUser.email}`}
                                              onSelect={() => assignInstitutionMutation.mutate({ id: institution.id, assignedToUserId: adminUser.id })}
                                              className="cursor-pointer"
                                            >
                                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <Avatar className="h-6 w-6 flex-shrink-0">
                                                  {adminUser.profileImageUrl && (
                                                    <AvatarImage src={adminUser.profileImageUrl} alt={adminUser.name} />
                                                  )}
                                                  <AvatarFallback>{adminUser.name?.[0]?.toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col min-w-0 flex-1">
                                                  <span className="text-sm truncate">{adminUser.name}</span>
                                                  <span className="text-xs text-muted-foreground truncate">{adminUser.email}</span>
                                                </div>
                                              </div>
                                              {institution.assignedToUserId === adminUser.id && <Check className="ml-auto h-4 w-4 flex-shrink-0" />}
                                            </CommandItem>
                                          ))}
                                        </>
                                      )}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
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
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild disabled={updateInstitutionPublishStatusMutation.isPending}>
                                <Button variant="ghost" size="sm" data-testid={`button-publish-status-institution-${institution.id}`}>
                                  {institution.publishStatus === "published" ? (
                                    <Badge variant="default" className="bg-blue-600 hover:bg-blue-700 text-xs cursor-pointer">
                                      Published
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs cursor-pointer">
                                      Draft
                                    </Badge>
                                  )}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                <DropdownMenuItem
                                  onClick={() => updateInstitutionPublishStatusMutation.mutate({ id: institution.id, publishStatus: 'draft' })}
                                  disabled={institution.publishStatus === 'draft'}
                                  data-testid={`menu-item-draft-institution-${institution.id}`}
                                >
                                  Save as Draft
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => updateInstitutionPublishStatusMutation.mutate({ id: institution.id, publishStatus: 'published' })}
                                  disabled={institution.publishStatus === 'published'}
                                  data-testid={`menu-item-publish-institution-${institution.id}`}
                                >
                                  Publish
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
                                onClick={() => window.open(`/institutions/${institution.slug || institution.id}`, '_blank')}
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
                        <TableCell colSpan={8} className="text-center">No institutions found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination */}
              {filteredInstitutions && filteredInstitutions.length > 0 && (
                <ListPagination
                  currentPage={institutionPage}
                  totalItems={filteredInstitutions.length}
                  pageSize={institutionPageSize}
                  onPageChange={setInstitutionPage}
                  onPageSizeChange={(size) => {
                    setInstitutionPageSize(size);
                    setInstitutionPage(1);
                  }}
                  itemLabel="institutions"
                />
              )}
            </CardContent>
          </Card>
        </div>
        )
        )}

        {/* Qualification Types Tab */}
        {activeTab === "qualification-types" && hasFullAdminAccess && (
          <AdminQualificationTypesPanel />
        )}

        {/* Entry Requirement Templates Tab */}
        {activeTab === "entry-requirement-templates" && hasFullAdminAccess && (
          <AdminCourseLevelRequirementsPanel />
        )}

        {/* Courses Tab */}
        {activeTab === "courses" && (
          showCourseEditor ? (
            <CourseEditor
              course={editingCourse}
              institutions={institutions || []}
              onBack={handleBackFromCourseEditor}
              userId={user?.id}
            />
          ) : (
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
                {/* Full admins and marketing executives can create courses */}
                {(hasFullAdminAccess || isMarketingExecutive) && (
                  <div className="flex gap-2">
                    {isCTO && (
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
                        if (confirm(`Deactivate ${selectedCourses.size} selected course(s)? They will be hidden from the public site but can be restored via the Active/Inactive toggle.`)) {
                          bulkDeleteCoursesMutation.mutate(Array.from(selectedCourses));
                        }
                      }}
                      disabled={bulkDeleteCoursesMutation.isPending}
                      data-testid="button-bulk-delete-courses"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Deactivate Selected
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
                <Select value={coursePublishFilter} onValueChange={setCoursePublishFilter}>
                  <SelectTrigger className="w-full sm:w-[130px] h-8 text-sm" data-testid="select-course-publish-filter">
                    <SelectValue placeholder="Publish Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="draft">Drafts</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Courses Table - Compact with scroll indicators and navigation */}
              <div className="relative">
                {/* Left scroll button */}
                {showCourseScrollLeft && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-30 rounded-full shadow-md bg-background/95 backdrop-blur-sm"
                    onClick={() => scrollCoursesTable('left')}
                    data-testid="button-scroll-courses-left"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
                {/* Right scroll button */}
                {showCourseScrollRight && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-30 rounded-full shadow-md bg-background/95 backdrop-blur-sm"
                    onClick={() => scrollCoursesTable('right')}
                    data-testid="button-scroll-courses-right"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
                {/* Left gradient indicator */}
                {showCourseScrollLeft && (
                  <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none z-20" />
                )}
                {/* Right gradient indicator */}
                {showCourseScrollRight && (
                  <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none z-20" />
                )}
                <div 
                  ref={coursesTableScrollRef}
                  onScroll={handleCoursesTableScroll}
                  className="overflow-x-auto border rounded-md scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/40"
                >
                  <Table className="min-w-[1200px]">
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
                      <TableHead className="py-2 text-xs font-semibold hidden lg:table-cell">Assigned To</TableHead>
                      <TableHead className="py-2 text-xs font-semibold">Approval</TableHead>
                      <TableHead className="py-2 text-xs font-semibold">Publish</TableHead>
                      <TableHead className="py-2 text-xs font-semibold hidden md:table-cell">Status</TableHead>
                      <TableHead className="py-2 text-xs font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coursesLoading ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-3 text-sm">Loading...</TableCell>
                      </TableRow>
                    ) : paginatedCourses && paginatedCourses.length > 0 ? (
                      paginatedCourses.map((course) => (
                        <TableRow key={course.id} data-testid={`row-course-${course.id}`} className="hover:bg-muted/50 group">
                          <TableCell className="py-2 sticky left-0 z-10 bg-background group-hover:bg-muted/50 min-w-[40px]">
                            <Checkbox
                              checked={selectedCourses.has(course.id)}
                              onCheckedChange={() => toggleSelectCourse(course.id)}
                              data-testid={`checkbox-course-${course.id}`}
                            />
                          </TableCell>
                          <TableCell className="py-2 sticky left-10 z-10 bg-background group-hover:bg-muted/50 min-w-[200px] border-r border-border">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8" data-testid={`img-course-institution-logo-${course.id}`}>
                                <AvatarImage src={course.institutionLogo || undefined} alt={course.institutionName || 'Institution'} />
                                <AvatarFallback className="text-xs">{course.institutionName?.[0]?.toUpperCase() || 'C'}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-sm" data-testid={`text-course-title-${course.id}`}>{course.title}</span>
                              {(hasFullAdminAccess || isMarketingExecutive) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                                  onClick={() => handleEditCourse(course)}
                                  data-testid={`button-quick-edit-course-${course.id}`}
                                >
                                  <Edit className="h-4 w-4 text-primary" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-2 text-sm text-muted-foreground hidden md:table-cell">{course.institutionName}</TableCell>
                          <TableCell className="py-2 text-sm hidden lg:table-cell">{course.level || "-"}</TableCell>
                          <TableCell className="py-2 text-sm hidden xl:table-cell">{course.duration || "-"}</TableCell>
                          <TableCell className="py-2 text-sm hidden sm:table-cell">
                            {course.fees ? `$${Number(course.fees).toLocaleString()}` : "-"}
                          </TableCell>
                          <TableCell className="py-2 text-sm hidden lg:table-cell">
                            <Popover 
                              open={assigningCourseId === course.id} 
                              onOpenChange={(open) => setAssigningCourseId(open ? course.id : null)}
                            >
                              <PopoverTrigger asChild>
                                <Button 
                                  variant="ghost"
                                  data-testid={`button-assign-course-${course.id}`}
                                >
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center gap-2">
                                        {(course as any).assignedToName ? (
                                          <>
                                            <Avatar>
                                              <AvatarImage src={(course as any).assignedToProfileImage || undefined} alt={(course as any).assignedToName} />
                                              <AvatarFallback className="bg-primary/10 text-primary">{(course as any).assignedToName?.[0]?.toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                                          </>
                                        ) : (course as any).createdByName ? (
                                          <>
                                            <Avatar>
                                              <AvatarImage src={(course as any).createdByProfileImage || undefined} alt={(course as any).createdByName} />
                                              <AvatarFallback className="bg-muted">{(course as any).createdByName?.[0]?.toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                                          </>
                                        ) : (
                                          <>
                                            <UserPlus className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-muted-foreground">Assign</span>
                                            <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                                          </>
                                        )}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{(course as any).assignedToName || (course as any).createdByName || 'Click to assign'}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[280px] max-w-[90vw] p-0" align="start">
                                <Command>
                                  <CommandInput placeholder="Search team members..." />
                                  <CommandList>
                                    <CommandEmpty>No team members found.</CommandEmpty>
                                    <CommandGroup>
                                      {!adminUsers ? (
                                        <div className="py-2 px-3 text-sm text-muted-foreground">Loading...</div>
                                      ) : (
                                        <>
                                          <CommandItem
                                            value="unassigned"
                                            onSelect={() => assignCourseMutation.mutate({ id: course.id, assignedToUserId: null })}
                                            className="cursor-pointer"
                                          >
                                            <div className="flex items-center gap-2">
                                              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                              <span>Unassigned</span>
                                            </div>
                                            {!(course as any).assignedToUserId && <Check className="ml-auto h-4 w-4 flex-shrink-0" />}
                                          </CommandItem>
                                          {adminUsers.map((adminUser) => (
                                            <CommandItem
                                              key={adminUser.id}
                                              value={`${adminUser.name} ${adminUser.email}`}
                                              onSelect={() => assignCourseMutation.mutate({ id: course.id, assignedToUserId: adminUser.id })}
                                              className="cursor-pointer"
                                            >
                                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <Avatar className="h-6 w-6 flex-shrink-0">
                                                  {adminUser.profileImageUrl && (
                                                    <AvatarImage src={adminUser.profileImageUrl} alt={adminUser.name} />
                                                  )}
                                                  <AvatarFallback>{adminUser.name?.[0]?.toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col min-w-0 flex-1">
                                                  <span className="text-sm truncate">{adminUser.name}</span>
                                                  <span className="text-xs text-muted-foreground truncate">{adminUser.email}</span>
                                                </div>
                                              </div>
                                              {(course as any).assignedToUserId === adminUser.id && <Check className="ml-auto h-4 w-4 flex-shrink-0" />}
                                            </CommandItem>
                                          ))}
                                        </>
                                      )}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
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
                          <TableCell className="py-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild disabled={updateCoursePublishStatusMutation.isPending}>
                                <Button variant="ghost" size="sm" data-testid={`button-publish-status-course-${course.id}`}>
                                  {course.publishStatus === "published" ? (
                                    (course as any).visibility === 'private' ? (
                                      <Badge variant="default" className="bg-amber-500 text-xs cursor-pointer">
                                        <Lock className="h-3 w-3 mr-1" />
                                        Private
                                      </Badge>
                                    ) : (
                                      <Badge variant="default" className="bg-blue-600 hover:bg-blue-700 text-xs cursor-pointer">
                                        Published
                                      </Badge>
                                    )
                                  ) : (
                                    <Badge variant="outline" className="text-xs cursor-pointer">
                                      Draft
                                    </Badge>
                                  )}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                <DropdownMenuItem
                                  onClick={() => updateCoursePublishStatusMutation.mutate({ id: course.id, publishStatus: 'draft' })}
                                  disabled={course.publishStatus === 'draft'}
                                  data-testid={`menu-item-draft-course-${course.id}`}
                                >
                                  Save as Draft
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => updateCoursePublishStatusMutation.mutate({ id: course.id, publishStatus: 'published', visibility: 'public' })}
                                  disabled={course.publishStatus === 'published' && (course as any).visibility === 'public'}
                                  data-testid={`menu-item-publish-public-course-${course.id}`}
                                >
                                  <Globe className="h-4 w-4 mr-2" />
                                  Publish Publicly
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => updateCoursePublishStatusMutation.mutate({ id: course.id, publishStatus: 'published', visibility: 'private' })}
                                  disabled={course.publishStatus === 'published' && (course as any).visibility === 'private'}
                                  data-testid={`menu-item-publish-private-course-${course.id}`}
                                >
                                  <Lock className="h-4 w-4 mr-2" />
                                  Publish Privately
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
                          <TableCell className="py-2">
                            <div className="flex justify-end gap-1">
                              {/* View button - opens public course page */}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.open(`/courses/${course.slug || course.id}`, '_blank')}
                                title="View public page"
                                data-testid={`button-view-course-${course.id}`}
                              >
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              </Button>
                              {/* Delete button (only for full admins) */}
                              {hasFullAdminAccess && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeletingCourse(course)}
                                  data-testid={`button-delete-course-${course.id}`}
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
                        <TableCell colSpan={11} className="text-center">No courses found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                  </Table>
                </div>
              </div>
              
              {/* Pagination */}
              {filteredCourses && filteredCourses.length > 0 && (
                <ListPagination
                  currentPage={coursePage}
                  totalItems={filteredCourses.length}
                  pageSize={coursePageSize}
                  onPageChange={setCoursePage}
                  onPageSizeChange={(size) => {
                    setCoursePageSize(size);
                    setCoursePage(1);
                  }}
                  itemLabel="courses"
                />
              )}
            </CardContent>
          </Card>
        </div>
        )
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

        {activeTab === "seo-metadata" && (hasFullAdminAccess || adminRole === "marketing_executive") && (
          <div className="space-y-4">
            <AdminSeoPanel />
          </div>
        )}

        {activeTab === "tags" && hasFullAdminAccess && (
          <div className="space-y-4">
            <AdminTagsPanel isCTO={isCTO} />
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

        {/* Role Management Tab - CTO Only */}
        {activeTab === "role-management" && isCTO && (
          <AdminRoleManagementPanel />
        )}

        {/* Profile Management Tab - CTO Only */}
        {activeTab === "profile-management" && isCTO && (
          <AdminProfileManagementPanel />
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

        {/* AI Settings Tab - CTO Only */}
        {activeTab === "ai-settings" && isCTO && (
          <AdminAiSettingsPanel />
        )}

        {/* Team Management Tab */}
        {activeTab === "team" && hasFullAdminAccess && (
          <div className="space-y-4">
            <AdminTeamPanel />
          </div>
        )}


        {activeTab === "thumbnails" && hasFullAdminAccess && (
          <AdminThumbnailManager />
        )}

        {/* Partner API Keys Tab - Platform Admin/CTO Only */}
        {activeTab === "api-keys" && hasFullAdminAccess && (
          <AdminApiKeysPanel />
        )}

        {/* Notification Settings Tab */}
        {activeTab === "notification-settings" && hasFullAdminAccess && (
          <AdminNotificationSettingsPanel />
        )}

        {/* Attendance Tab - People / HR Module */}
        {activeTab === "attendance" && (
          <AttendancePanel
            hasFullAdminAccess={hasFullAdminAccess}
            isCTO={isCTO}
            userBranchId={user?.branchId ?? null}
          />
        )}

        {activeTab === "finance-dashboard" && <FinanceDashboardPanel />}
        {activeTab === "finance-invoices" && <InvoicesPanel />}
        {activeTab === "finance-customers" && <CustomersPanel />}
        {activeTab === "finance-items" && <ItemsPanel />}
        {activeTab === "finance-accounts" && <ChartOfAccountsPanel />}
        {activeTab === "accounting" && hasFullAdminAccess && (
          <AdminAccountingPanel isCTO={isCTO} onNavigate={(tab) => setActiveTab(tab)} />
        )}

              </div>
              {/* End of space-y-4 md:space-y-5 */}
            </div>
            {/* End of space-y-4 */}
          </div>
          {/* End of mx-auto container */}
        </div>
          )}
      </div>
      {/* End of flex-col flex-1 */}

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
              // Convert AI-extracted data to Institution format for the editor
              const draftInstitution: Partial<Institution> = {
                id: "", // Will be created on save
                name: approvedData.name || "",
                country: approvedData.country || "",
                description: approvedData.description || "",
                contactEmail: approvedData.contactEmail || "",
                contactPhone: approvedData.contactPhone || "",
                website: approvedData.website || "",
                providerType: approvedData.providerType || "",
                topDisciplines: Array.isArray(approvedData.topDisciplines) 
                  ? approvedData.topDisciplines 
                  : [],
                topCourses: Array.isArray(approvedData.topCourses)
                  ? approvedData.topCourses
                  : [],
                numberOfCampuses: approvedData.numberOfCampuses || null,
                establishedYear: approvedData.establishedYear || null,
                scholarshipPercentageMin: approvedData.scholarshipPercentageMin || null,
                scholarshipPercentageMax: approvedData.scholarshipPercentageMax || null,
                campusAddresses: approvedData.campusAddresses || [],
                logo: null,
                institutionGallery: [],
                approvalStatus: "pending",
                publishStatus: "draft",
                isActive: true,
                createdAt: null,
                userId: null,
                createdByUserId: null,
                updatedByUserId: null,
                assignedToUserId: null,
                createdByName: null,
                updatedByName: null,
                assignedToName: null,
              };

              // Close AI extractor and open institution editor with pre-filled data
              setAiExtractorDialogOpen(false);
              setEditingInstitution(draftInstitution as Institution);
              setShowInstitutionEditor(true);

              toast({
                title: "Data loaded",
                description: "AI-extracted data has been loaded into the institution editor. Review and submit when ready.",
              });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* View/Edit User Dialog */}
      <Dialog open={viewEditUserDialogOpen} onOpenChange={(open) => { if (!open) handleCloseUserDialog(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {viewEditUserMode === 'view' ? 'User Details' : 'Edit User'}
            </DialogTitle>
            <DialogDescription>
              {viewEditUserMode === 'view' 
                ? `Viewing details for ${selectedUserForEdit?.firstName || ''} ${selectedUserForEdit?.lastName || ''}`
                : `Update details for ${selectedUserForEdit?.firstName || ''} ${selectedUserForEdit?.lastName || ''}`
              }
            </DialogDescription>
          </DialogHeader>
          
          {userDetailsLoading ? (
            <div className="py-8 text-center">Loading user details...</div>
          ) : userDetails ? (
            viewEditUserMode === 'view' ? (
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">First Name</label>
                    <p className="text-sm font-medium">{userDetails.firstName || '-'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Last Name</label>
                    <p className="text-sm font-medium">{userDetails.lastName || '-'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Email</label>
                    <p className="text-sm font-medium">{userDetails.email || '-'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Phone</label>
                    <p className="text-sm font-medium">{userDetails.phone || '-'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">User Type</label>
                    <p className="text-sm font-medium">{formatUserType(userDetails.userType)}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Role</label>
                    <p className="text-sm font-medium">{userDetails.roleName || userDetails.role || '-'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Region</label>
                    <p className="text-sm font-medium">
                      {(userDetails as any).regionName 
                        ? `${(userDetails as any).regionName} (${(userDetails as any).regionCode})` 
                        : 'Not assigned'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Branch</label>
                    <p className="text-sm font-medium">
                      {userDetails.branchName 
                        ? `${userDetails.branchName} (${userDetails.branchCode})` 
                        : 'Not assigned'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Permission Profile</label>
                    <p className="text-sm font-medium">
                      {(userDetails as any).profileName || 'Not assigned'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Status</label>
                    <p className="text-sm font-medium">
                      {userDetails.isActive ? (
                        <Badge variant="default" className="bg-green-600">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Last Login</label>
                    <p className="text-sm font-medium">
                      {userDetails.lastLogin ? new Date(userDetails.lastLogin).toLocaleString() : 'Never'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Created At</label>
                    <p className="text-sm font-medium">
                      {userDetails.createdAt ? new Date(userDetails.createdAt).toLocaleDateString() : '-'}
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={handleCloseUserDialog}>
                    Close
                  </Button>
                  <Button onClick={() => setViewEditUserMode('edit')} data-testid="button-switch-to-edit">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit User
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                updateUserMutation.mutate({
                  userId: userDetails.id,
                  firstName: formData.get('firstName') as string,
                  lastName: formData.get('lastName') as string,
                  email: formData.get('email') as string,
                  phone: formData.get('phone') as string || undefined,
                  regionId: (formData.get('regionId') as string) === 'none' ? null : (formData.get('regionId') as string) || null,
                  branchId: (formData.get('branchId') as string) === 'none' ? null : (formData.get('branchId') as string) || null,
                  profileId: (formData.get('profileId') as string) === 'none' ? null : (formData.get('profileId') as string) || null,
                  userType: formData.get('userType') as string,
                  roleId: (formData.get('roleId') as string) === 'none' ? null : (formData.get('roleId') as string) || null,
                  isActive: formData.get('isActive') === 'true',
                });
              }} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" name="firstName" defaultValue={userDetails.firstName || ''} data-testid="input-edit-first-name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" name="lastName" defaultValue={userDetails.lastName || ''} data-testid="input-edit-last-name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" defaultValue={userDetails.email || ''} data-testid="input-edit-email" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" name="phone" defaultValue={userDetails.phone || ''} data-testid="input-edit-phone" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="userType">User Type</Label>
                    <select name="userType" defaultValue={userDetails.userType} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" data-testid="select-edit-user-type">
                      <option value="student">Student</option>
                      <option value="admin">Admin</option>
                      <option value="platform_admin">Platform Admin</option>
                      <option value="institution_admin">Institution Admin</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="roleId">Role</Label>
                    <select name="roleId" defaultValue={userDetails.roleId || 'none'} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" data-testid="select-edit-role">
                      <option value="none">No Role</option>
                      {roles?.map((role) => (
                        <option key={role.id} value={role.id}>{role.displayName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="regionId">Region</Label>
                    <select name="regionId" defaultValue={(userDetails as any).regionId || 'none'} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" data-testid="select-edit-region">
                      <option value="none">No Region</option>
                      {regions?.filter(r => r.isActive).map((region) => (
                        <option key={region.id} value={region.id}>{region.name} ({region.code})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="branchId">Branch</Label>
                    <select name="branchId" defaultValue={userDetails.branchId || 'none'} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" data-testid="select-edit-branch">
                      <option value="none">No Branch</option>
                      {branches?.filter(b => b.isActive).map((branch) => (
                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profileId">Permission Profile</Label>
                    <select name="profileId" defaultValue={(userDetails as any).profileId || 'none'} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" data-testid="select-edit-profile">
                      <option value="none">No Profile</option>
                      {profilesList?.filter(p => p.isActive).map((profile) => (
                        <option key={profile.id} value={profile.id}>{profile.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="isActive">Status</Label>
                    <select name="isActive" defaultValue={userDetails.isActive ? 'true' : 'false'} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" data-testid="select-edit-status">
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setViewEditUserMode('view')}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateUserMutation.isPending} data-testid="button-save-user">
                    {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </form>
            )
          ) : (
            <div className="py-8 text-center text-muted-foreground">User not found</div>
          )}
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
                  <SelectItem value="cto">CTO</SelectItem>
                  <SelectItem value="platform_admin">Platform Admin</SelectItem>
                  <SelectItem value="branch_manager">Branch Manager</SelectItem>
                  <SelectItem value="support_staff">Support Staff</SelectItem>
                  <SelectItem value="operations_staff">Operations Staff</SelectItem>
                  <SelectItem value="accounts_officer">Accounts Officer</SelectItem>
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

      {/* Transfer Course Dialog */}
      <Dialog open={!!transferringCourse} onOpenChange={() => { setTransferringCourse(null); setSelectedTransferCourseUserId(""); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer Course</DialogTitle>
            <DialogDescription>
              Transfer <strong>{transferringCourse?.title}</strong> to another team member for editing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Assign to</label>
              <Select value={selectedTransferCourseUserId} onValueChange={setSelectedTransferCourseUserId}>
                <SelectTrigger data-testid="select-transfer-course-user">
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
                The selected user will be assigned to manage this course.
              </p>
            </div>
            {(transferringCourse as any)?.assignedToName && (
              <p className="text-sm text-muted-foreground">
                Currently assigned to: <strong>{(transferringCourse as any).assignedToName}</strong>
              </p>
            )}
            {(transferringCourse as any)?.createdByName && (
              <p className="text-sm text-muted-foreground">
                Created by: <strong>{(transferringCourse as any).createdByName}</strong>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setTransferringCourse(null); setSelectedTransferCourseUserId(""); }}>
              Cancel
            </Button>
            <Button
              onClick={() => transferringCourse && selectedTransferCourseUserId && transferCourseMutation.mutate({ id: transferringCourse.id, assignedToUserId: selectedTransferCourseUserId })}
              disabled={!selectedTransferCourseUserId || transferCourseMutation.isPending}
              data-testid="button-confirm-transfer-course"
            >
              {transferCourseMutation.isPending ? "Transferring..." : "Transfer Course"}
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
              // Convert AI-extracted data to Course format for the editor
              const draftCourse: Partial<Course> = {
                id: "", // Will be created on save
                universityId: approvedData.universityId || "",
                title: approvedData.title || "",
                description: approvedData.description || "",
                subject: approvedData.subject || "",
                level: approvedData.level || "",
                duration: approvedData.duration || "",
                fees: approvedData.fees || null,
                isActive: true,
                approvalStatus: "pending",
                publishStatus: "draft",
                rejectionReason: null,
                approvedAt: null,
                approvedBy: null,
                campusLocations: [],
                createdAt: null,
              };

              // Close AI extractor and open course editor with pre-filled data
              setAiCourseExtractorDialogOpen(false);
              setEditingCourse(draftCourse as Course);
              setShowCourseEditor(true);

              toast({
                title: "Course data loaded",
                description: "AI-extracted course information has been loaded into the course editor. Review and submit when ready.",
              });
            }}
          />
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

    {/* Admin Mobile Bottom Navigation — visible only on mobile (lg:hidden) */}
    <AdminMobileBottomNav
      activeTab={activeTab}
      onTabChange={handleTabChange}
      hasFullAdminAccess={hasFullAdminAccess}
      isCTO={isCTO}
      isMarketingExecutive={isMarketingExecutive}
      onLogout={handleLogout}
    />

    <AdminBottomBar />
    <FloatingChatBar />

    <Sheet open={isChatSheetOpen} onOpenChange={setIsChatSheetOpen}>
      <SheetContent side="right" className="w-full sm:max-w-[520px] p-0 flex flex-col [&>button]:z-50">
        <AdminMessagesTab inSheet />
      </SheetContent>
    </Sheet>

    <AlertDialog open={showInactivityWarning}>
      <AlertDialogContent data-testid="dialog-inactivity-warning">
        <AlertDialogHeader>
          <AlertDialogTitle>You're about to be signed out</AlertDialogTitle>
          <AlertDialogDescription>
            You've been inactive for a while. You will be automatically signed out in{" "}
            <span className="font-semibold text-foreground" data-testid="text-seconds-remaining">
              {inactivitySeconds} second{inactivitySeconds !== 1 ? "s" : ""}
            </span>
            .
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction type="button" onClick={stayLoggedIn} data-testid="button-stay-signed-in">
            Stay Signed In
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
