/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Clock, FileText } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface ActivityLog {
  id: string;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  userProfilePicture: string | null;
  userType: string | null;
  entityType: string;
  entityId: string;
  entityName: string | null;
  action: string;
  actionDescription: string | null;
  changes: Record<string, { before: any; after: any }> | null;
  metadata: Record<string, any> | null;
  createdAt: string;
}

interface ActivityFeedProps {
  entityType?: string;
  entityId?: string;
  apiEndpoint?: string;
  title?: string;
  showFilters?: boolean;
  limit?: number;
}

const ACTION_COLORS: Record<string, string> = {
  created: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  updated: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  deleted: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  rejected: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  activated: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  deactivated: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  assigned: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  status_changed: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  imported: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  login: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  logout: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200",
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  user: "User",
  institution: "Institution",
  course: "Course",
  application: "Application",
  student_lead: "Lead",
  inquiry_lead: "Inquiry",
  blog: "Blog",
  document: "Document",
  scraped_course: "Scraped Course",
  import_batch: "Import Batch",
  team_member: "Team Member",
  notification: "Notification",
};

export function ActivityFeed({
  entityType,
  entityId,
  apiEndpoint,
  title = "Activity Feed",
  showFilters = true,
  limit = 50,
}: ActivityFeedProps) {
  const [filterEntityType, setFilterEntityType] = useState<string>("all");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [offset, setOffset] = useState(0);

  // Determine the endpoint based on props
  const getEndpoint = () => {
    if (apiEndpoint) return apiEndpoint;
    if (entityType && entityId) {
      return `/api/admin/activity-logs/entity/${entityType}/${entityId}`;
    }
    return "/api/admin/activity-logs";
  };

  // Build query parameters
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    params.append("limit", limit.toString());
    params.append("offset", offset.toString());
    
    if (filterEntityType !== "all") {
      params.append("entityType", filterEntityType);
    }
    
    if (filterAction !== "all") {
      params.append("action", filterAction);
    }
    
    return params.toString();
  };

  const { data, isLoading, error } = useQuery<{
    logs: ActivityLog[];
    pagination?: { total: number; limit: number; offset: number; hasMore: boolean };
  }>({
    queryKey: [getEndpoint(), filterEntityType, filterAction, offset, limit],
    queryFn: async () => {
      const headers: Record<string, string> = {};
      
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }
      }
      
      const response = await fetch(`${getEndpoint()}?${buildQueryParams()}`, {
        headers,
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch activity logs");
      return response.json();
    },
  });

  const getUserInitials = (name: string | null, email: string | null) => {
    if (name) {
      const parts = name.split(" ");
      return parts.length > 1
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : name.substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return "??";
  };

  const getUserDisplayName = (log: ActivityLog) => {
    return log.userName || log.userEmail || "System";
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return "Unknown time";
    }
  };

  const getActionBadgeClass = (action: string) => {
    return ACTION_COLORS[action] || "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  };

  return (
    <Card data-testid="card-activity-feed">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {title}
          </CardTitle>
          
          {showFilters && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select value={filterEntityType} onValueChange={setFilterEntityType}>
                <SelectTrigger className="w-[150px]" data-testid="select-entity-type-filter">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="user">Users</SelectItem>
                  <SelectItem value="institution">Institutions</SelectItem>
                  <SelectItem value="course">Courses</SelectItem>
                  <SelectItem value="application">Applications</SelectItem>
                  <SelectItem value="student_lead">Leads</SelectItem>
                  <SelectItem value="blog">Blogs</SelectItem>
                  <SelectItem value="document">Documents</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="w-[150px]" data-testid="select-action-filter">
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="created">Created</SelectItem>
                  <SelectItem value="updated">Updated</SelectItem>
                  <SelectItem value="deleted">Deleted</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="activated">Activated</SelectItem>
                  <SelectItem value="deactivated">Deactivated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="text-center py-8 text-muted-foreground">
            <p>Failed to load activity logs. Please try again.</p>
          </div>
        )}

        {!isLoading && !error && data && (
          <>
            {data.logs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No activity logs found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover-elevate border"
                    data-testid={`activity-log-${log.id}`}
                  >
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      {log.userProfilePicture && (
                        <AvatarImage src={log.userProfilePicture} alt={getUserDisplayName(log)} />
                      )}
                      <AvatarFallback>
                        {getUserInitials(log.userName, log.userEmail)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-tight">
                            {getUserDisplayName(log)}
                            {log.userType && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                {log.userType}
                              </Badge>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {log.actionDescription || `${log.action} ${log.entityType}`}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className={`text-xs ${getActionBadgeClass(log.action)}`}>
                            {log.action}
                          </Badge>
                        </div>
                      </div>

                      {log.changes && Object.keys(log.changes).length > 0 && (
                        <div className="mt-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded border">
                          <div className="font-medium mb-1">Changes:</div>
                          <div className="space-y-1">
                            {Object.entries(log.changes).slice(0, 3).map(([field, change]) => (
                              <div key={field}>
                                <span className="font-medium">{field}:</span>{" "}
                                <span className="line-through opacity-60">
                                  {String(change.before || "empty")}
                                </span>{" "}
                                →{" "}
                                <span className="text-foreground font-medium">
                                  {String(change.after)}
                                </span>
                              </div>
                            ))}
                            {Object.keys(log.changes).length > 3 && (
                              <div className="text-xs opacity-60">
                                +{Object.keys(log.changes).length - 3} more fields
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{formatTimestamp(log.createdAt)}</span>
                        {log.entityName && (
                          <>
                            <span>•</span>
                            <span className="truncate">{ENTITY_TYPE_LABELS[log.entityType] || log.entityType}: {log.entityName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {data.pagination && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t">
                <p className="text-sm text-muted-foreground">
                  Showing {offset + 1} to {Math.min(offset + limit, data.pagination.total)} of{" "}
                  {data.pagination.total} activities
                </p>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                    disabled={offset === 0}
                    data-testid="button-previous-page"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOffset(offset + limit)}
                    disabled={!data.pagination.hasMore}
                    data-testid="button-next-page"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
