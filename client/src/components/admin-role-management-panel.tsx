/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Shield, 
  Search, 
  Eye,
  Check,
  Users,
  Key,
  Edit2,
  Layers,
} from "lucide-react";

interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  userType: string;
  isActive: boolean;
  createdAt: string | null;
  hierarchyLevel: number | null;
  defaultScope: 'global' | 'region' | 'branch' | 'self' | null;
}

interface Permission {
  id: string;
  resource: string;
  action: string;
  displayName: string;
  description: string | null;
}

interface UserWithRole {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  userType: string;
  roleId: string | null;
  isActive: boolean;
  createdAt: string | null;
  role: Role | null;
}

interface RolePermissions {
  role: Role;
  permissions: Permission[];
}

export function AdminRoleManagementPanel() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterUserType, setFilterUserType] = useState<string>("all");
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);
  const [selectedNewRoleId, setSelectedNewRoleId] = useState<string>("");
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editHierarchyLevel, setEditHierarchyLevel] = useState<number>(50);
  const [editDefaultScope, setEditDefaultScope] = useState<string>("branch");

  const { data: users, isLoading: usersLoading } = useQuery<UserWithRole[]>({
    queryKey: ["/api/admin/role-management/users"],
  });

  const { data: roles, isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ["/api/admin/roles"],
  });

  const { data: rolePermissions, isLoading: permissionsLoading } = useQuery<RolePermissions>({
    queryKey: [`/api/admin/roles/${selectedRoleId}/permissions`],
    enabled: !!selectedRoleId,
  });

  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      return apiRequest("PATCH", `/api/admin/users/${userId}/assign-role`, { roleId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/role-management/users"] });
      toast({
        title: "Role Assigned",
        description: "User role has been updated successfully.",
      });
      setAssigningUserId(null);
      setSelectedNewRoleId("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign role. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateHierarchyMutation = useMutation({
    mutationFn: async ({ roleId, hierarchyLevel, defaultScope }: { 
      roleId: string; 
      hierarchyLevel: number; 
      defaultScope: string;
    }) => {
      return apiRequest("PATCH", `/api/admin/roles/${roleId}/hierarchy`, { 
        hierarchyLevel, 
        defaultScope 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles"] });
      toast({
        title: "Hierarchy Updated",
        description: "Role hierarchy settings have been updated successfully.",
      });
      setEditingRoleId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update hierarchy. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEditHierarchy = (role: Role) => {
    setEditingRoleId(role.id);
    setEditHierarchyLevel(role.hierarchyLevel ?? 50);
    setEditDefaultScope(role.defaultScope ?? "branch");
  };

  const handleSaveHierarchy = () => {
    if (!editingRoleId) return;
    updateHierarchyMutation.mutate({
      roleId: editingRoleId,
      hierarchyLevel: editHierarchyLevel,
      defaultScope: editDefaultScope,
    });
  };

  const getScopeLabel = (scope: string | null) => {
    switch (scope) {
      case 'global': return 'Global (All Data)';
      case 'region': return 'Region (Country)';
      case 'branch': return 'Branch (Office)';
      case 'self': return 'Self (Own Data)';
      default: return 'Not Set';
    }
  };

  const getScopeBadgeColor = (scope: string | null) => {
    switch (scope) {
      case 'global': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'region': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'branch': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'self': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const filteredUsers = users?.filter(user => {
    const matchesSearch = 
      (user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    
    const matchesType = filterUserType === "all" || user.userType === filterUserType;
    
    return matchesSearch && matchesType;
  }) || [];

  const getRolesByUserType = (userType: string) => {
    return roles?.filter(role => role.userType === userType) || [];
  };

  const getUserTypeBadgeColor = (userType: string) => {
    switch (userType) {
      case "platform_admin":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "admin":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const handleAssignRole = (userId: string) => {
    if (!selectedNewRoleId) {
      toast({
        title: "Select a Role",
        description: "Please select a role to assign.",
        variant: "destructive",
      });
      return;
    }
    assignRoleMutation.mutate({ userId, roleId: selectedNewRoleId });
  };

  const groupPermissionsByResource = (permissions: Permission[]) => {
    const grouped: Record<string, Permission[]> = {};
    permissions.forEach(perm => {
      if (!grouped[perm.resource]) {
        grouped[perm.resource] = [];
      }
      grouped[perm.resource].push(perm);
    });
    return grouped;
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Roles</p>
              <p className="text-xl font-bold" data-testid="text-total-roles">{roles?.length || 0}</p>
            </div>
            <Shield className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Admin Users</p>
              <p className="text-xl font-bold" data-testid="text-admin-users">
                {users?.filter(u => u.userType === "admin" || u.userType === "platform_admin").length || 0}
              </p>
            </div>
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Platform Admins</p>
              <p className="text-xl font-bold" data-testid="text-platform-admins">
                {users?.filter(u => u.userType === "platform_admin").length || 0}
              </p>
            </div>
            <Key className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">With Assigned Roles</p>
              <p className="text-xl font-bold" data-testid="text-assigned-roles">
                {users?.filter(u => u.roleId).length || 0}
              </p>
            </div>
            <Check className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader className="py-3 px-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div>
              <CardTitle className="text-base">Role Management</CardTitle>
              <CardDescription className="text-xs">
                Manage user roles and permissions for admin users
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-users"
              />
            </div>
            <Select value={filterUserType} onValueChange={setFilterUserType}>
              <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-filter-user-type">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All User Types</SelectItem>
                <SelectItem value="platform_admin">Platform Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">User</TableHead>
                  <TableHead className="min-w-[120px]">User Type</TableHead>
                  <TableHead className="min-w-[150px]">Current Role</TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                  <TableHead className="text-right min-w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">
                            {user.firstName && user.lastName 
                              ? `${user.firstName} ${user.lastName}` 
                              : user.email || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getUserTypeBadgeColor(user.userType)} variant="secondary">
                          {user.userType === "platform_admin" ? "Platform Admin" : "Admin"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.role ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {user.role.displayName}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => setSelectedRoleId(user.role!.id)}
                              data-testid={`button-view-permissions-${user.id}`}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No role assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? "default" : "secondary"}>
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAssigningUserId(user.id);
                            setSelectedNewRoleId(user.roleId || "");
                          }}
                          data-testid={`button-assign-role-${user.id}`}
                        >
                          <Shield className="h-3 w-3 mr-1" />
                          Assign Role
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No users found matching your criteria
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            <div>
              <CardTitle className="text-base">Role Hierarchy</CardTitle>
              <CardDescription className="text-xs">
                Configure data visibility scope for each role (lower level = higher authority)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rolesLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full" />
              ))
            ) : roles?.sort((a, b) => (a.hierarchyLevel ?? 100) - (b.hierarchyLevel ?? 100)).map((role) => (
              <Card 
                key={role.id} 
                className="p-3"
                data-testid={`card-role-${role.id}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm">{role.displayName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Level {role.hierarchyLevel ?? 'N/A'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-[10px]">
                      {role.userType === "platform_admin" ? "Platform" : "Admin"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleEditHierarchy(role)}
                      data-testid={`button-edit-hierarchy-${role.id}`}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    className={`text-[10px] ${getScopeBadgeColor(role.defaultScope)}`}
                    variant="secondary"
                  >
                    {getScopeLabel(role.defaultScope)}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setSelectedRoleId(role.id)}
                    data-testid={`button-view-perms-${role.id}`}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Permissions
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedRoleId} onOpenChange={() => setSelectedRoleId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {rolePermissions?.role.displayName || "Role"} Permissions
            </DialogTitle>
            <DialogDescription>
              {rolePermissions?.role.description || "View all permissions for this role"}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {permissionsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : rolePermissions?.permissions && rolePermissions.permissions.length > 0 ? (
              <div className="space-y-4">
                {Object.entries(groupPermissionsByResource(rolePermissions.permissions)).map(([resource, perms]) => (
                  <div key={resource}>
                    <h4 className="text-sm font-medium capitalize mb-2 flex items-center gap-2">
                      <Key className="h-3 w-3" />
                      {resource}
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {perms.map(perm => (
                        <Badge key={perm.id} variant="secondary" className="text-xs">
                          {perm.action}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No permissions assigned to this role
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!assigningUserId} onOpenChange={() => setAssigningUserId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Role</DialogTitle>
            <DialogDescription>
              Select a role to assign to this user
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {(() => {
              const user = users?.find(u => u.id === assigningUserId);
              if (!user) return null;
              
              const availableRoles = getRolesByUserType(user.userType);
              
              return (
                <>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">
                      {user.firstName && user.lastName 
                        ? `${user.firstName} ${user.lastName}` 
                        : user.email}
                    </p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    <Badge className={`mt-2 ${getUserTypeBadgeColor(user.userType)}`} variant="secondary">
                      {user.userType === "platform_admin" ? "Platform Admin" : "Admin"}
                    </Badge>
                  </div>
                  
                  <Select value={selectedNewRoleId} onValueChange={setSelectedNewRoleId}>
                    <SelectTrigger data-testid="select-new-role">
                      <SelectValue placeholder="Select a role..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map(role => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setAssigningUserId(null)}
                      data-testid="button-cancel-assign"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => handleAssignRole(assigningUserId!)}
                      disabled={assignRoleMutation.isPending || !selectedNewRoleId}
                      data-testid="button-confirm-assign"
                    >
                      {assignRoleMutation.isPending ? "Assigning..." : "Assign Role"}
                    </Button>
                  </div>
                </>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingRoleId} onOpenChange={() => setEditingRoleId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Edit Role Hierarchy
            </DialogTitle>
            <DialogDescription>
              Configure hierarchy level and data visibility scope for this role
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {(() => {
              const role = roles?.find(r => r.id === editingRoleId);
              if (!role) return null;
              
              return (
                <>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">{role.displayName}</p>
                    <p className="text-xs text-muted-foreground">{role.description || `Role for ${role.userType}`}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Hierarchy Level</label>
                    <p className="text-xs text-muted-foreground">
                      Lower number = higher authority. Users can see data from roles with higher level numbers.
                    </p>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={editHierarchyLevel}
                      onChange={(e) => setEditHierarchyLevel(parseInt(e.target.value) || 50)}
                      data-testid="input-hierarchy-level"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Default Data Scope</label>
                    <p className="text-xs text-muted-foreground">
                      Determines what data users with this role can see by default.
                    </p>
                    <Select value={editDefaultScope} onValueChange={setEditDefaultScope}>
                      <SelectTrigger data-testid="select-default-scope">
                        <SelectValue placeholder="Select scope..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="global">Global - See all data</SelectItem>
                        <SelectItem value="region">Region - See data in their country</SelectItem>
                        <SelectItem value="branch">Branch - See data in their office</SelectItem>
                        <SelectItem value="self">Self - See only own data</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setEditingRoleId(null)}
                      data-testid="button-cancel-hierarchy"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveHierarchy}
                      disabled={updateHierarchyMutation.isPending}
                      data-testid="button-save-hierarchy"
                    >
                      {updateHierarchyMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
