import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  BookOpen,
  FileText,
  Lock,
  Globe,
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
  { value: 'institutions:update', label: 'Update Institutions' },
  { value: 'institutions:read', label: 'Read Institutions' },
  { value: 'courses:create', label: 'Create Courses' },
  { value: 'courses:update', label: 'Update Courses' },
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

  const [copiedGuidelines, setCopiedGuidelines] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const handleCopyGuidelines = async () => {
    const guidelinesText = generateGuidelinesMarkdown(baseUrl);
    await navigator.clipboard.writeText(guidelinesText);
    setCopiedGuidelines(true);
    setTimeout(() => setCopiedGuidelines(false), 2000);
    toast({ title: "Copied", description: "API guidelines copied to clipboard" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" data-testid="text-api-keys-title">Partner API</h2>
          <p className="text-muted-foreground" data-testid="text-api-keys-description">
            Manage API keys and view documentation for external partners and AI bots
          </p>
        </div>
      </div>

      <Tabs defaultValue="keys" className="space-y-4">
        <TabsList>
          <TabsTrigger value="keys" className="flex items-center gap-1.5" data-testid="tab-api-keys">
            <Key className="h-4 w-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="guidelines" className="flex items-center gap-1.5" data-testid="tab-api-guidelines">
            <BookOpen className="h-4 w-4" />
            API Guidelines
          </TabsTrigger>
        </TabsList>

        <TabsContent value="keys" className="space-y-4">
          <div className="flex items-center justify-end gap-2">
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
        </TabsContent>

        <TabsContent value="guidelines" className="space-y-4">
          <div className="flex items-center justify-end">
            <Button onClick={handleCopyGuidelines} variant="outline" data-testid="button-copy-guidelines">
              {copiedGuidelines ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copiedGuidelines ? 'Copied' : 'Copy Full Guidelines'}
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Authentication
              </CardTitle>
              <CardDescription>
                All Partner API requests require an API key sent via header
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">Include your API key in the <code className="bg-muted px-1.5 py-0.5 rounded text-xs">X-API-Key</code> request header:</p>
              <CodeBlock code={`curl -X GET "${baseUrl}/api/partner/health" \\\n  -H "X-API-Key: anz_live_YOUR_KEY_HERE"`} />
              <p className="text-sm text-muted-foreground">API keys are created in the API Keys tab. Each key has scoped permissions and rate limits.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Endpoints
              </CardTitle>
              <CardDescription>
                All endpoints use base URL: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{baseUrl}</code>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <EndpointDoc
                method="GET"
                path="/api/partner/health"
                description="Health check. No authentication required."
                responseExample={`{ "status": "ok", "timestamp": "2026-03-16T..." }`}
              />

              <EndpointDoc
                method="GET"
                path="/api/partner/institutions"
                description="List all institutions. Supports search query parameter."
                permission="institutions:read"
                queryParams={[{ name: "search", description: "Filter by institution name (optional)" }, { name: "limit", description: "Max results (default: 50)" }]}
                responseExample={`{ "data": [{ "id": "...", "name": "...", "country": "..." }], "total": 42 }`}
              />

              <EndpointDoc
                method="GET"
                path="/api/partner/institutions/:id"
                description="Get full details of a specific institution by ID."
                permission="institutions:read"
                responseExample={`{ "id": "...", "name": "...", "country": "...", "campusAddresses": [...] }`}
              />

              <EndpointDoc
                method="POST"
                path="/api/partner/institutions"
                description="Create a new institution (saved as draft, pending admin approval)."
                permission="institutions:create"
                bodyFields={[
                  { name: "name", required: true, description: "Institution name (min 2 chars)" },
                  { name: "country", required: true, description: "Country name" },
                  { name: "description", required: true, description: "Full description (min 50 chars)" },
                  { name: "smallDescription", required: true, description: "Short description for cards (min 30 chars)" },
                  { name: "website", required: true, description: "Institution website URL" },
                  { name: "contactEmail", required: true, description: "Contact email" },
                  { name: "contactPhone", required: true, description: "Contact phone (min 8 chars)" },
                  { name: "establishedYear", required: true, description: "Year founded (1800-current)" },
                  { name: "tuitionFeesMin", required: true, description: "Minimum annual tuition" },
                  { name: "tuitionFeesMax", required: true, description: "Maximum annual tuition" },
                  { name: "intakePeriods", required: true, description: 'Array: ["February", "July"]' },
                  { name: "deliveryModes", required: true, description: 'Array: ["On Campus", "Online"]' },
                  { name: "internationalStudentSupport", required: true, description: "true/false" },
                  { name: "campusAddresses", required: false, description: "Array of campus objects (see format below)" },
                  { name: "numberOfCampuses", required: false, description: "Number of campuses" },
                  { name: "providerType", required: false, description: "University, Institution, Tafe, or School" },
                  { name: "logo", required: false, description: "Logo image URL" },
                  { name: "tags", required: false, description: "Array of tag strings" },
                  { name: "facilities", required: false, description: "Array of facility names" },
                ]}
              />

              <EndpointDoc
                method="PATCH"
                path="/api/partner/institutions/:id"
                description="Update an existing institution. Send only the fields you want to change. Particularly useful for adding campus addresses after initial creation."
                permission="institutions:update"
                bodyFields={[
                  { name: "campusAddresses", required: false, description: "Array of campus objects (see format below)" },
                  { name: "numberOfCampuses", required: false, description: "Number of campuses" },
                  { name: "description", required: false, description: "Updated description" },
                  { name: "smallDescription", required: false, description: "Updated short description" },
                  { name: "website", required: false, description: "Updated website URL" },
                  { name: "contactEmail", required: false, description: "Updated contact email" },
                  { name: "contactPhone", required: false, description: "Updated contact phone" },
                  { name: "tuitionFeesMin", required: false, description: "Updated min tuition" },
                  { name: "tuitionFeesMax", required: false, description: "Updated max tuition" },
                  { name: "intakePeriods", required: false, description: "Updated intake periods array" },
                  { name: "deliveryModes", required: false, description: "Updated delivery modes array" },
                  { name: "facilities", required: false, description: "Updated facilities array" },
                  { name: "tags", required: false, description: "Updated tags array" },
                ]}
                responseExample={`{\n  "success": true,\n  "message": "Institution updated successfully.",\n  "data": {\n    "id": "...",\n    "name": "...",\n    "updatedFields": ["campusAddresses", "numberOfCampuses"]\n  }\n}`}
              />

              <EndpointDoc
                method="POST"
                path="/api/partner/institutions/:id/logo"
                description="Upload institution logo. Send as multipart/form-data with field name 'logo'. Accepted: JPEG, PNG, GIF, WebP. Max 5MB."
                permission="institutions:create"
              />

              <EndpointDoc
                method="GET"
                path="/api/partner/disciplines"
                description="List all valid disciplines and their sub-disciplines for course creation. Always call this first to get the exact discipline and subDiscipline strings required when creating a course."
                responseExample={`{ "disciplines": ["Computer Science & IT", "Engineering & Technology", ...], "hierarchy": { "Computer Science & IT": { "subDisciplines": [{ "name": "Software Engineering", "slug": "software-engineering" }] } } }`}
              />

              <div className="rounded-md border bg-muted/30 p-4 space-y-3">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Course Creation Workflow
                </p>
                <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
                  <li>Create or find the institution — note the returned <code className="bg-muted px-1 py-0.5 rounded text-xs text-foreground">id</code></li>
                  <li>Call <code className="bg-muted px-1 py-0.5 rounded text-xs text-foreground">GET /api/partner/disciplines</code> — pick the exact discipline &amp; subDiscipline strings</li>
                  <li>POST the course using the institution <code className="bg-muted px-1 py-0.5 rounded text-xs text-foreground">id</code> as <code className="bg-muted px-1 py-0.5 rounded text-xs text-foreground">universityId</code></li>
                </ol>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valid courseLevel values (must be exact)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'VCE (11-12)', 'Certificate I', 'Certificate II', 'Certificate III', 'Certificate IV',
                      'Diploma', 'Advanced Diploma', 'Associate Degree', 'Graduate Certificate', 'Graduate Diploma',
                      'Bachelor Degree', 'Bachelor Honours', 'Masters Degree', 'Doctoral Degree', 'Higher Doctoral Degree',
                      'ELICOS - General English', 'ELICOS - EAP', 'ELICOS - Exam Prep',
                      'Professional Year - Accounting', 'Professional Year - IT', 'Professional Year - Engineering',
                      'Foundation', 'Pathway Program', 'Short Course',
                    ].map(level => (
                      <code key={level} className="bg-muted px-1.5 py-0.5 rounded text-xs text-foreground">{level}</code>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valid discipline values (must be exact)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Accounting, Business & Finance', 'Agriculture & Forestry', 'Applied Sciences & Professions',
                      'Arts, Design & Architecture', 'Computer Science & IT', 'Education & Training',
                      'Engineering & Technology', 'Environmental Studies & Earth Sciences',
                      'Hospitality, Leisure & Sports', 'Humanities', 'Journalism & Media', 'Law',
                      'Medicine & Health', 'Short Courses', 'Trade',
                    ].map(disc => (
                      <code key={disc} className="bg-muted px-1.5 py-0.5 rounded text-xs text-foreground">{disc}</code>
                    ))}
                  </div>
                </div>
              </div>

              <EndpointDoc
                method="POST"
                path="/api/partner/courses"
                description="Create a new course linked to an institution. Saved as draft pending admin approval. Returns 409 if a course with the same title already exists at the institution."
                permission="courses:create"
                bodyFields={[
                  { name: "universityId", required: true, description: "ID of the parent institution (from GET /api/partner/institutions)" },
                  { name: "title", required: true, description: "Course title (min 5 chars). Must be unique per institution." },
                  { name: "description", required: true, description: "Course overview (min 50 chars)" },
                  { name: "discipline", required: true, description: "Must be one of the 15 exact discipline strings — get from GET /api/partner/disciplines" },
                  { name: "courseLevel", required: true, description: "Must be one of the 23 exact courseLevel strings listed above" },
                  { name: "fees", required: true, description: "Annual tuition fee as a positive number (e.g. 32000)" },
                  { name: "durationMonths", required: true, description: "Course duration in months (e.g. 36). Use durationWeeks instead if sub-monthly precision is needed." },
                  { name: "englishRequirements", required: true, description: 'Minimum 10 chars. e.g. "IELTS 6.5 overall, no band below 6.0"' },
                  { name: "eligibilityRequirements", required: true, description: "Entry qualifications and academic requirements" },
                  { name: "intakes", required: true, description: 'Non-empty array of intake months: ["February", "July"]' },
                  { name: "deliveryMode", required: true, description: "Exactly one of: online, on-campus, hybrid, blended" },
                  { name: "careerOutcomes", required: true, description: 'Non-empty array of job titles: ["Software Engineer", "Data Scientist"]' },
                  { name: "subDiscipline", required: false, description: "Sub-discipline name from GET /api/partner/disciplines (e.g. Software Engineering)" },
                  { name: "subject", required: false, description: "Display subject name (defaults to title if omitted)" },
                  { name: "currency", required: false, description: "Fee currency code (default: AUD)" },
                  { name: "country", required: false, description: "Country override (defaults to institution's country)" },
                  { name: "location", required: false, description: "Campus or city text (e.g. Sydney CBD)" },
                  { name: "durationWeeks", required: false, description: "Duration in weeks — use instead of durationMonths for short courses" },
                  { name: "applicationDeadline", required: false, description: 'Text deadline: "31 October 2025"' },
                  { name: "prerequisites", required: false, description: "Academic prerequisites text" },
                  { name: "thumbnailUrl", required: false, description: "URL of the course thumbnail image" },
                  { name: "courseCode", required: false, description: "Internal course code (e.g. CS-301)" },
                  { name: "campusLocations", required: false, description: 'Array of campus name strings: ["Sydney Campus", "Online"]' },
                  { name: "internshipAvailable", required: false, description: "true or false" },
                  { name: "internshipDetails", required: false, description: "Text description of the internship component" },
                  { name: "studyAreas", required: false, description: 'Array of specific study topics: ["Machine Learning", "Databases"]' },
                  { name: "careerPath", required: false, description: "Text description of the career progression" },
                  { name: "scholarshipPercentageMin", required: false, description: "Minimum scholarship % available (0–100)" },
                  { name: "scholarshipPercentageMax", required: false, description: "Maximum scholarship % available (0–100)" },
                  { name: "applicationFees", required: false, description: "Application fee amount as a number" },
                  { name: "curriculumUrl", required: false, description: "URL to the curriculum or course outline page" },
                  { name: "minimumAge", required: false, description: "Minimum applicant age as a number" },
                  { name: "pathways", required: false, description: 'Articulation pathways array: ["Diploma to Bachelor", "Certificate IV to Diploma"]' },
                  { name: "prPathway", required: false, description: "true if this course qualifies for a PR/visa pathway" },
                  { name: "sourceUrl", required: false, description: "URL of the original course page on the institution website" },
                ]}
                responseExample={`{\n  "success": true,\n  "data": {\n    "id": "course-uuid",\n    "title": "Bachelor of Computer Science",\n    "discipline": "Computer Science & IT",\n    "courseLevel": "Bachelor Degree",\n    "publishStatus": "draft"\n  }\n}`}
              />

              <div className="rounded-md border bg-muted/30 p-4 space-y-2">
                <p className="text-sm font-semibold">Complete course creation example</p>
                <CodeBlock code={`POST /api/partner/courses\nContent-Type: application/json\nX-API-Key: your-api-key\n\n{\n  "universityId": "institution-id-from-create-step",\n  "title": "Bachelor of Computer Science",\n  "description": "A comprehensive 3-year program covering algorithms, systems, and software engineering with real-world project experience across all year levels.",\n  "discipline": "Computer Science & IT",\n  "subDiscipline": "Software Engineering",\n  "courseLevel": "Bachelor Degree",\n  "durationMonths": 36,\n  "fees": 32000,\n  "currency": "AUD",\n  "intakes": ["February", "July"],\n  "deliveryMode": "on-campus",\n  "englishRequirements": "IELTS 6.5 overall, no band below 6.0",\n  "eligibilityRequirements": "Australian Year 12 or equivalent with ATAR 70+. International students need equivalent qualifications.",\n  "careerOutcomes": ["Software Engineer", "Data Scientist", "Systems Analyst", "Web Developer"],\n  "campusLocations": ["Sydney Campus", "Melbourne Campus"],\n  "prPathway": true,\n  "internshipAvailable": true,\n  "internshipDetails": "12-week industry placement in semester 5",\n  "sourceUrl": "https://institution.edu.au/courses/bachelor-cs"\n}`} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Campus Address Format
              </CardTitle>
              <CardDescription>
                Structure for the campusAddresses field when creating or updating institutions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <CodeBlock code={`"campusAddresses": [\n  {\n    "name": "Sydney Campus",\n    "address": "123 George Street",\n    "city": "Sydney",\n    "state": "NSW",\n    "postcode": "2000",\n    "country": "Australia"\n  },\n  {\n    "name": "Melbourne Campus",\n    "address": "456 Collins Street",\n    "city": "Melbourne",\n    "state": "VIC",\n    "postcode": "3000",\n    "country": "Australia"\n  }\n]`} />
              <div className="text-sm space-y-1.5 text-muted-foreground">
                <p><strong className="text-foreground">name</strong> (optional) — Campus display name</p>
                <p><strong className="text-foreground">address</strong> (required) — Street address</p>
                <p><strong className="text-foreground">city</strong> (optional) — City name</p>
                <p><strong className="text-foreground">state</strong> (optional) — State or province</p>
                <p><strong className="text-foreground">postcode</strong> (optional) — Postal/zip code</p>
                <p><strong className="text-foreground">country</strong> (optional) — Country name</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Permissions
              </CardTitle>
              <CardDescription>
                Each API key has scoped permissions controlling what actions it can perform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Permission</TableHead>
                    <TableHead>Grants Access To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell><code className="bg-muted px-1.5 py-0.5 rounded text-xs">institutions:create</code></TableCell>
                    <TableCell className="text-sm">Create new institutions, upload logos</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code className="bg-muted px-1.5 py-0.5 rounded text-xs">institutions:update</code></TableCell>
                    <TableCell className="text-sm">Update existing institutions (campus addresses, details, etc.)</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code className="bg-muted px-1.5 py-0.5 rounded text-xs">institutions:read</code></TableCell>
                    <TableCell className="text-sm">List and view institution details</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code className="bg-muted px-1.5 py-0.5 rounded text-xs">courses:create</code></TableCell>
                    <TableCell className="text-sm">Create new courses</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code className="bg-muted px-1.5 py-0.5 rounded text-xs">courses:read</code></TableCell>
                    <TableCell className="text-sm">List and view course details</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Rate Limits &amp; Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Each API key has configurable rate limits (default: 100/min, 1000/hr).</p>
              <p>Newly created institutions and courses are saved as <Badge variant="secondary">draft</Badge> and require admin approval before they appear publicly.</p>
              <p>Duplicate detection is enforced: institution name+country and course title+institution must be unique.</p>
              <p>All API responses include descriptive error messages with field-level validation details when applicable.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative">
      <pre className="bg-muted p-3 pr-10 rounded-md text-xs overflow-x-auto font-mono whitespace-pre-wrap break-all">
        {code}
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1.5 right-1.5 h-7 w-7"
        onClick={handleCopy}
        data-testid="button-copy-code"
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      </Button>
    </div>
  );
}

