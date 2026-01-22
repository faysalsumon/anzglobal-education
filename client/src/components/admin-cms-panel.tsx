import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Star, Quote, Users, Settings, FileText, Eye, EyeOff, Upload, X, ImageIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Testimonial, Faq, PublicTeamMember, SiteSetting, ContentSnippet } from "@shared/schema";

type CmsTab = "testimonials" | "faqs" | "team" | "settings" | "snippets";

export function AdminCmsPanel() {
  const [activeTab, setActiveTab] = useState<CmsTab>("testimonials");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold" data-testid="text-cms-title">Website Content Management</h2>
        <p className="text-muted-foreground">Manage testimonials, FAQs, team members, and site settings</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CmsTab)} className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="testimonials" data-testid="tab-testimonials">
            <Quote className="h-4 w-4 mr-2 hidden sm:inline" />
            Testimonials
          </TabsTrigger>
          <TabsTrigger value="faqs" data-testid="tab-faqs">
            <FileText className="h-4 w-4 mr-2 hidden sm:inline" />
            FAQs
          </TabsTrigger>
          <TabsTrigger value="team" data-testid="tab-team">
            <Users className="h-4 w-4 mr-2 hidden sm:inline" />
            Team
          </TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">
            <Settings className="h-4 w-4 mr-2 hidden sm:inline" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="snippets" data-testid="tab-snippets">
            <FileText className="h-4 w-4 mr-2 hidden sm:inline" />
            Snippets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="testimonials" className="mt-6">
          <TestimonialsPanel />
        </TabsContent>
        <TabsContent value="faqs" className="mt-6">
          <FaqsPanel />
        </TabsContent>
        <TabsContent value="team" className="mt-6">
          <TeamPanel />
        </TabsContent>
        <TabsContent value="settings" className="mt-6">
          <SettingsPanel />
        </TabsContent>
        <TabsContent value="snippets" className="mt-6">
          <SnippetsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TestimonialsPanel() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    studentName: "",
    studentLocation: "",
    studentCountry: "",
    institution: "",
    course: "",
    imageUrl: "",
    rating: 5,
    status: "draft" as "draft" | "published",
    displayOrder: 0,
  });

  const { data: testimonials, isLoading } = useQuery<Testimonial[]>({
    queryKey: ["/api/admin/cms/testimonials"],
  });

  const handlePhotoUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('photo', file);
      
      const response = await apiRequest('POST', '/api/admin/cms/testimonials/upload-photo', formDataUpload);
      const data = await response.json();
      setFormData(prev => ({ ...prev, imageUrl: data.photoUrl }));
      toast({ title: "Photo uploaded", description: "Student photo has been uploaded successfully." });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message || "Failed to upload photo", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handlePhotoUpload(file);
    }
  };

  const handleRemovePhoto = () => {
    setFormData(prev => ({ ...prev, imageUrl: "" }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => apiRequest("POST", "/api/admin/cms/testimonials", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/testimonials"] });
      toast({ title: "Testimonial created", description: "The testimonial has been created successfully." });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create testimonial", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof formData }) => apiRequest("PATCH", `/api/admin/cms/testimonials/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/testimonials"] });
      toast({ title: "Testimonial updated", description: "The testimonial has been updated successfully." });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update testimonial", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/cms/testimonials/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/testimonials"] });
      toast({ title: "Testimonial deleted", description: "The testimonial has been deleted." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete testimonial", variant: "destructive" });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "draft" | "published" }) => 
      apiRequest("PATCH", `/api/admin/cms/testimonials/${id}`, { status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/testimonials"] });
      toast({ 
        title: variables.status === "published" ? "Published" : "Unpublished", 
        description: `Testimonial has been ${variables.status === "published" ? "published" : "set to draft"}.` 
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update status", variant: "destructive" });
    },
  });

  const handleToggleStatus = (testimonial: Testimonial) => {
    const newStatus = testimonial.status === "published" ? "draft" : "published";
    toggleStatusMutation.mutate({ id: testimonial.id, status: newStatus });
  };

  const handleOpenCreate = () => {
    setEditing(null);
    setFormData({ title: "", content: "", studentName: "", studentLocation: "", studentCountry: "", institution: "", course: "", imageUrl: "", rating: 5, status: "draft", displayOrder: testimonials?.length || 0 });
    setDialogOpen(true);
  };

  const handleOpenEdit = (testimonial: Testimonial) => {
    setEditing(testimonial);
    setFormData({
      title: testimonial.title,
      content: testimonial.content,
      studentName: testimonial.studentName,
      studentLocation: testimonial.studentLocation || "",
      studentCountry: testimonial.studentCountry || "",
      institution: testimonial.institution || "",
      course: testimonial.course || "",
      imageUrl: testimonial.imageUrl || "",
      rating: testimonial.rating || 5,
      status: testimonial.status as "draft" | "published",
      displayOrder: testimonial.displayOrder || 0,
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Testimonials</CardTitle>
          <CardDescription>Manage student testimonials displayed on the website</CardDescription>
        </div>
        <Button onClick={handleOpenCreate} data-testid="button-add-testimonial">
          <Plus className="h-4 w-4 mr-2" />
          Add Testimonial
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Photo</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Order</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {testimonials?.map((testimonial) => (
              <TableRow key={testimonial.id} data-testid={`row-testimonial-${testimonial.id}`}>
                <TableCell>
                  <Avatar className="h-8 w-8">
                    {testimonial.imageUrl ? (
                      <AvatarImage src={testimonial.imageUrl} alt={testimonial.studentName} />
                    ) : null}
                    <AvatarFallback className="text-xs">
                      {testimonial.studentName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??'}
                    </AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium">{testimonial.title}</TableCell>
                <TableCell>{testimonial.studentName}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {[...Array(testimonial.rating || 5)].map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleStatus(testimonial)}
                    disabled={toggleStatusMutation.isPending}
                    className="p-0 h-auto"
                    data-testid={`button-toggle-status-${testimonial.id}`}
                  >
                    <Badge variant={testimonial.status === "published" ? "default" : "secondary"} className="cursor-pointer">
                      {testimonial.status === "published" ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                      {testimonial.status}
                    </Badge>
                  </Button>
                </TableCell>
                <TableCell>{testimonial.displayOrder}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(testimonial)} data-testid={`button-edit-testimonial-${testimonial.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-delete-testimonial-${testimonial.id}`}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Testimonial</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this testimonial? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(testimonial.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(!testimonials || testimonials.length === 0) && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No testimonials yet. Add your first testimonial.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Testimonial" : "Add Testimonial"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update the testimonial details below." : "Add a new student testimonial."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g., Amazing Experience" required data-testid="input-testimonial-title" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea id="content" value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} placeholder="The testimonial content..." required rows={4} data-testid="input-testimonial-content" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="studentName">Student Name</Label>
                <Input id="studentName" value={formData.studentName} onChange={(e) => setFormData({ ...formData, studentName: e.target.value })} placeholder="John Doe" required data-testid="input-testimonial-student" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="studentLocation">Location</Label>
                <Input id="studentLocation" value={formData.studentLocation} onChange={(e) => setFormData({ ...formData, studentLocation: e.target.value })} placeholder="Melbourne, Australia" data-testid="input-testimonial-location" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="institution">Institution</Label>
                <Input id="institution" value={formData.institution} onChange={(e) => setFormData({ ...formData, institution: e.target.value })} placeholder="University name" data-testid="input-testimonial-institution" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course">Course</Label>
                <Input id="course" value={formData.course} onChange={(e) => setFormData({ ...formData, course: e.target.value })} placeholder="Course name" data-testid="input-testimonial-course" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rating">Rating (1-5)</Label>
                <Select value={String(formData.rating)} onValueChange={(v) => setFormData({ ...formData, rating: parseInt(v) })}>
                  <SelectTrigger data-testid="select-testimonial-rating">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} Star{n > 1 ? "s" : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as "draft" | "published" })}>
                  <SelectTrigger data-testid="select-testimonial-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Picture of Student (optional)</Label>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                className="hidden"
                data-testid="input-testimonial-photo-file"
              />
              {formData.imageUrl ? (
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={formData.imageUrl} alt="Student photo" />
                    <AvatarFallback>
                      <ImageIcon className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Change Photo
                    </Button>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={handleRemovePhoto}
                      disabled={isUploading}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div 
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-upload-testimonial-photo"
                >
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <p className="text-sm text-muted-foreground">Uploading...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm font-medium">Click to upload student photo</p>
                      <p className="text-xs text-muted-foreground">JPEG, PNG, GIF or WebP (max 5MB)</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-testimonial">
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : editing ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function FaqsPanel() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Faq | null>(null);
  const [formData, setFormData] = useState({
    question: "",
    answer: "",
    category: "general",
    status: "draft" as "draft" | "published",
    displayOrder: 0,
  });

  const { data: faqs, isLoading } = useQuery<Faq[]>({
    queryKey: ["/api/admin/cms/faqs"],
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => apiRequest("POST", "/api/admin/cms/faqs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/faqs"] });
      toast({ title: "FAQ created", description: "The FAQ has been created successfully." });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create FAQ", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof formData }) => apiRequest("PATCH", `/api/admin/cms/faqs/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/faqs"] });
      toast({ title: "FAQ updated", description: "The FAQ has been updated successfully." });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update FAQ", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/cms/faqs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/faqs"] });
      toast({ title: "FAQ deleted", description: "The FAQ has been deleted." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete FAQ", variant: "destructive" });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "draft" | "published" }) => 
      apiRequest("PATCH", `/api/admin/cms/faqs/${id}`, { status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/faqs"] });
      toast({ 
        title: variables.status === "published" ? "Published" : "Unpublished", 
        description: `FAQ has been ${variables.status === "published" ? "published" : "set to draft"}.` 
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update status", variant: "destructive" });
    },
  });

  const handleToggleStatus = (faq: Faq) => {
    const newStatus = faq.status === "published" ? "draft" : "published";
    toggleStatusMutation.mutate({ id: faq.id, status: newStatus });
  };

  const handleOpenCreate = () => {
    setEditing(null);
    setFormData({ question: "", answer: "", category: "general", status: "draft", displayOrder: faqs?.length || 0 });
    setDialogOpen(true);
  };

  const handleOpenEdit = (faq: Faq) => {
    setEditing(faq);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      category: faq.category || "general",
      status: faq.status as "draft" | "published",
      displayOrder: faq.displayOrder || 0,
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>FAQs</CardTitle>
          <CardDescription>Manage frequently asked questions</CardDescription>
        </div>
        <Button onClick={handleOpenCreate} data-testid="button-add-faq">
          <Plus className="h-4 w-4 mr-2" />
          Add FAQ
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Question</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Order</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {faqs?.map((faq) => (
              <TableRow key={faq.id} data-testid={`row-faq-${faq.id}`}>
                <TableCell className="font-medium max-w-xs truncate">{faq.question}</TableCell>
                <TableCell>
                  <Badge variant="outline">{faq.category || "general"}</Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleStatus(faq)}
                    disabled={toggleStatusMutation.isPending}
                    className="p-0 h-auto"
                    data-testid={`button-toggle-faq-status-${faq.id}`}
                  >
                    <Badge variant={faq.status === "published" ? "default" : "secondary"} className="cursor-pointer">
                      {faq.status === "published" ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                      {faq.status}
                    </Badge>
                  </Button>
                </TableCell>
                <TableCell>{faq.displayOrder}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(faq)} data-testid={`button-edit-faq-${faq.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-delete-faq-${faq.id}`}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete FAQ</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this FAQ? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(faq.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(!faqs || faqs.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No FAQs yet. Add your first FAQ.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit FAQ" : "Add FAQ"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update the FAQ details below." : "Add a new frequently asked question."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="question">Question</Label>
              <Textarea id="question" value={formData.question} onChange={(e) => setFormData({ ...formData, question: e.target.value })} placeholder="What is your question?" required rows={2} data-testid="input-faq-question" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="answer">Answer</Label>
              <Textarea id="answer" value={formData.answer} onChange={(e) => setFormData({ ...formData, answer: e.target.value })} placeholder="The answer to the question..." required rows={4} data-testid="input-faq-answer" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger data-testid="select-faq-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="admissions">Admissions</SelectItem>
                    <SelectItem value="visas">Visas</SelectItem>
                    <SelectItem value="courses">Courses</SelectItem>
                    <SelectItem value="fees">Fees & Payments</SelectItem>
                    <SelectItem value="accommodation">Accommodation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as "draft" | "published" })}>
                  <SelectTrigger data-testid="select-faq-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-faq">
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : editing ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function TeamPanel() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PublicTeamMember | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    bio: "",
    imageUrl: "",
    emailAddress: "",
    linkedinUrl: "",
    status: "draft" as "draft" | "published",
    displayOrder: 0,
  });

  const { data: members, isLoading } = useQuery<PublicTeamMember[]>({
    queryKey: ["/api/admin/cms/team-members"],
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => apiRequest("POST", "/api/admin/cms/team-members", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/team-members"] });
      toast({ title: "Team member added", description: "The team member has been added successfully." });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add team member", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof formData }) => apiRequest("PATCH", `/api/admin/cms/team-members/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/team-members"] });
      toast({ title: "Team member updated", description: "The team member has been updated successfully." });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update team member", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/cms/team-members/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/team-members"] });
      toast({ title: "Team member removed", description: "The team member has been removed." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to remove team member", variant: "destructive" });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "draft" | "published" }) => 
      apiRequest("PATCH", `/api/admin/cms/team-members/${id}`, { status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/team-members"] });
      toast({ 
        title: variables.status === "published" ? "Published" : "Unpublished", 
        description: `Team member has been ${variables.status === "published" ? "published" : "set to draft"}.` 
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update status", variant: "destructive" });
    },
  });

  const handleToggleStatus = (member: PublicTeamMember) => {
    const newStatus = member.status === "published" ? "draft" : "published";
    toggleStatusMutation.mutate({ id: member.id, status: newStatus });
  };

  const handleOpenCreate = () => {
    setEditing(null);
    setFormData({ name: "", role: "", bio: "", imageUrl: "", emailAddress: "", linkedinUrl: "", status: "draft", displayOrder: members?.length || 0 });
    setDialogOpen(true);
  };

  const handleOpenEdit = (member: PublicTeamMember) => {
    setEditing(member);
    setFormData({
      name: member.name,
      role: member.role,
      bio: member.bio || "",
      imageUrl: member.imageUrl || "",
      emailAddress: member.emailAddress || "",
      linkedinUrl: member.linkedinUrl || "",
      status: member.status as "draft" | "published",
      displayOrder: member.displayOrder || 0,
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>Manage public team profiles displayed on the website</CardDescription>
        </div>
        <Button onClick={handleOpenCreate} data-testid="button-add-team-member">
          <Plus className="h-4 w-4 mr-2" />
          Add Team Member
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Order</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members?.map((member) => (
              <TableRow key={member.id} data-testid={`row-team-member-${member.id}`}>
                <TableCell className="font-medium">{member.name}</TableCell>
                <TableCell>{member.role}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleStatus(member)}
                    disabled={toggleStatusMutation.isPending}
                    className="p-0 h-auto"
                    data-testid={`button-toggle-team-status-${member.id}`}
                  >
                    <Badge variant={member.status === "published" ? "default" : "secondary"} className="cursor-pointer">
                      {member.status === "published" ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                      {member.status}
                    </Badge>
                  </Button>
                </TableCell>
                <TableCell>{member.displayOrder}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(member)} data-testid={`button-edit-team-member-${member.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-delete-team-member-${member.id}`}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove this team member? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(member.id)}>Remove</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(!members || members.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No team members yet. Add your first team member.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Team Member" : "Add Team Member"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update the team member details below." : "Add a new public team member profile."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="John Doe" required data-testid="input-team-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input id="role" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} placeholder="Education Consultant" required data-testid="input-team-role" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} placeholder="A brief bio about this team member..." rows={3} data-testid="input-team-bio" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emailAddress">Email (optional)</Label>
                <Input id="emailAddress" type="email" value={formData.emailAddress} onChange={(e) => setFormData({ ...formData, emailAddress: e.target.value })} placeholder="john@anzglobal.edu" data-testid="input-team-email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as "draft" | "published" })}>
                  <SelectTrigger data-testid="select-team-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="imageUrl">Profile Image URL (optional)</Label>
              <Input id="imageUrl" value={formData.imageUrl} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} placeholder="https://..." data-testid="input-team-image" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedinUrl">LinkedIn URL (optional)</Label>
              <Input id="linkedinUrl" value={formData.linkedinUrl} onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })} placeholder="https://linkedin.com/in/..." data-testid="input-team-linkedin" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-team-member">
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : editing ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function SettingsPanel() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SiteSetting | null>(null);
  const [formData, setFormData] = useState({
    settingKey: "",
    settingValue: "",
    settingType: "string" as "string" | "number" | "boolean" | "json",
    label: "",
    category: "general",
    description: "",
  });

  const { data: settings, isLoading } = useQuery<SiteSetting[]>({
    queryKey: ["/api/admin/cms/site-settings"],
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => apiRequest("POST", "/api/admin/cms/site-settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/site-settings"] });
      toast({ title: "Setting created", description: "The site setting has been created successfully." });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create setting", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ key, data }: { key: string; data: typeof formData }) => apiRequest("PATCH", `/api/admin/cms/site-settings/${key}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/site-settings"] });
      toast({ title: "Setting updated", description: "The site setting has been updated successfully." });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update setting", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (key: string) => apiRequest("DELETE", `/api/admin/cms/site-settings/${key}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/site-settings"] });
      toast({ title: "Setting deleted", description: "The site setting has been deleted." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete setting", variant: "destructive" });
    },
  });

  const handleOpenCreate = () => {
    setEditing(null);
    setFormData({ settingKey: "", settingValue: "", settingType: "string", label: "", category: "general", description: "" });
    setDialogOpen(true);
  };

  const handleOpenEdit = (setting: SiteSetting) => {
    setEditing(setting);
    setFormData({
      settingKey: setting.settingKey,
      settingValue: setting.settingValue || "",
      settingType: setting.settingType as "string" | "number" | "boolean" | "json",
      label: setting.label,
      category: setting.category || "general",
      description: setting.description || "",
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      updateMutation.mutate({ key: editing.settingKey, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Site Settings</CardTitle>
          <CardDescription>Manage configurable site settings and global variables</CardDescription>
        </div>
        <Button onClick={handleOpenCreate} data-testid="button-add-setting">
          <Plus className="h-4 w-4 mr-2" />
          Add Setting
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {settings?.map((setting) => (
              <TableRow key={setting.id} data-testid={`row-setting-${setting.settingKey}`}>
                <TableCell className="font-mono text-sm">{setting.settingKey}</TableCell>
                <TableCell className="max-w-xs truncate">{setting.settingValue}</TableCell>
                <TableCell>
                  <Badge variant="outline">{setting.settingType}</Badge>
                </TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground">{setting.description || "-"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(setting)} data-testid={`button-edit-setting-${setting.settingKey}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-delete-setting-${setting.settingKey}`}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Setting</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this setting? This may affect site functionality.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(setting.settingKey)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(!settings || settings.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No site settings yet. Add your first setting.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Setting" : "Add Setting"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update the site setting below." : "Add a new configurable site setting."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="settingKey">Setting Key</Label>
                <Input id="settingKey" value={formData.settingKey} onChange={(e) => setFormData({ ...formData, settingKey: e.target.value })} placeholder="site_name" required disabled={!!editing} data-testid="input-setting-key" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="label">Display Label</Label>
                <Input id="label" value={formData.label} onChange={(e) => setFormData({ ...formData, label: e.target.value })} placeholder="Site Name" required data-testid="input-setting-label" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger data-testid="select-setting-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="contact">Contact</SelectItem>
                    <SelectItem value="social">Social</SelectItem>
                    <SelectItem value="branding">Branding</SelectItem>
                    <SelectItem value="seo">SEO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="settingType">Type</Label>
                <Select value={formData.settingType} onValueChange={(v) => setFormData({ ...formData, settingType: v as any })}>
                  <SelectTrigger data-testid="select-setting-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="string">String</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="boolean">Boolean</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="settingValue">Value</Label>
              {formData.settingType === "boolean" ? (
                <Select value={formData.settingValue} onValueChange={(v) => setFormData({ ...formData, settingValue: v })}>
                  <SelectTrigger data-testid="input-setting-value">
                    <SelectValue placeholder="Select value" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">True</SelectItem>
                    <SelectItem value="false">False</SelectItem>
                  </SelectContent>
                </Select>
              ) : formData.settingType === "json" ? (
                <Textarea id="settingValue" value={formData.settingValue} onChange={(e) => setFormData({ ...formData, settingValue: e.target.value })} placeholder='{"key": "value"}' rows={4} className="font-mono text-sm" data-testid="input-setting-value" />
              ) : (
                <Input id="settingValue" type={formData.settingType === "number" ? "number" : "text"} value={formData.settingValue} onChange={(e) => setFormData({ ...formData, settingValue: e.target.value })} placeholder="Setting value" data-testid="input-setting-value" />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="What this setting controls..." rows={2} data-testid="input-setting-description" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-setting">
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : editing ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function SnippetsPanel() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ContentSnippet | null>(null);
  const [formData, setFormData] = useState({
    snippetKey: "",
    title: "",
    content: "",
    pageLocation: "",
    sectionName: "",
    status: "draft" as "draft" | "published",
  });

  const { data: snippets, isLoading } = useQuery<ContentSnippet[]>({
    queryKey: ["/api/admin/cms/content-snippets"],
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => apiRequest("POST", "/api/admin/cms/content-snippets", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/content-snippets"] });
      toast({ title: "Snippet created", description: "The content snippet has been created successfully." });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create snippet", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof formData }) => apiRequest("PATCH", `/api/admin/cms/content-snippets/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/content-snippets"] });
      toast({ title: "Snippet updated", description: "The content snippet has been updated successfully." });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update snippet", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/cms/content-snippets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/content-snippets"] });
      toast({ title: "Snippet deleted", description: "The content snippet has been deleted." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete snippet", variant: "destructive" });
    },
  });

  const handleOpenCreate = () => {
    setEditing(null);
    setFormData({ snippetKey: "", title: "", content: "", pageLocation: "", sectionName: "", status: "draft" });
    setDialogOpen(true);
  };

  const handleOpenEdit = (snippet: ContentSnippet) => {
    setEditing(snippet);
    setFormData({
      snippetKey: snippet.snippetKey,
      title: snippet.title,
      content: snippet.content,
      pageLocation: snippet.pageLocation || "",
      sectionName: snippet.sectionName || "",
      status: snippet.status as "draft" | "published",
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Content Snippets</CardTitle>
          <CardDescription>Manage reusable content blocks for the website</CardDescription>
        </div>
        <Button onClick={handleOpenCreate} data-testid="button-add-snippet">
          <Plus className="h-4 w-4 mr-2" />
          Add Snippet
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Page</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {snippets?.map((snippet) => (
              <TableRow key={snippet.id} data-testid={`row-snippet-${snippet.id}`}>
                <TableCell className="font-mono text-sm">{snippet.snippetKey}</TableCell>
                <TableCell className="font-medium">{snippet.title}</TableCell>
                <TableCell className="text-muted-foreground">{snippet.pageLocation || "-"}</TableCell>
                <TableCell className="text-muted-foreground">{snippet.sectionName || "-"}</TableCell>
                <TableCell>
                  <Badge variant={snippet.status === "published" ? "default" : "secondary"}>
                    {snippet.status === "published" ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                    {snippet.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(snippet)} data-testid={`button-edit-snippet-${snippet.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-delete-snippet-${snippet.id}`}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Snippet</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this content snippet? This may affect pages using this snippet.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(snippet.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(!snippets || snippets.length === 0) && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No content snippets yet. Add your first snippet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Snippet" : "Add Snippet"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update the content snippet below." : "Add a new reusable content snippet."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="snippetKey">Snippet Key</Label>
                <Input id="snippetKey" value={formData.snippetKey} onChange={(e) => setFormData({ ...formData, snippetKey: e.target.value })} placeholder="hero_tagline" required data-testid="input-snippet-key" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Hero Tagline" required data-testid="input-snippet-title" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pageLocation">Page Location</Label>
                <Select value={formData.pageLocation || "none"} onValueChange={(v) => setFormData({ ...formData, pageLocation: v === "none" ? "" : v })}>
                  <SelectTrigger data-testid="select-snippet-page">
                    <SelectValue placeholder="Select page" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="landing">Landing</SelectItem>
                    <SelectItem value="about">About</SelectItem>
                    <SelectItem value="study-australia">Study Australia</SelectItem>
                    <SelectItem value="contact">Contact</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as "draft" | "published" })}>
                  <SelectTrigger data-testid="select-snippet-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sectionName">Section Name (optional)</Label>
              <Input id="sectionName" value={formData.sectionName} onChange={(e) => setFormData({ ...formData, sectionName: e.target.value })} placeholder="hero, features, cta" data-testid="input-snippet-section" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content (supports Markdown)</Label>
              <Textarea id="content" value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} placeholder="The snippet content..." required rows={6} data-testid="input-snippet-content" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-snippet">
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : editing ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
