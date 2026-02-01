import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useSupabaseAuth } from "@/lib/supabase-auth";
import { Loader2, Upload, Check, Shield, Eye, EyeOff, User } from "lucide-react";
import { StudentSidebar, StudentSidebarProvider } from "@/components/student-sidebar";
import type { StudentProfile } from "@shared/schema";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export default function StudentAccount() {
  const { toast } = useToast();
  const { user, isLoading, isAuthenticated, isAuthResolved } = useAuth();
  const { session } = useSupabaseAuth();
  const [, setLocation] = useLocation();
  const [isUploading, setIsUploading] = useState(false);
  const [imageTimestamp, setImageTimestamp] = useState(Date.now());
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (isAuthResolved && !isAuthenticated) {
      setLocation("/auth");
    }
  }, [isAuthResolved, isAuthenticated, setLocation]);

  // Fetch student profile
  const { data: profile, isLoading: profileLoading } = useQuery<StudentProfile>({
    queryKey: ["/api/student/profile"],
    enabled: isAuthenticated,
  });

  // Update photo URL when profile loads
  useEffect(() => {
    if (profile) {
      setCurrentPhotoUrl(profile.profileImageUrl || null);
    }
  }, [profile]);

  // Upload profile photo mutation
  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("photo", file);
      
      const response = await apiRequest("POST", "/api/student/upload-profile-photo", formData);
      return await response.json();
    },
    onSuccess: (data) => {
      setCurrentPhotoUrl(data.photoPath);
      setImageTimestamp(Date.now());
      queryClient.invalidateQueries({ queryKey: ["/api/student/profile"] });
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
        description: "Your password has been changed successfully.",
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
    if (profile?.firstName && profile?.lastName) {
      return `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "ST";
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

  // Don't render content until authentication is confirmed
  if (!isAuthenticated) {
    return null;
  }

  return (
    <StudentSidebarProvider>
      <div className="flex min-h-screen bg-background">
        <StudentSidebar />
        
        {/* Main Content */}
        <main className="flex-1 ml-16 lg:ml-72 p-4 lg:p-6 overflow-auto">
          <div className="max-w-3xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold" data-testid="text-account-title">
                My Account
              </h1>
              <p className="text-muted-foreground">
                Manage your account settings and security
              </p>
            </div>

            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="profile" data-testid="tab-profile">
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </TabsTrigger>
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
                        <p className="text-sm" data-testid="text-email">{user?.email || "Not set"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Name</p>
                        <p className="text-sm" data-testid="text-name">
                          {profile?.firstName && profile?.lastName 
                            ? `${profile.firstName} ${profile.lastName}` 
                            : "Not set"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Account Type</p>
                        <p className="text-sm" data-testid="text-account-type">Student</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Member Since</p>
                        <p className="text-sm" data-testid="text-member-since">
                          {profile?.createdAt 
                            ? new Date(profile.createdAt).toLocaleDateString()
                            : user?.createdAt 
                              ? new Date(user.createdAt).toLocaleDateString()
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

                        <div className="pt-4">
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

                {/* Future Security Options Placeholder */}
                <Card>
                  <CardHeader>
                    <CardTitle>Additional Security</CardTitle>
                    <CardDescription>
                      More security options coming soon
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Two-factor authentication and other security features will be available here in the future.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </StudentSidebarProvider>
  );
}
