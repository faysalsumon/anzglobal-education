import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface CampusManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  institution: {
    id: string;
    name: string;
  } | null;
}

interface Campus {
  id: string;
  name: string;
  street?: string;
  city: string;
  state?: string;
  postcode?: string;
  country: string;
}

export function CampusManagementDialog({
  open,
  onOpenChange,
  institution,
}: CampusManagementDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postcode, setPostcode] = useState("");

  // Reset form inputs when institution changes to prevent stale data
  useEffect(() => {
    setName("");
    setStreet("");
    setCity("");
    setState("");
    setPostcode("");
  }, [institution?.id]);

  // Fetch campuses for this institution
  const { data: campuses, isLoading } = useQuery<Campus[]>({
    queryKey: ["/api/institutions", institution?.id, "campuses"],
    enabled: !!institution?.id,
  });

  // Create campus mutation
  const createCampusMutation = useMutation({
    mutationFn: async (campusData: any) => {
      return await apiRequest("POST", `/api/institutions/${institution?.id}/campuses`, campusData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/institutions", institution?.id, "campuses"] });
      // Reset form
      setName("");
      setStreet("");
      setCity("");
      setState("");
      setPostcode("");
      toast({
        title: "Campus added",
        description: "Campus has been added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add campus",
        variant: "destructive",
      });
    },
  });

  // Delete campus mutation
  const deleteCampusMutation = useMutation({
    mutationFn: async (campusId: string) => {
      return await apiRequest("DELETE", `/api/campuses/${campusId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/institutions", institution?.id, "campuses"] });
      toast({
        title: "Campus deleted",
        description: "Campus has been deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete campus",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Guard: Ensure institution exists before making API call
    if (!institution?.id) {
      toast({
        title: "Error",
        description: "No institution selected. Please close and reopen the dialog.",
        variant: "destructive",
      });
      return;
    }
    
    if (!name || !city) {
      toast({
        title: "Validation Error",
        description: "Campus name and city are required",
        variant: "destructive",
      });
      return;
    }
    
    createCampusMutation.mutate({
      name,
      street: street || null,
      city,
      state: state || null,
      postcode: postcode || null,
      country: "Australia",
    });
  };

  const handleDeleteCampus = (campusId: string) => {
    // Guard: Ensure institution exists before making API call
    if (!institution?.id) {
      toast({
        title: "Error",
        description: "No institution selected. Cannot delete campus.",
        variant: "destructive",
      });
      return;
    }
    
    deleteCampusMutation.mutate(campusId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Manage Campuses - {institution?.name}
          </DialogTitle>
          <DialogDescription>
            Add and manage campus locations for this institution
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Add New Campus Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add New Campus</CardTitle>
              <CardDescription>Create a new campus location</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="campus-name">Campus Name *</Label>
                    <Input
                      id="campus-name"
                      placeholder="e.g., Melbourne Campus"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      data-testid="input-campus-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="campus-street">Street Address</Label>
                    <Input
                      id="campus-street"
                      placeholder="e.g., 123 Main St"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      data-testid="input-campus-street"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="campus-city">City *</Label>
                    <Input
                      id="campus-city"
                      placeholder="e.g., Melbourne"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      data-testid="input-campus-city"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="campus-state">State</Label>
                    <Input
                      id="campus-state"
                      placeholder="e.g., VIC"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      data-testid="input-campus-state"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="campus-postcode">Postcode</Label>
                    <Input
                      id="campus-postcode"
                      placeholder="e.g., 3000"
                      value={postcode}
                      onChange={(e) => setPostcode(e.target.value)}
                      data-testid="input-campus-postcode"
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  disabled={createCampusMutation.isPending}
                  data-testid="button-add-campus"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {createCampusMutation.isPending ? "Adding..." : "Add Campus"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Existing Campuses List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Existing Campuses</CardTitle>
              <CardDescription>
                {campuses?.length || 0} campus{campuses?.length !== 1 ? "es" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading campuses...</p>
              ) : campuses && campuses.length > 0 ? (
                <div className="overflow-x-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead>Postcode</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campuses.map((campus) => (
                        <TableRow key={campus.id}>
                          <TableCell className="font-medium">{campus.name}</TableCell>
                          <TableCell>{campus.street || "-"}</TableCell>
                          <TableCell>{campus.city}</TableCell>
                          <TableCell>{campus.state || "-"}</TableCell>
                          <TableCell>{campus.postcode || "-"}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCampus(campus.id)}
                              disabled={deleteCampusMutation.isPending}
                              data-testid={`button-delete-campus-${campus.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No campuses added yet. Add your first campus above.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
