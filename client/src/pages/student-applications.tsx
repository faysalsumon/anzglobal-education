import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileText, Calendar, Building2, AlertCircle, RefreshCw } from "lucide-react";
import type { Application } from "@shared/schema";

export default function StudentApplications() {
  const { data: applications, isLoading, isError, error, refetch } = useQuery<Application[]>({
    queryKey: ["/api/student/applications"],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">My Applications</h1>
        <p className="text-muted-foreground">Track the status of your course applications</p>
      </div>

      {isError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Applications</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <p>{error instanceof Error ? error.message : "Failed to load applications. Please try again."}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="w-fit" data-testid="button-retry">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : isLoading ? (
        <div className="grid gap-6">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/3"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !applications || applications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
            <p className="text-lg font-medium mb-2">No applications yet</p>
            <p className="text-sm text-muted-foreground mb-6">
              Browse courses and submit your first application
            </p>
            <Button asChild data-testid="button-browse-courses">
              <a href="/student/courses">Browse Courses</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {applications.map((application) => (
            <Card key={application.id} data-testid={`application-card-${application.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Application #{application.id.slice(0, 8)}
                    </CardTitle>
                    <CardDescription>
                      Course ID: {application.courseId.slice(0, 8)}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={
                      application.status === "accepted"
                        ? "default"
                        : application.status === "rejected"
                        ? "destructive"
                        : "secondary"
                    }
                    data-testid={`status-badge-${application.id}`}
                  >
                    {application.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {application.personalStatement && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Personal Statement</h4>
                    <p className="text-sm text-muted-foreground">{application.personalStatement}</p>
                  </div>
                )}
                {application.additionalInfo && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Additional Information</h4>
                    <p className="text-sm text-muted-foreground">{application.additionalInfo}</p>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Submitted {new Date(application.createdAt!).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
