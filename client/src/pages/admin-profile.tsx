import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useSupabaseAuth } from "@/lib/supabase-auth";
import { Loader2, Upload, Check, Shield, Eye, EyeOff, Home, Menu, X, MessageCircle, LogOut } from "lucide-react";
import { AdminMegaSidebar } from "@/components/admin-mega-sidebar";
import { NotificationBell } from "@/components/NotificationBell";

interface AdminUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  // Personal Address fields
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateProvince: string | null;
  postalCode: string | null;
  country: string | null;
  // Emergency Contact fields
  emergencyFirstName: string | null;
  emergencyLastName: string | null;
  emergencyMobile: string | null;
  emergencyEmail: string | null;
  emergencyRelationship: string | null;
  profileImageUrl: string | null;
  userType: string;
  role: string | null;
  roleId: string | null;
  roleName: string | null;
  branchId: string | null;
  branchName: string | null;
  isActive: boolean | null;
  createdAt: string | null;
}

const profileFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  profileImageUrl: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

// Address form schema
const addressFormSchema = z.object({
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  stateProvince: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
});

type AddressFormValues = z.infer<typeof addressFormSchema>;

// Emergency contact form schema
const emergencyContactFormSchema = z.object({
  emergencyFirstName: z.string().optional(),
  emergencyLastName: z.string().optional(),
  emergencyMobile: z.string().optional(),
  emergencyEmail: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  emergencyRelationship: z.string().optional(),
});

type EmergencyContactFormValues = z.infer<typeof emergencyContactFormSchema>;

