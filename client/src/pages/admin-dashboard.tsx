import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Users, Building2, ShieldCheck, ShieldOff, Search, Plus, Edit, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

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
  location: string;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  userId: string | null;
  providerType: string | null;
  numberOfCampuses: number | null;
  establishedYear: number | null;
  scholarshipPercentage: number | null;
  topDisciplines: string[] | null;
  createdAt: string | null;
}

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
  location: z.string().min(1, "Location is required"),
  description: z.string().optional(),
  contactEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  providerType: z.string().optional(),
  numberOfCampuses: z.coerce.number().int().positive().optional().or(z.literal("")),
  establishedYear: z.coerce.number().int().min(1800).max(new Date().getFullYear()).optional().or(z.literal("")),
  scholarshipPercentage: z.coerce.number().min(0).max(100).optional().or(z.literal("")),
});

export default function AdminDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("users");
  
  // User state
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  // Institution state
  const [institutionSearchQuery, setInstitutionSearchQuery] = useState("");
  const [institutionDialogOpen, setInstitutionDialogOpen] = useState(false);
  const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null);
  const [deletingInstitution, setDeletingInstitution] = useState<Institution | null>(null);

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
      location: "",
      description: "",
      contactEmail: "",
      contactPhone: "",
      website: "",
      providerType: "",
    },
  });

  // Queries
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/super-admin/users"],
  });

  const { data: institutions, isLoading: institutionsLoading } = useQuery<Institution[]>({
    queryKey: ["/api/super-admin/institutions"],
  });

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
      institution.name.toLowerCase().includes(institutionSearchQuery.toLowerCase()) ||
      institution.location.toLowerCase().includes(institutionSearchQuery.toLowerCase())
    );
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
    institutionForm.reset();
    setInstitutionDialogOpen(true);
  };

  const handleEditInstitution = (institution: Institution) => {
    setEditingInstitution(institution);
    institutionForm.reset({
      name: institution.name,
      location: institution.location,
      description: institution.description || "",
      contactEmail: institution.contactEmail || "",
      contactPhone: institution.contactPhone || "",
      website: institution.website || "",
      providerType: institution.providerType || "",
      numberOfCampuses: institution.numberOfCampuses as any,
      establishedYear: institution.establishedYear as any,
      scholarshipPercentage: institution.scholarshipPercentage as any,
    });
    setInstitutionDialogOpen(true);
  };

  const handleSubmitInstitution = (data: z.infer<typeof institutionSchema>) => {
    if (editingInstitution) {
      updateInstitutionMutation.mutate({ id: editingInstitution.id, data });
    } else {
      createInstitutionMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-dashboard-title">Super Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage all platform users and institutions</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" data-testid="tab-users">
            <Users className="h-4 w-4 mr-2" />
            Users ({userStats.total})
          </TabsTrigger>
          <TabsTrigger value="institutions" data-testid="tab-institutions">
            <Building2 className="h-4 w-4 mr-2" />
            Institutions ({institutionStats.total})
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          {/* Stats */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
                    <SelectItem value="admin">Admins</SelectItem>
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
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
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
                        <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                      </TableRow>
                    ) : filteredUsers && filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                          <TableCell className="font-medium">
                            {user.firstName} {user.lastName}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={user.userType === "admin" ? "default" : "secondary"}>
                              {user.userType}
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
                        <TableCell colSpan={6} className="text-center">No users found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Institutions Tab */}
        <TabsContent value="institutions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                  <CardTitle>Institution Management</CardTitle>
                  <CardDescription>View and manage all institutions</CardDescription>
                </div>
                <Button onClick={handleCreateInstitution} data-testid="button-create-institution">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Institution
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or location..."
                  value={institutionSearchQuery}
                  onChange={(e) => setInstitutionSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-institutions"
                />
              </div>

              {/* Institutions Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Provider Type</TableHead>
                      <TableHead>Campuses</TableHead>
                      <TableHead>Scholarship</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {institutionsLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                      </TableRow>
                    ) : filteredInstitutions && filteredInstitutions.length > 0 ? (
                      filteredInstitutions.map((institution) => (
                        <TableRow key={institution.id} data-testid={`row-institution-${institution.id}`}>
                          <TableCell className="font-medium">{institution.name}</TableCell>
                          <TableCell>{institution.location}</TableCell>
                          <TableCell>{institution.providerType || "N/A"}</TableCell>
                          <TableCell>{institution.numberOfCampuses || "N/A"}</TableCell>
                          <TableCell>{institution.scholarshipPercentage ? `${institution.scholarshipPercentage}%` : "N/A"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditInstitution(institution)}
                                data-testid={`button-edit-institution-${institution.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingInstitution(institution)}
                                data-testid={`button-delete-institution-${institution.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">No institutions found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
                        <SelectItem value="admin">Admin</SelectItem>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingInstitution ? "Edit Institution" : "Create Institution"}</DialogTitle>
            <DialogDescription>
              {editingInstitution ? "Update institution information" : "Create a new institution"}
            </DialogDescription>
          </DialogHeader>
          <Form {...institutionForm}>
            <form onSubmit={institutionForm.handleSubmit(handleSubmitInstitution)} className="space-y-4">
              <FormField
                control={institutionForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="University Name" data-testid="input-institution-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={institutionForm.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="City, Country" data-testid="input-institution-location" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={institutionForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Brief description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={institutionForm.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="contact@university.edu" />
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
                        <Input {...field} placeholder="+1234567890" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={institutionForm.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://university.edu" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={institutionForm.control}
                  name="providerType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provider Type</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Public University" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={institutionForm.control}
                  name="establishedYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Established Year</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" placeholder="1950" onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : "")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={institutionForm.control}
                  name="numberOfCampuses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Campuses</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" placeholder="1" onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : "")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={institutionForm.control}
                  name="scholarshipPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scholarship %</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" placeholder="10" onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : "")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setInstitutionDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createInstitutionMutation.isPending || updateInstitutionMutation.isPending} data-testid="button-submit-institution">
                  {editingInstitution ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
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
    </div>
  );
}