interface EndpointDocProps {
  method: string;
  path: string;
  description: string;
  permission?: string;
  queryParams?: Array<{ name: string; description: string }>;
  bodyFields?: Array<{ name: string; required: boolean; description: string }>;
  responseExample?: string;
}

function EndpointDoc({ method, path, description, permission, queryParams, bodyFields, responseExample }: EndpointDocProps) {
  const methodColor = {
    GET: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    POST: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
    PATCH: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    DELETE: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  }[method] || 'bg-muted';

  return (
    <div className="border rounded-md p-4 space-y-3" data-testid={`endpoint-${method.toLowerCase()}-${path.replace(/[/:]/g, '-')}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`px-2 py-0.5 rounded text-xs font-bold ${methodColor}`}>{method}</span>
        <code className="text-sm font-mono font-medium">{path}</code>
        {permission && (
          <Badge variant="secondary" className="text-[10px] ml-auto">
            <Shield className="h-3 w-3 mr-1" />
            {permission}
          </Badge>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>

      {queryParams && queryParams.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Query Parameters</p>
          {queryParams.map(p => (
            <p key={p.name} className="text-xs ml-2">
              <code className="bg-muted px-1 py-0.5 rounded">{p.name}</code> — {p.description}
            </p>
          ))}
        </div>
      )}

      {bodyFields && bodyFields.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Request Body (JSON)</p>
          <div className="grid gap-0.5">
            {bodyFields.map(f => (
              <p key={f.name} className="text-xs ml-2">
                <code className="bg-muted px-1 py-0.5 rounded">{f.name}</code>
                {f.required && <span className="text-destructive ml-1">*</span>}
                {' '} — {f.description}
              </p>
            ))}
          </div>
        </div>
      )}

      {responseExample && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Response Example</p>
          <pre className="bg-muted p-2 rounded text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">{responseExample}</pre>
        </div>
      )}
    </div>
  );
}

function generateGuidelinesMarkdown(baseUrl: string): string {
  return `# ANZ Global Education — Partner API Guidelines

## Base URL
${baseUrl}

## Authentication
Include your API key in the X-API-Key header:
\`\`\`
X-API-Key: anz_live_YOUR_KEY_HERE
\`\`\`

---

## Endpoints

### 1. Health Check
\`GET /api/partner/health\`
No authentication required.

### 2. List Institutions
\`GET /api/partner/institutions?search=name&limit=50\`
Permission: institutions:read

### 3. Get Institution Details
\`GET /api/partner/institutions/:id\`
Permission: institutions:read

### 4. Create Institution
\`POST /api/partner/institutions\`
Permission: institutions:create
Content-Type: application/json

Required fields:
- name (string, min 2 chars)
- country (string)
- description (string, min 50 chars)
- smallDescription (string, min 30 chars)
- website (valid URL)
- contactEmail (valid email)
- contactPhone (string, min 8 chars)
- establishedYear (number, 1800-current year)
- tuitionFeesMin (number)
- tuitionFeesMax (number)
- intakePeriods (array of strings, e.g. ["February", "July"])
- deliveryModes (array of strings, e.g. ["On Campus", "Online"])
- internationalStudentSupport (boolean)

Optional fields:
- campusAddresses (array of campus objects)
- numberOfCampuses (number)
- providerType (University, Institution, Tafe, or School)
- logo (URL)
- tags (array of strings)
- facilities (array of strings)
- accreditationStatus (string)
- rankingBand (string)
- scholarshipPercentageMin (number 0-100)
- scholarshipPercentageMax (number 0-100)

### 5. Update Institution
\`PATCH /api/partner/institutions/:id\`
Permission: institutions:update
Content-Type: application/json

Send only the fields you want to update. All fields are optional.
Especially useful for adding campus addresses after initial creation.

Updatable fields: campusAddresses, numberOfCampuses, description, smallDescription, fullDescription, website, city, address, contactEmail, contactPhone, tuitionFeesMin, tuitionFeesMax, intakePeriods, deliveryModes, facilities, tags, accreditationStatus, rankingBand, internationalStudentSupport, scholarshipPercentageMin, scholarshipPercentageMax, logo, institutionGallery

### 6. Upload Institution Logo
\`POST /api/partner/institutions/:id/logo\`
Permission: institutions:create
Content-Type: multipart/form-data
Field name: "logo"
Accepted: JPEG, PNG, GIF, WebP. Max 5MB.

### 7. List Disciplines
\`GET /api/partner/disciplines\`
Returns all valid disciplines and sub-disciplines for course creation.

### 8. Course Creation Workflow

Always follow this sequence when adding a course:
1. Create or find the institution - note the returned id field
2. Call GET /api/partner/disciplines - pick exact discipline & subDiscipline strings
3. POST the course using the institution id as universityId

---

### Valid courseLevel values (must match exactly — case-sensitive)
VCE (11-12), Certificate I, Certificate II, Certificate III, Certificate IV,
Diploma, Advanced Diploma, Associate Degree, Graduate Certificate, Graduate Diploma,
Bachelor Degree, Bachelor Honours, Masters Degree, Doctoral Degree, Higher Doctoral Degree,
ELICOS - General English, ELICOS - EAP, ELICOS - Exam Prep,
Professional Year - Accounting, Professional Year - IT, Professional Year - Engineering,
Foundation, Pathway Program, Short Course

### Valid discipline values (must match exactly — case-sensitive)
Accounting, Business & Finance | Agriculture & Forestry | Applied Sciences & Professions |
Arts, Design & Architecture | Computer Science & IT | Education & Training |
Engineering & Technology | Environmental Studies & Earth Sciences |
Hospitality, Leisure & Sports | Humanities | Journalism & Media | Law |
Medicine & Health | Short Courses | Trade

---

### 9. Create Course
\`POST /api/partner/courses\`
Permission: courses:create
Content-Type: application/json

**Required fields:**
- universityId (institution ID from create/list step)
- title (string, min 5 chars — must be unique per institution)
- description (string, min 50 chars)
- discipline (must be one of the 15 exact discipline strings above)
- courseLevel (must be one of the 23 exact courseLevel strings above)
- fees (positive number — annual tuition)
- durationMonths (number, e.g. 36) — OR use durationWeeks for short courses
- englishRequirements (min 10 chars, e.g. "IELTS 6.5 overall, no band below 6.0")
- eligibilityRequirements (entry qualifications text)
- intakes (non-empty array, e.g. ["February", "July"])
- deliveryMode (exactly: online | on-campus | hybrid | blended)
- careerOutcomes (non-empty array of job titles)

**Optional — Basic fields:**
- subDiscipline (string — Tier 2 category, from GET /api/partner/disciplines)
- specialization (string — Tier 3 free-text, e.g. "Civil Engineering")
- subject (display subject name, defaults to title)
- courseCode (internal code, e.g. CS-301)
- startDate (text, e.g. "February 2026")
- currency (default: AUD)
- country (defaults to institution's country)
- location (campus or city text)
- durationWeeks (weeks, alternative to durationMonths)
- applicationDeadline (text, e.g. "31 October 2025")
- sourceUrl (URL of original course page)
- thumbnailUrl (URL)
- images (array of image URLs for course gallery)

**Optional — Classification:**
- qualificationFramework (default: AQF — one of: AQF | Non-AQF | RQF | NQF | EQF | NZQF | MQF | US | Canadian | Other)
- customLevel (free-text level, only used when qualificationFramework = "Other")
- availableMarkets (array — default: ["AU","BD"] — valid values: "AU", "BD")
- visibility (default: "public" — one of: public | private)

**Optional — Fees:**
- applicationFees (number — application processing fee)
- admissionFee (number — one-time enrolment/admission fee)
- materialsFee (number — course materials/resources fee)

**Optional — Compliance (Australian CRICOS):**
- cricosCode (string — CRICOS course code, e.g. "0101M")
- isCricosRegistered (boolean — whether this course is on the CRICOS register)

**Optional — Entry requirements:**
- prerequisites (academic prerequisites text)
- minimumAge (number — minimum age requirement)
- englishRequirementsStructured (object — structured English test requirements, see format below)

**Optional — Delivery:**
- campusLocations (array of campus name strings)
- internshipAvailable (boolean)
- internshipDetails (text description of internship)
- prPathway (boolean — qualifies for PR/visa pathway)

**Optional — Career & study:**
- studyAreas (array of topic strings)
- careerPath (career progression narrative)
- scholarshipPercentageMin (number 0–100)
- scholarshipPercentageMax (number 0–100)
- pathways (array of articulation pathway strings)
- curriculumUrl (URL to curriculum page)

Example request:
\`\`\`json
{
  "universityId": "institution-id-from-create-step",
  "title": "Bachelor of Computer Science",
  "description": "A comprehensive 3-year program covering algorithms, systems, and software engineering with real-world project experience across all year levels.",
  "discipline": "Computer Science & IT",
  "subDiscipline": "Software Development",
  "specialization": "Full-Stack Web Development",
  "courseLevel": "Bachelor Degree",
  "qualificationFramework": "AQF",
  "durationMonths": 36,
  "fees": 32000,
  "currency": "AUD",
  "startDate": "February 2026",
  "intakes": ["February", "July"],
  "deliveryMode": "on-campus",
  "englishRequirements": "IELTS 6.5 overall, no band below 6.0",
  "eligibilityRequirements": "Australian Year 12 or equivalent with ATAR 70+. International students need equivalent qualifications.",
  "careerOutcomes": ["Software Engineer", "Data Scientist", "Systems Analyst", "Web Developer"],
  "campusLocations": ["Sydney Campus", "Melbourne Campus"],
  "admissionFee": 500,
  "materialsFee": 200,
  "cricosCode": "0101M",
  "isCricosRegistered": true,
  "availableMarkets": ["AU", "BD"],
  "visibility": "public",
  "prPathway": true,
  "internshipAvailable": true,
  "internshipDetails": "12-week industry placement in semester 5",
  "images": ["https://institution.edu.au/images/cs-lab.jpg"],
  "sourceUrl": "https://institution.edu.au/courses/bachelor-cs"
}
\`\`\`

---

### 10. Update Course
\`PATCH /api/partner/courses/:id\`
Permission: courses:update
Content-Type: application/json

Update any field on an existing **draft or pending** course. Cannot update published/approved courses.

**Authorization:**
- Institution scope is enforced using the course's own institution (no need to include universityId in the body).
- If you include \`universityId\` in the body it will be validated against the course's institution (optional safety check).
- If this API key has an \`allowedInstitutions\` scope, the course must belong to one of those institutions.

**Optional:** Send only the fields you want to change. Unmentioned fields are not modified. All the same fields from Create Course are updatable. Use \`courseLevel\` (not \`level\`) when updating the course level. Adding \`currency\` alongside \`fees\` is supported.

Returns the updated course summary with a list of fields that were changed.

Example request (update fees, add CRICOS info):
\`\`\`json
{
  "universityId": "institution-id-the-course-belongs-to",
  "fees": 34500,
  "currency": "AUD",
  "cricosCode": "0202M",
  "isCricosRegistered": true,
  "startDate": "July 2026",
  "images": ["https://institution.edu.au/images/updated.jpg"]
}
\`\`\`

---

### englishRequirementsStructured Format
\`\`\`json
{
  "ielts": { "overall": 6.5, "reading": 6.0, "writing": 6.0, "speaking": 6.0, "listening": 6.0 },
  "toefl": { "overall": 79, "reading": 20, "writing": 21, "speaking": 20, "listening": 20 },
  "pte": { "overall": 58 },
  "duolingo": { "overall": 110 },
  "cambridge": { "overall": "C1" },
  "notes": "No individual band below 6.0 for IELTS. Academic version required."
}
\`\`\`
All sub-keys are optional — include only the tests the institution accepts.

---

## Campus Address Format
\`\`\`json
"campusAddresses": [
  {
    "name": "Sydney Campus",
    "address": "123 George Street",
    "city": "Sydney",
    "state": "NSW",
    "postcode": "2000",
    "country": "Australia"
  }
]
\`\`\`
- address is required, all other fields are optional

---

## Permissions
| Permission | Access |
|---|---|
| institutions:create | Create institutions, upload logos |
| institutions:update | Update existing institutions |
| institutions:read | List and view institutions |
| courses:create | Create new courses |
| courses:update | Update existing draft/pending courses |
| courses:read | List and view courses |

---

## Notes
- Rate limits: default 100 requests/min, 1000/hr per key
- New institutions/courses are saved as draft (pending admin approval)
- Duplicate detection: institution name+country and course title+institution must be unique
- All errors include field-level validation details
`;
}