export default function AdminProfile() {
  const { toast } = useToast();
  const { user, isLoading, isAuthenticated, isAuthResolved, isAdmin, hasFullAdminAccess, isCTO, isMarketingExecutive } = useAuth();
  const { session, signOut } = useSupabaseAuth();
  const [, setLocation] = useLocation();
  const [isUploading, setIsUploading] = useState(false);
  const [imageTimestamp, setImageTimestamp] = useState(Date.now());
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  // Handle tab change - navigate to dashboard with the selected tab (using hash)
  const handleTabChange = (tab: string) => {
    // Navigate to the dashboard with the tab as a hash (dashboard uses hash-based routing)
    setLocation(`/admin/dashboard#${tab}`);
  };

  const getUserInitials = () => {
    if (!user?.email) return "U";
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user.email.substring(0, 2).toUpperCase();
  };

  const handleLogout = async () => {
    try {
      await signOut();
      try {
        await fetch("/api/logout", { method: "GET", credentials: "include", redirect: "manual" });
      } catch {}
      queryClient.clear();
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = "/";
    }
  };

  // Fetch admin profile - works for all user types (hook called before returns)
  const { data: profile, isLoading: isProfileLoading } = useQuery<AdminUser>({
    queryKey: ["/api/admin/profile"],
    enabled: !!user && isAuthenticated && isAdmin,
  });

  // Form setup (hooks called before returns)
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      dateOfBirth: "",
      profileImageUrl: "",
    },
  });

  // Address form setup
  const addressForm = useForm<AddressFormValues>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: {
      addressLine1: "",
      addressLine2: "",
      city: "",
      stateProvince: "",
      postalCode: "",
      country: "",
    },
  });

  // Emergency contact form setup
  const emergencyContactForm = useForm<EmergencyContactFormValues>({
    resolver: zodResolver(emergencyContactFormSchema),
    defaultValues: {
      emergencyFirstName: "",
      emergencyLastName: "",
      emergencyMobile: "",
      emergencyEmail: "",
      emergencyRelationship: "",
    },
  });

  // Update form and photo URL when profile loads
  useEffect(() => {
    if (profile) {
      form.reset({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        phone: profile.phone || "",
        dateOfBirth: profile.dateOfBirth || "",
        profileImageUrl: profile.profileImageUrl || "",
      });
      addressForm.reset({
        addressLine1: profile.addressLine1 || "",
        addressLine2: profile.addressLine2 || "",
        city: profile.city || "",
        stateProvince: profile.stateProvince || "",
        postalCode: profile.postalCode || "",
        country: profile.country || "",
      });
      emergencyContactForm.reset({
        emergencyFirstName: profile.emergencyFirstName || "",
        emergencyLastName: profile.emergencyLastName || "",
        emergencyMobile: profile.emergencyMobile || "",
        emergencyEmail: profile.emergencyEmail || "",
        emergencyRelationship: profile.emergencyRelationship || "",
      });
      setCurrentPhotoUrl(profile.profileImageUrl || null);
    }
  }, [profile, form, addressForm, emergencyContactForm]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      return await apiRequest("PUT", "/api/admin/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/supabase-auth/user"] });
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  // Upload profile photo mutation
  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("photo", file);
      
      // Use apiRequest which handles CSRF tokens and auth headers automatically
      const response = await apiRequest("POST", "/api/admin/upload-profile-photo", formData);
      return await response.json();
    },
    onSuccess: (data) => {
      form.setValue("profileImageUrl", data.photoPath);
      setCurrentPhotoUrl(data.photoPath);
      setImageTimestamp(Date.now());
      queryClient.invalidateQueries({ queryKey: ["/api/admin/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/supabase-auth/user"] });
      toast({
        title: "Photo uploaded",
        description: "Your profile photo has been updated successfully.",
      });
      setIsUploading(false);
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload photo",
        variant: "destructive",
      });
      setIsUploading(false);
    },
  });

  // Update address mutation
  const updateAddressMutation = useMutation({
    mutationFn: async (data: AddressFormValues) => {
      return await apiRequest("PUT", "/api/admin/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/profile"] });
      toast({
        title: "Address updated",
        description: "Your address has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update address",
        variant: "destructive",
      });
    },
  });

  // Update emergency contact mutation
  const updateEmergencyContactMutation = useMutation({
    mutationFn: async (data: EmergencyContactFormValues) => {
      return await apiRequest("PUT", "/api/admin/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/profile"] });
      toast({
        title: "Emergency contact updated",
        description: "Your emergency contact details have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update emergency contact",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 5MB",
          variant: "destructive",
        });
        e.target.value = "";
        return;
      }
      
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive",
        });
        e.target.value = "";
        return;
      }

      setIsUploading(true);
      uploadPhotoMutation.mutate(file);
      e.target.value = "";
    }
  };

  const onSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  const onAddressSubmit = (data: AddressFormValues) => {
    updateAddressMutation.mutate(data);
  };

  const onEmergencyContactSubmit = (data: EmergencyContactFormValues) => {
    updateEmergencyContactMutation.mutate(data);
  };

  // Password change form
  const passwordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: ChangePasswordFormValues) => {
      const token = session?.access_token;
      if (!token) {
        throw new Error("Not authenticated");
      }
      
      const response = await fetch("/api/supabase-auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to change password");
      }

      return await response.json();
    },
    onSuccess: () => {
      passwordForm.reset();
      toast({
        title: "Password changed",
        description: "Your password has been changed successfully. A confirmation email has been sent.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    },
  });

  const onPasswordSubmit = (data: ChangePasswordFormValues) => {
    changePasswordMutation.mutate(data);
  };

  const getInitials = () => {
    if (!profile?.firstName && !profile?.lastName) return "AD";
    return `${profile?.firstName?.[0] || ""}${profile?.lastName?.[0] || ""}`.toUpperCase();
  };

  const getRoleDisplay = () => {
    // Prefer the actual role name from the roles table
    if (profile?.roleName) return profile.roleName;
    // Fallback to legacy role field
    if (profile?.role === "cto") return "CTO";
    if (profile?.role === "support_manager") return "Support Manager";
    if (profile?.role === "content_editor") return "Content Editor";
    return "Team Member";
  };

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

  // Don't render profile content until authentication is confirmed
  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-muted/30">
      {/* Left Mega Sidebar - Same as dashboard */}
      <AdminMegaSidebar 
        activeTab="profile" 
        onTabChange={handleTabChange} 
        hasFullAdminAccess={hasFullAdminAccess}
        isCTO={isCTO}
        isMarketingExecutive={isMarketingExecutive}
        isMobileMenuOpen={isMobileMenuOpen}
        onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 h-full">
        {/* Top Header with Breadcrumb - Same as dashboard */}
        <header className="flex-shrink-0 h-14 flex items-center gap-2 border-b bg-background px-4 md:px-6">
          {/* Mobile menu toggle */}
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
                  <BreadcrumbLink asChild>
                    <Link href="/admin/dashboard#overview" className="text-muted-foreground hover:text-foreground" data-testid="breadcrumb-dashboard">
                      Admin Dashboard
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage data-testid="breadcrumb-current">My Profile</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            
            {/* Platform-wide Notifications, Messages, Profile, and Logout */}
            <div className="flex items-center gap-2">
              <NotificationBell />
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link href="/admin/dashboard#messages">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative"
                      data-testid="button-messages"
                    >
                      <MessageCircle className="h-5 w-5" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Messages</TooltipContent>
              </Tooltip>
              
              {/* Profile Avatar */}
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link href="/admin/profile">
                    <Avatar className="h-9 w-9 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all" data-testid="button-admin-profile-header">
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

        {/* Scrollable Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-profile-title">
            Admin Profile
          </h1>
          <p className="text-muted-foreground">
            Manage your personal information and account settings
          </p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="profile" data-testid="tab-profile">Profile</TabsTrigger>
            <TabsTrigger value="security" data-testid="tab-security">
              <Shield className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            {/* Profile Photo Card */}
            <Card>
          <CardHeader>
            <CardTitle>Profile Photo</CardTitle>
            <CardDescription>
              Upload a profile photo to personalize your account. Photo updates automatically when selected.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="relative">
                {currentPhotoUrl ? (
                  <div className="h-24 w-24 rounded-full overflow-hidden bg-muted" data-testid="avatar-profile">
                    <img
                      src={`${currentPhotoUrl}?t=${imageTimestamp}`}
                      alt="Profile photo"
                      className="h-full w-full object-cover block"
                      onError={(e) => {
                        const container = e.currentTarget.parentElement;
                        if (container) {
                          container.innerHTML = `<div class="h-24 w-24 flex items-center justify-center text-2xl font-semibold">${getInitials()}</div>`;
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center text-2xl font-semibold" data-testid="avatar-profile">
                    {getInitials()}
                  </div>
                )}
                {(isUploading || uploadPhotoMutation.isPending) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={isUploading || uploadPhotoMutation.isPending}
                    className="hidden"
                    data-testid="input-photo-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("photo-upload")?.click()}
                    disabled={isUploading || uploadPhotoMutation.isPending}
                    data-testid="button-upload-photo"
                  >
                    {isUploading || uploadPhotoMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Choose Photo
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  JPG, PNG or GIF. Max size 5MB. Photo saves automatically.
                </p>
                {uploadPhotoMutation.isSuccess && (
                  <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                    <Check className="h-4 w-4" />
                    Photo uploaded successfully!
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>
              Update your personal details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="John" 
                            {...field} 
                            data-testid="input-firstName"
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
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Doe" 
                            {...field} 
                            data-testid="input-lastName"
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
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input 
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
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth</FormLabel>
                        <FormControl>
                          <Input 
                            type="date"
                            {...field} 
                            data-testid="input-dateOfBirth"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <Button
                    type="submit"
                    disabled={updateProfileMutation.isPending || !form.formState.isDirty}
                    data-testid="button-save-profile"
                  >
                    {updateProfileMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Personal Address Card */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Address</CardTitle>
            <CardDescription>
              Update your address details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...addressForm}>
              <form onSubmit={addressForm.handleSubmit(onAddressSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={addressForm.control}
                    name="addressLine1"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Address Line 1</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Street address" 
                            {...field} 
                            data-testid="input-addressLine1"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addressForm.control}
                    name="addressLine2"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Address Line 2</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Apartment, suite, unit, etc. (optional)" 
                            {...field} 
                            data-testid="input-addressLine2"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addressForm.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Sydney" 
                            {...field} 
                            data-testid="input-city"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addressForm.control}
                    name="stateProvince"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State / Province</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="NSW" 
                            {...field} 
                            data-testid="input-stateProvince"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addressForm.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="2000" 
                            {...field} 
                            data-testid="input-postalCode"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addressForm.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Australia" 
                            {...field} 
                            data-testid="input-country"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <Button
                    type="submit"
                    disabled={updateAddressMutation.isPending || !addressForm.formState.isDirty}
                    data-testid="button-save-address"
                  >
                    {updateAddressMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Save Address
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Emergency Contact Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Emergency Contact Details</CardTitle>
            <CardDescription>
              Add emergency contact information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...emergencyContactForm}>
              <form onSubmit={emergencyContactForm.handleSubmit(onEmergencyContactSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={emergencyContactForm.control}
                    name="emergencyFirstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Contact first name" 
                            {...field} 
                            data-testid="input-emergencyFirstName"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={emergencyContactForm.control}
                    name="emergencyLastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Contact last name" 
                            {...field} 
                            data-testid="input-emergencyLastName"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={emergencyContactForm.control}
                    name="emergencyMobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="+61 400 000 000" 
                            {...field} 
                            data-testid="input-emergencyMobile"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={emergencyContactForm.control}
                    name="emergencyEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email"
                            placeholder="contact@email.com" 
                            {...field} 
                            data-testid="input-emergencyEmail"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={emergencyContactForm.control}
                    name="emergencyRelationship"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Relationship</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Spouse, Parent, Sibling" 
                            {...field} 
                            data-testid="input-emergencyRelationship"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <Button
                    type="submit"
                    disabled={updateEmergencyContactMutation.isPending || !emergencyContactForm.formState.isDirty}
                    data-testid="button-save-emergency-contact"
                  >
                    {updateEmergencyContactMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Save Emergency Contact
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Account Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              View your account details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-sm" data-testid="text-email">{profile?.email || "Not set"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Role</p>
                <p className="text-sm" data-testid="text-role">{getRoleDisplay()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Branch</p>
                <p className="text-sm" data-testid="text-branch">{profile?.branchName || "Not assigned"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Account Status</p>
                <p className="text-sm" data-testid="text-status">
                  {profile?.isActive ? "Active" : "Inactive"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Member Since</p>
                <p className="text-sm" data-testid="text-member-since">
                  {profile?.createdAt 
                    ? new Date(profile.createdAt).toLocaleDateString()
                    : "Unknown"}
                </p>
              </div>
            </div>
          </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            {/* Change Password Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Change Password
                </CardTitle>
                <CardDescription>
                  Update your password to keep your account secure. You'll receive an email confirmation after changing your password.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showCurrentPassword ? "text" : "password"}
                                placeholder="Enter current password"
                                {...field}
                                data-testid="input-current-password"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                data-testid="button-toggle-current-password"
                              >
                                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showNewPassword ? "text" : "password"}
                                placeholder="Enter new password (min. 6 characters)"
                                {...field}
                                data-testid="input-new-password"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                data-testid="button-toggle-new-password"
                              >
                                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Confirm new password"
                                {...field}
                                data-testid="input-confirm-password"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                data-testid="button-toggle-confirm-password"
                              >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="pt-4 border-t">
                      <Button
                        type="submit"
                        disabled={changePasswordMutation.isPending}
                        data-testid="button-change-password"
                      >
                        {changePasswordMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Changing Password...
                          </>
                        ) : (
                          <>
                            <Shield className="h-4 w-4 mr-2" />
                            Change Password
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
