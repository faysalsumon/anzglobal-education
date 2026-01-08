import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserPlus, Mail, RotateCcw, Trash2, Clock, CheckCircle, XCircle, AlertCircle, Loader2, User, Building2 } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import type { InvitationWithDetails, Role, Branch } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const inviteFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  roleId: z.string().min(1, "Please select a role"),
  userType: z.enum(["admin", "platform_admin"]),
  note: z.string().optional(),
});

type InviteFormData = z.infer<typeof inviteFormSchema>;

const createUserFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  roleId: z.string().min(1, "Please select a role"),
  userType: z.enum(["admin", "platform_admin"]),
  branchId: z.string().optional(),
});

type CreateUserFormData = z.infer<typeof createUserFormSchema>;

function getStatusBadge(status: string, expiresAt: Date) {
  const isExpired = new Date() > new Date(expiresAt);
  
  if (status === "pending" && isExpired) {
    return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Expired</Badge>;
  }
  
  switch (status) {
    case "pending":
      return <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300"><AlertCircle className="h-3 w-3" /> Pending</Badge>;
    case "accepted":
      return <Badge variant="default" className="gap-1 bg-green-600"><CheckCircle className="h-3 w-3" /> Accepted</Badge>;
    case "revoked":
      return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Revoked</Badge>;
    case "expired":
      return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Expired</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export function AdminTeamPanel() {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [creationMethod, setCreationMethod] = useState<"invite" | "create">("invite");
  const { toast } = useToast();

  const inviteForm = useForm<InviteFormData>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
      roleId: "",
      userType: "admin",
      note: "",
    },
  });

  const createUserForm = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      roleId: "",
      userType: "admin",
      branchId: "",
    },
  });

  const { data: invitations = [], isLoading: isLoadingInvitations } = useQuery<InvitationWithDetails[]>({
    queryKey: ["/api/admin/invitations"],
  });

  const { data: roles = [], isLoading: isLoadingRoles } = useQuery<Role[]>({
    queryKey: ["/api/admin/invitations/roles"],
  });

  const { data: branches = [], isLoading: isLoadingBranches } = useQuery<Branch[]>({
    queryKey: ["/api/admin/branches"],
  });

  const createInvitationMutation = useMutation({
    mutationFn: async (data: InviteFormData) => {
      const response = await apiRequest("POST", "/api/admin/invitations", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/invitations"] });
      setIsInviteDialogOpen(false);
      inviteForm.reset();
      toast({
        title: "Invitation Sent",
        description: "The team member will receive an email with instructions to join.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send invitation",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserFormData) => {
      // Convert "none" to undefined for branchId
      const payload = {
        ...data,
        branchId: data.branchId === "none" || data.branchId === "" ? undefined : data.branchId,
      };
      const response = await apiRequest("POST", "/api/supabase-auth/admin/create-user", payload);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team-members"] });
      setIsCreateUserDialogOpen(false);
      createUserForm.reset();
      toast({
        title: "User Created Successfully",
        description: "The user will receive an email with their login credentials and will be required to change their password on first login.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create user",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const resendInvitationMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/admin/invitations/${id}/resend`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/invitations"] });
      toast({
        title: "Invitation Resent",
        description: "A new invitation email has been sent.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to resend invitation",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const revokeInvitationMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/admin/invitations/${id}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/invitations"] });
      toast({
        title: "Invitation Revoked",
        description: "The invitation has been cancelled.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to revoke invitation",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const onInviteSubmit = (data: InviteFormData) => {
    createInvitationMutation.mutate(data);
  };

  const onCreateUserSubmit = (data: CreateUserFormData) => {
    createUserMutation.mutate(data);
  };

  const pendingInvitations = invitations.filter(i => i.status === "pending");
  const otherInvitations = invitations.filter(i => i.status !== "pending");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Team Management</h2>
          <p className="text-muted-foreground">Invite and manage team members</p>
        </div>
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-invite-team-member">
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Team Member
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Send an invitation email to add a new team member. They'll receive a link to set up their account.
              </DialogDescription>
            </DialogHeader>
            <Form {...inviteForm}>
              <form onSubmit={inviteForm.handleSubmit(onInviteSubmit)} className="space-y-4">
                <FormField
                  control={inviteForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="colleague@example.com" 
                          type="email"
                          data-testid="input-invite-email"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={inviteForm.control}
                  name="roleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-invite-role">
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingRoles ? (
                            <SelectItem value="loading" disabled>Loading roles...</SelectItem>
                          ) : (
                            roles.map((role) => (
                              <SelectItem key={role.id} value={role.id}>
                                {role.displayName}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={inviteForm.control}
                  name="userType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-invite-user-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="admin">Admin (Staff)</SelectItem>
                          <SelectItem value="platform_admin">Platform Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={inviteForm.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Personal Note (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Add a welcome message..."
                          className="resize-none"
                          data-testid="input-invite-note"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsInviteDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createInvitationMutation.isPending}
                    data-testid="button-send-invitation"
                  >
                    {createInvitationMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Invitation
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Create User Dialog */}
        <Dialog open={isCreateUserDialogOpen} onOpenChange={setIsCreateUserDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" data-testid="button-create-user">
              <User className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create User Account</DialogTitle>
              <DialogDescription>
                Create a new user account directly. They'll receive an email with login credentials and must change their password on first login.
              </DialogDescription>
            </DialogHeader>
            <Form {...createUserForm}>
              <form onSubmit={createUserForm.handleSubmit(onCreateUserSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createUserForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="John" 
                            data-testid="input-create-firstname"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createUserForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Smith" 
                            data-testid="input-create-lastname"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={createUserForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="john.smith@example.com" 
                          type="email"
                          data-testid="input-create-email"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createUserForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="+61 400 000 000" 
                          type="tel"
                          data-testid="input-create-phone"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createUserForm.control}
                    name="roleId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-create-role">
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoadingRoles ? (
                              <SelectItem value="loading" disabled>Loading roles...</SelectItem>
                            ) : (
                              roles.map((role) => (
                                <SelectItem key={role.id} value={role.id}>
                                  {role.displayName}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createUserForm.control}
                    name="userType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>User Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-create-user-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="admin">Admin (Staff)</SelectItem>
                            <SelectItem value="platform_admin">Platform Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={createUserForm.control}
                  name="branchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branch (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-create-branch">
                            <SelectValue placeholder="Select a branch" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No Branch</SelectItem>
                          {isLoadingBranches ? (
                            <SelectItem value="loading" disabled>Loading branches...</SelectItem>
                          ) : (
                            branches.map((branch) => (
                              <SelectItem key={branch.id} value={branch.id}>
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-3 w-3" />
                                  {branch.name}
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3 text-sm text-amber-800 dark:text-amber-200">
                  <strong>Note:</strong> A temporary password will be generated and sent to the user via email. They will be required to change it on first login.
                </div>
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateUserDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createUserMutation.isPending}
                    data-testid="button-submit-create-user"
                  >
                    {createUserMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Create User
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pending Invitations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pending Invitations</CardTitle>
          <CardDescription>
            Invitations awaiting acceptance. Invitations expire after 7 days.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingInvitations ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : pendingInvitations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No pending invitations</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invited</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvitations.map((invitation) => (
                  <TableRow key={invitation.id} data-testid={`row-invitation-${invitation.id}`}>
                    <TableCell className="font-medium">{invitation.email}</TableCell>
                    <TableCell>{invitation.role?.displayName || "—"}</TableCell>
                    <TableCell>{getStatusBadge(invitation.status, invitation.expiresAt)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDistanceToNow(new Date(invitation.createdAt!), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(invitation.expiresAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => resendInvitationMutation.mutate(invitation.id)}
                              disabled={resendInvitationMutation.isPending}
                              data-testid={`button-resend-${invitation.id}`}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Resend Invitation</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => revokeInvitationMutation.mutate(invitation.id)}
                              disabled={revokeInvitationMutation.isPending}
                              className="text-destructive hover:text-destructive"
                              data-testid={`button-revoke-${invitation.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Revoke Invitation</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invitation History */}
      {otherInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Invitation History</CardTitle>
            <CardDescription>
              Past invitations that have been accepted, revoked, or expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invited By</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {otherInvitations.map((invitation) => (
                  <TableRow key={invitation.id} data-testid={`row-invitation-history-${invitation.id}`}>
                    <TableCell className="font-medium">{invitation.email}</TableCell>
                    <TableCell>{invitation.role?.displayName || "—"}</TableCell>
                    <TableCell>{getStatusBadge(invitation.status, invitation.expiresAt)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {invitation.invitedBy?.firstName && invitation.invitedBy?.lastName
                        ? `${invitation.invitedBy.firstName} ${invitation.invitedBy.lastName}`
                        : invitation.invitedBy?.email || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(invitation.createdAt!), "MMM d, yyyy")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
