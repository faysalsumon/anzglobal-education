import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Upload, Check } from "lucide-react";
import { AdminLayout } from "@/components/admin-layout";

interface AdminUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  userType: string;
  role: string | null;
  isActive: boolean | null;
  createdAt: string | null;
}

const profileFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  profileImageUrl: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function AdminProfile() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [imageTimestamp, setImageTimestamp] = useState(Date.now());
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(null);

  // Fetch admin profile - works for all user types
  const { data: profile, isLoading } = useQuery<AdminUser>({
    queryKey: ["/api/admin/profile"],
    enabled: !!user,
  });

  // Form setup
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      profileImageUrl: "",
    },
  });

  // Update form and photo URL when profile loads
  useEffect(() => {
    if (profile) {
      form.reset({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        profileImageUrl: profile.profileImageUrl || "",
      });
      setCurrentPhotoUrl(profile.profileImageUrl || null);
    }
  }, [profile, form]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      return await apiRequest("PUT", "/api/admin/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
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
      
      const response = await fetch("/api/admin/upload-profile-photo", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to upload photo");
      }

      return await response.json();
    },
    onSuccess: (data) => {
      form.setValue("profileImageUrl", data.photoPath);
      setCurrentPhotoUrl(data.photoPath);
      setImageTimestamp(Date.now());
      queryClient.invalidateQueries({ queryKey: ["/api/admin/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
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

  const onSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  const getInitials = () => {
    if (!profile?.firstName && !profile?.lastName) return "AD";
    return `${profile?.firstName?.[0] || ""}${profile?.lastName?.[0] || ""}`.toUpperCase();
  };

  const getRoleDisplay = () => {
    if (profile?.role === "super_admin") return "Super Admin";
    if (profile?.role === "support_manager") return "Support Manager";
    if (profile?.role === "content_editor") return "Content Editor";
    return "Admin";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <AdminLayout activeTab="profile" breadcrumbTitle="Profile">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-profile-title">
            Admin Profile
          </h1>
          <p className="text-muted-foreground">
            Manage your personal information and account settings
          </p>
        </div>

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
      </div>
    </AdminLayout>
  );
}
