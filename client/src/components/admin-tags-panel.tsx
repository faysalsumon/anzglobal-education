import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Search, Tag, Sparkles, RefreshCw } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";

interface TagType {
  id: string;
  name: string;
  slug: string;
  category: 'feature' | 'delivery' | 'career' | 'skill' | 'industry' | 'audience';
  description: string | null;
  color: string | null;
  displayOrder: number;
  isActive: boolean;
  courseCount?: number;
  createdAt: string | null;
  updatedAt: string | null;
}

const TAG_CATEGORIES = [
  { value: 'feature', label: 'Features', description: 'Course features like scholarships, work placement' },
  { value: 'delivery', label: 'Delivery', description: 'How the course is delivered' },
  { value: 'career', label: 'Career', description: 'Career outcomes and pathways' },
  { value: 'skill', label: 'Skills', description: 'Skills and learning approaches' },
  { value: 'industry', label: 'Industry', description: 'Industry sectors' },
  { value: 'audience', label: 'Audience', description: 'Target student audiences' },
] as const;

const PRESET_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#22C55E', '#10B981',
  '#14B8A6', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7',
  '#EC4899', '#F43F5E',
];

const tagFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z.string().optional(),
  category: z.enum(['feature', 'delivery', 'career', 'skill', 'industry', 'audience']),
  description: z.string().optional(),
  color: z.string().optional(),
  displayOrder: z.coerce.number().optional(),
  isActive: z.boolean().default(true),
});

type TagFormValues = z.infer<typeof tagFormSchema>;

interface AdminTagsPanelProps {
  isCTO?: boolean;
}

export function AdminTagsPanel({ isCTO = false }: AdminTagsPanelProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagType | null>(null);
  const [deleteTagId, setDeleteTagId] = useState<string | null>(null);

  const form = useForm<TagFormValues>({
    resolver: zodResolver(tagFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      category: "feature",
      description: "",
      color: "#3B82F6",
      displayOrder: 0,
      isActive: true,
    },
  });

  const { data: tags = [], isLoading } = useQuery<TagType[]>({
    queryKey: ["/api/admin/tags", { includeInactive: true }],
    queryFn: async () => {
      const res = await fetch("/api/admin/tags?includeInactive=true", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch tags");
      return res.json();
    },
  });

  const createTagMutation = useMutation({
    mutationFn: async (data: TagFormValues) => {
      return apiRequest("POST", "/api/admin/tags", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tags"] });
      toast({ title: "Tag created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateTagMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TagFormValues> }) => {
      return apiRequest("PATCH", `/api/admin/tags/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tags"] });
      toast({ title: "Tag updated successfully" });
      setIsDialogOpen(false);
      setEditingTag(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/tags/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tags"] });
      toast({ title: "Tag deleted successfully" });
      setDeleteTagId(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const seedTagsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/tags/seed");
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tags"] });
      toast({ title: "Tags seeded successfully", description: data.message });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleCreateNew = () => {
    setEditingTag(null);
    form.reset({
      name: "",
      slug: "",
      category: "feature",
      description: "",
      color: "#3B82F6",
      displayOrder: 0,
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (tag: TagType) => {
    setEditingTag(tag);
    form.reset({
      name: tag.name,
      slug: tag.slug,
      category: tag.category,
      description: tag.description || "",
      color: tag.color || "#3B82F6",
      displayOrder: tag.displayOrder,
      isActive: tag.isActive,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: TagFormValues) => {
    if (editingTag) {
      updateTagMutation.mutate({ id: editingTag.id, data });
    } else {
      createTagMutation.mutate(data);
    }
  };

  const filteredTags = tags.filter((tag) => {
    const matchesSearch = tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tag.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || tag.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const groupedTags = TAG_CATEGORIES.map(cat => ({
    ...cat,
    tags: filteredTags.filter(tag => tag.category === cat.value),
  }));

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      feature: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      delivery: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      career: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      skill: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      industry: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
      audience: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Tag className="h-6 w-6" />
            Course Tags
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage e-commerce style tags for course categorization and filtering
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isCTO && tags.length === 0 && (
            <Button
              variant="outline"
              onClick={() => seedTagsMutation.mutate()}
              disabled={seedTagsMutation.isPending}
              data-testid="button-seed-tags"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Seed Tags
            </Button>
          )}
          <Button onClick={handleCreateNew} data-testid="button-create-tag">
            <Plus className="h-4 w-4 mr-2" />
            Add Tag
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-tags"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-category-filter">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {TAG_CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : categoryFilter === "all" ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {groupedTags.map((group) => (
            <Card key={group.value}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  {group.label}
                  <Badge variant="secondary">{group.tags.length}</Badge>
                </CardTitle>
                <CardDescription className="text-sm">{group.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {group.tags.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No tags in this category</p>
                  ) : (
                    group.tags.map((tag) => (
                      <Tooltip key={tag.id}>
                        <TooltipTrigger asChild>
                          <Badge
                            style={{ backgroundColor: tag.color || undefined }}
                            className={`cursor-pointer transition-transform hover:scale-105 ${!tag.isActive ? 'opacity-50' : ''}`}
                            onClick={() => handleEdit(tag)}
                            data-testid={`badge-tag-${tag.slug}`}
                          >
                            {tag.name}
                            {tag.courseCount !== undefined && tag.courseCount > 0 && (
                              <span className="ml-1 opacity-75">({tag.courseCount})</span>
                            )}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Click to edit</p>
                          {tag.description && <p className="text-xs opacity-75">{tag.description}</p>}
                        </TooltipContent>
                      </Tooltip>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tag</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Courses</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTags.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No tags found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTags.map((tag) => (
                    <TableRow key={tag.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: tag.color || '#3B82F6' }}
                          />
                          <span className="font-medium">{tag.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-sm">
                        {tag.slug}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm">
                        {tag.description || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{tag.courseCount || 0}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {tag.isActive ? (
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        ) : (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(tag)}
                            data-testid={`button-edit-tag-${tag.slug}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {isCTO && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteTagId(tag.id)}
                              data-testid={`button-delete-tag-${tag.slug}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTag ? "Edit Tag" : "Create New Tag"}</DialogTitle>
            <DialogDescription>
              {editingTag ? "Update the tag details below" : "Add a new tag for course categorization"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Scholarship Available" {...field} data-testid="input-tag-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-tag-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TAG_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Brief description" {...field} data-testid="input-tag-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`w-6 h-6 rounded-full transition-transform ${
                            field.value === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => field.onChange(color)}
                          data-testid={`button-color-${color.replace('#', '')}`}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <FormDescription className="text-xs">
                        Inactive tags won't appear in course filtering
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-tag-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createTagMutation.isPending || updateTagMutation.isPending}
                  data-testid="button-save-tag"
                >
                  {editingTag ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTagId} onOpenChange={() => setDeleteTagId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tag</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this tag? This will remove it from all associated courses.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTagId && deleteTagMutation.mutate(deleteTagId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-tag"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
