import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Key, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  Clock, 
  Activity,
  AlertTriangle,
  RefreshCw,
  Shield,
  Server,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  createdByUserId: string;
  description: string | null;
  usageCount: number;
  lastUsedAt: string | null;
  lastUsedIp: string | null;
  rateLimitPerMinute: number;
  rateLimitPerHour: number;
  isActive: boolean;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

interface ApiKeyWithSecret extends ApiKey {
  key: string;
  message: string;
}

interface UsageLog {
  id: string;
  apiKeyId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  resourceType: string | null;
  resourceId: string | null;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

const PERMISSION_OPTIONS = [
  { value: 'institutions:create', label: 'Create Institutions' },
  { value: 'institutions:read', label: 'Read Institutions' },
  { value: 'courses:create', label: 'Create Courses' },
  { value: 'courses:read', label: 'Read Courses' },
];

export function AdminApiKeysPanel() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
  const [newKeyData, setNewKeyData] = useState<ApiKeyWithSecret | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showFullKey, setShowFullKey] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: ['institutions:create', 'courses:create', 'institutions:read'],
    rateLimitPerMinute: 100,
    rateLimitPerHour: 1000,
    expiresAt: '',
  });

  const { data: apiKeys = [], isLoading, refetch } = useQuery<ApiKey[]>({
    queryKey: ['/api/admin/api-keys'],
  });

  const { data: keyUsage } = useQuery<{ logs: UsageLog[] }>({
    queryKey: ['/api/admin/api-keys', selectedKey?.id, 'usage'],
    enabled: !!selectedKey && isViewDialogOpen,
  });

  const createKeyMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest('POST', '/api/admin/api-keys', data);
      return response.json();
    },
    onSuccess: (data: ApiKeyWithSecret) => {
      setNewKeyData(data);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/api-keys'] });
      toast({
        title: "API Key Created",
        description: "Store the API key securely - it won't be shown again.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create API key",
        variant: "destructive",
      });
    },
  });

  const revokeKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/admin/api-keys/${id}`);
      return response.json();
    },
    onSuccess: () => {
      setIsRevokeDialogOpen(false);
      setSelectedKey(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/api-keys'] });
      toast({
        title: "API Key Revoked",
        description: "The API key has been revoked and can no longer be used.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to revoke API key",
        variant: "destructive",
      });
    },
  });

  const handleCreateKey = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a name for the API key",
        variant: "destructive",
      });
      return;
    }
    createKeyMutation.mutate(formData);
  };

  const handleCopyKey = async () => {
    if (newKeyData?.key) {
      await navigator.clipboard.writeText(newKeyData.key);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
      toast({
        title: "Copied",
        description: "API key copied to clipboard",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      permissions: ['institutions:create', 'courses:create', 'institutions:read'],
      rateLimitPerMinute: 100,
      rateLimitPerHour: 1000,
      expiresAt: '',
    });
    setNewKeyData(null);
    setShowFullKey(false);
    setCopiedKey(false);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const openViewDialog = (key: ApiKey) => {
    setSelectedKey(key);
    setIsViewDialogOpen(true);
  };

  const openRevokeDialog = (key: ApiKey) => {
    setSelectedKey(key);
    setIsRevokeDialogOpen(true);
  };

  const getStatusBadge = (key: ApiKey) => {
    if (key.revokedAt) {
      return <Badge variant="destructive" data-testid={`badge-status-revoked-${key.id}`}>Revoked</Badge>;
    }
    if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
      return <Badge variant="secondary" data-testid={`badge-status-expired-${key.id}`}>Expired</Badge>;
    }
    if (!key.isActive) {
      return <Badge variant="secondary" data-testid={`badge-status-disabled-${key.id}`}>Disabled</Badge>;
    }
    return <Badge variant="default" className="bg-green-600" data-testid={`badge-status-active-${key.id}`}>Active</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" data-testid="text-api-keys-title">Partner API Keys</h2>
          <p className="text-muted-foreground" data-testid="text-api-keys-description">
            Manage API keys for external partners and AI bots to submit institutions and courses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            data-testid="button-refresh-api-keys"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={openCreateDialog} data-testid="button-create-api-key">
            <Plus className="h-4 w-4 mr-2" />
            Create API Key
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Keys
          </CardTitle>
          <CardDescription>
            {apiKeys.length} API key{apiKeys.length !== 1 ? 's' : ''} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8" data-testid="loading-api-keys">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="empty-api-keys">
              <Server className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No API Keys</h3>
              <p className="text-muted-foreground mb-4">
                Create an API key to allow external partners to submit institutions and courses
              </p>
              <Button onClick={openCreateDialog} data-testid="button-create-first-api-key">
                <Plus className="h-4 w-4 mr-2" />
                Create First API Key
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key Prefix</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((key) => (
                  <TableRow key={key.id} data-testid={`row-api-key-${key.id}`}>
                    <TableCell>
                      <div className="font-medium" data-testid={`text-key-name-${key.id}`}>{key.name}</div>
                      {key.description && (
                        <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {key.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded" data-testid={`text-key-prefix-${key.id}`}>
                        {key.keyPrefix}...
                      </code>
                    </TableCell>
                    <TableCell>{getStatusBadge(key)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1" data-testid={`text-usage-count-${key.id}`}>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        {key.usageCount.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      {key.lastUsedAt ? (
                        <span className="text-sm" data-testid={`text-last-used-${key.id}`}>
                          {formatDistanceToNow(new Date(key.lastUsedAt), { addSuffix: true })}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm" data-testid={`text-created-at-${key.id}`}>
                        {format(new Date(key.createdAt), 'MMM d, yyyy')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openViewDialog(key)}
                          data-testid={`button-view-key-${key.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!key.revokedAt && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openRevokeDialog(key)}
                            className="text-destructive hover:text-destructive"
                            data-testid={`button-revoke-key-${key.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
        setIsCreateDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {newKeyData ? 'API Key Created' : 'Create API Key'}
            </DialogTitle>
            <DialogDescription>
              {newKeyData 
                ? 'Copy this API key now. You won\'t be able to see it again.'
                : 'Create a new API key for partner access to submit institutions and courses.'
              }
            </DialogDescription>
          </DialogHeader>

          {newKeyData ? (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Important:</strong> This API key will only be shown once. 
                    Store it securely - you won't be able to retrieve it later.
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>API Key</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <Input
                      value={showFullKey ? newKeyData.key : `${newKeyData.key.substring(0, 20)}${'•'.repeat(20)}`}
                      readOnly
                      className="font-mono text-sm pr-10"
                      data-testid="input-new-api-key"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setShowFullKey(!showFullKey)}
                      data-testid="button-toggle-key-visibility"
                    >
                      {showFullKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleCopyKey}
                    data-testid="button-copy-api-key"
                  >
                    {copiedKey ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>Use this key in the <code className="bg-muted px-1 py-0.5 rounded">X-API-Key</code> header when making requests to the Partner API.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., AI Bot - Course Scraper"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  data-testid="input-key-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="What will this API key be used for?"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  data-testid="input-key-description"
                />
              </div>

              <div className="space-y-2">
                <Label>Permissions</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PERMISSION_OPTIONS.map((perm) => (
                    <div key={perm.value} className="flex items-center space-x-2">
                      <Switch
                        id={perm.value}
                        checked={formData.permissions.includes(perm.value)}
                        onCheckedChange={(checked) => {
                          setFormData({
                            ...formData,
                            permissions: checked 
                              ? [...formData.permissions, perm.value]
                              : formData.permissions.filter(p => p !== perm.value)
                          });
                        }}
                        data-testid={`switch-permission-${perm.value}`}
                      />
                      <Label htmlFor={perm.value} className="text-sm font-normal cursor-pointer">
                        {perm.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rateLimitPerMinute">Rate Limit (per minute)</Label>
                  <Input
                    id="rateLimitPerMinute"
                    type="number"
                    value={formData.rateLimitPerMinute}
                    onChange={(e) => setFormData({ ...formData, rateLimitPerMinute: parseInt(e.target.value) || 100 })}
                    data-testid="input-rate-limit-minute"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rateLimitPerHour">Rate Limit (per hour)</Label>
                  <Input
                    id="rateLimitPerHour"
                    type="number"
                    value={formData.rateLimitPerHour}
                    onChange={(e) => setFormData({ ...formData, rateLimitPerHour: parseInt(e.target.value) || 1000 })}
                    data-testid="input-rate-limit-hour"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiresAt">Expiration Date (optional)</Label>
                <Input
                  id="expiresAt"
                  type="date"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  data-testid="input-expires-at"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            {newKeyData ? (
              <Button onClick={() => {
                setIsCreateDialogOpen(false);
                resetForm();
              }} data-testid="button-close-create-dialog">
                Done
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} data-testid="button-cancel-create">
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateKey} 
                  disabled={createKeyMutation.isPending}
                  data-testid="button-confirm-create"
                >
                  {createKeyMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4 mr-2" />
                      Create Key
                    </>
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>API Key Details</DialogTitle>
            <DialogDescription>
              View details and usage logs for this API key
            </DialogDescription>
          </DialogHeader>

          {selectedKey && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Name</Label>
                  <p className="font-medium" data-testid="view-key-name">{selectedKey.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedKey)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Key Prefix</Label>
                  <code className="text-sm bg-muted px-2 py-1 rounded" data-testid="view-key-prefix">
                    {selectedKey.keyPrefix}...
                  </code>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Total Usage</Label>
                  <p className="font-medium" data-testid="view-usage-count">{selectedKey.usageCount.toLocaleString()} requests</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Created</Label>
                  <p className="text-sm">{format(new Date(selectedKey.createdAt), 'PPpp')}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Last Used</Label>
                  <p className="text-sm">
                    {selectedKey.lastUsedAt 
                      ? format(new Date(selectedKey.lastUsedAt), 'PPpp')
                      : 'Never'
                    }
                  </p>
                </div>
                {selectedKey.description && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground text-xs">Description</Label>
                    <p className="text-sm">{selectedKey.description}</p>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-muted-foreground text-xs mb-2 block">Permissions</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedKey.permissions.map((perm) => (
                    <Badge key={perm} variant="secondary" className="flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      {perm}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground text-xs mb-2 block">Rate Limits</Label>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    {selectedKey.rateLimitPerMinute}/min
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    {selectedKey.rateLimitPerHour}/hour
                  </div>
                </div>
              </div>

              {keyUsage && keyUsage.logs && keyUsage.logs.length > 0 && (
                <div>
                  <Label className="text-muted-foreground text-xs mb-2 block">Recent Usage</Label>
                  <div className="max-h-[200px] overflow-y-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Time</TableHead>
                          <TableHead className="text-xs">Endpoint</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                          <TableHead className="text-xs">IP</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {keyUsage.logs.slice(0, 10).map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-xs">
                              {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                            </TableCell>
                            <TableCell className="text-xs font-mono">
                              <span className={`px-1 py-0.5 rounded text-[10px] font-medium mr-1 ${
                                log.method === 'POST' ? 'bg-green-100 text-green-700' :
                                log.method === 'GET' ? 'bg-blue-100 text-blue-700' :
                                log.method === 'DELETE' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {log.method}
                              </span>
                              {log.endpoint}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={log.statusCode >= 200 && log.statusCode < 300 ? 'default' : 'destructive'}
                                className="text-[10px] px-1 py-0"
                              >
                                {log.statusCode}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">{log.ipAddress}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isRevokeDialogOpen} onOpenChange={setIsRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke this API key? This action cannot be undone.
              Any systems using this key will immediately lose access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selectedKey && (
            <div className="my-4 p-3 bg-muted rounded-lg">
              <p className="font-medium">{selectedKey.name}</p>
              <code className="text-sm text-muted-foreground">{selectedKey.keyPrefix}...</code>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-revoke">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedKey && revokeKeyMutation.mutate(selectedKey.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-revoke"
            >
              {revokeKeyMutation.isPending ? 'Revoking...' : 'Revoke Key'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
