import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { 
  UserCog, 
  Eye,
  Check,
  X,
  Shield,
} from "lucide-react";

interface ProfilePermissionRow {
  module: string;
  canCreate: boolean | null;
  canRead: boolean | null;
  canUpdate: boolean | null;
  canDelete: boolean | null;
}

interface Profile {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  isSystemProfile: boolean | null;
  isActive: boolean | null;
  permissions: ProfilePermissionRow[];
}

interface ProfilePermission {
  module: string;
  canCreate: boolean | null;
  canRead: boolean | null;
  canUpdate: boolean | null;
  canDelete: boolean | null;
}

interface ProfileWithPermissions {
  profile: Profile;
  permissions: ProfilePermission[];
}

const MODULES = ['leads', 'applications', 'courses', 'institutions', 'users', 'reports', 'tasks'];

export function AdminProfileManagementPanel() {
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  const { data: profiles, isLoading: profilesLoading } = useQuery<Profile[]>({
    queryKey: ["/api/admin/profiles"],
  });

  const { data: profileDetails, isLoading: detailsLoading } = useQuery<ProfileWithPermissions>({
    queryKey: ["/api/admin/profiles", selectedProfileId],
    enabled: !!selectedProfileId,
  });

  const getPermissionBadge = (allowed: boolean | null) => {
    if (allowed) {
      return (
        <Badge variant="default" className="h-5 w-5 p-0 flex items-center justify-center">
          <Check className="h-3 w-3" />
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center opacity-40">
        <X className="h-3 w-3" />
      </Badge>
    );
  };

  const getModuleDisplayName = (module: string) => {
    const names: Record<string, string> = {
      leads: 'Leads',
      applications: 'Applications',
      courses: 'Courses',
      institutions: 'Institutions',
      users: 'Users',
      reports: 'Reports',
      tasks: 'Tasks',
    };
    return names[module] || module.charAt(0).toUpperCase() + module.slice(1);
  };

  const getProfileDescription = (name: string) => {
    const descriptions: Record<string, string> = {
      full_access: 'Complete CRUD access to all modules',
      standard: 'Create, read, and update (no delete)',
      data_entry: 'Create and read access for data entry',
      read_only: 'View-only access to all modules',
    };
    return descriptions[name] || 'Custom permission profile';
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Profiles</p>
              <p className="text-xl font-bold" data-testid="text-total-profiles">{profiles?.length || 0}</p>
            </div>
            <UserCog className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">System Profiles</p>
              <p className="text-xl font-bold" data-testid="text-system-profiles">
                {profiles?.filter(p => p.isSystemProfile).length || 0}
              </p>
            </div>
            <Shield className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Active Profiles</p>
              <p className="text-xl font-bold" data-testid="text-active-profiles">
                {profiles?.filter(p => p.isActive).length || 0}
              </p>
            </div>
            <Check className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Modules</p>
              <p className="text-xl font-bold" data-testid="text-modules-count">{MODULES.length}</p>
            </div>
            <UserCog className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-base">Permission Profiles</CardTitle>
          <CardDescription className="text-xs">
            Profiles define WHAT actions users can perform (Create, Read, Update, Delete) on each module
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {profilesLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))
            ) : profiles?.map((profile) => (
              <Card 
                key={profile.id} 
                className="p-3 cursor-pointer hover-elevate"
                onClick={() => setSelectedProfileId(profile.id)}
                data-testid={`card-profile-${profile.id}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm">{profile.displayName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {profile.description || getProfileDescription(profile.name)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {profile.isSystemProfile && (
                    <Badge variant="secondary" className="text-[10px]">
                      System
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs ml-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProfileId(profile.id);
                    }}
                    data-testid={`button-view-profile-${profile.id}`}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-base">Permission Matrix Overview</CardTitle>
          <CardDescription className="text-xs">
            Quick view of CRUD permissions across all profiles and modules
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Profile</TableHead>
                  {MODULES.map(module => (
                    <TableHead key={module} className="text-center min-w-[80px] text-xs">
                      {getModuleDisplayName(module)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {profilesLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      {MODULES.map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : profiles?.map((profile) => (
                  <TableRow 
                    key={profile.id} 
                    className="cursor-pointer"
                    onClick={() => setSelectedProfileId(profile.id)}
                    data-testid={`row-profile-${profile.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{profile.displayName}</span>
                        {profile.isSystemProfile && (
                          <Badge variant="outline" className="text-[10px]">System</Badge>
                        )}
                      </div>
                    </TableCell>
                    {MODULES.map(module => {
                      const perm = profile.permissions?.find(p => p.module === module);
                      const accessLevel = perm
                        ? [
                            perm.canCreate ? 'C' : '',
                            perm.canRead ? 'R' : '',
                            perm.canUpdate ? 'U' : '',
                            perm.canDelete ? 'D' : '',
                          ].join('') || '-'
                        : '-';
                      return (
                        <TableCell key={module} className="text-center">
                          <Badge 
                            variant={accessLevel === 'CRUD' ? 'default' : 'secondary'} 
                            className="text-[10px] font-mono"
                          >
                            {accessLevel}
                          </Badge>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            C = Create, R = Read, U = Update, D = Delete
          </p>
        </CardContent>
      </Card>

      <Dialog open={!!selectedProfileId} onOpenChange={() => setSelectedProfileId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              {profileDetails?.profile.displayName || "Profile"} Permissions
            </DialogTitle>
            <DialogDescription>
              {profileDetails?.profile.description || "View detailed CRUD permissions for this profile"}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {detailsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : profileDetails?.permissions && profileDetails.permissions.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Module</TableHead>
                      <TableHead className="text-center w-20">Create</TableHead>
                      <TableHead className="text-center w-20">Read</TableHead>
                      <TableHead className="text-center w-20">Update</TableHead>
                      <TableHead className="text-center w-20">Delete</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profileDetails.permissions.map((perm) => (
                      <TableRow key={perm.module}>
                        <TableCell className="font-medium">
                          {getModuleDisplayName(perm.module)}
                        </TableCell>
                        <TableCell className="text-center">
                          {getPermissionBadge(perm.canCreate)}
                        </TableCell>
                        <TableCell className="text-center">
                          {getPermissionBadge(perm.canRead)}
                        </TableCell>
                        <TableCell className="text-center">
                          {getPermissionBadge(perm.canUpdate)}
                        </TableCell>
                        <TableCell className="text-center">
                          {getPermissionBadge(perm.canDelete)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No permissions configured for this profile
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
