import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Plus, Eye, Edit, Trash2, FileText, Calendar, User, Sparkles } from "lucide-react";
import type { Blog } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBlogSchema } from "@shared/schema";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Extend the schema for the form to handle editing
const blogFormSchema = insertBlogSchema.extend({
  id: z.string().optional(),
});

type BlogFormValues = z.infer<typeof blogFormSchema>;

export function AdminBlogManagement() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedBlog, setSelectedBlog] = useState<Blog | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch all blogs
  const { data: blogsData, isLoading } = useQuery<{ blogs: Blog[]; total: number }>({
    queryKey: ["/api/admin/blogs", statusFilter],
    queryFn: async () => {
      const url = statusFilter !== "all" ? `/api/admin/blogs?status=${statusFilter}` : "/api/admin/blogs";
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch blogs");
      return response.json();
    },
  });

  const blogs = blogsData?.blogs || [];

  const form = useForm<BlogFormValues>({
    resolver: zodResolver(blogFormSchema),
    defaultValues: {
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      category: "",
      tags: [],
      featuredImageUrl: "",
      metaTitle: "",
      metaDescription: "",
      ogImageUrl: "",
      status: "draft",
    },
  });

  // Create or update blog mutation
  const saveBlogMutation = useMutation({
    mutationFn: async (data: BlogFormValues) => {
      if (selectedBlog) {
        // Update existing blog
        return await apiRequest(`/api/admin/blogs/${selectedBlog.id}`, "PATCH", data);
      } else {
        // Create new blog
        return await apiRequest("/api/admin/blogs", "POST", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blogs"] });
      toast({
        title: selectedBlog ? "Blog updated" : "Blog created",
        description: selectedBlog ? "Blog post has been updated successfully" : "New blog post has been created",
      });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save blog",
      });
    },
  });

  // Publish/Unpublish mutation
  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "publish" | "unpublish" }) => {
      return await apiRequest(`/api/admin/blogs/${id}/${action}`, "POST", {});
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blogs"] });
      toast({
        title: variables.action === "publish" ? "Blog published" : "Blog unpublished",
        description: variables.action === "publish" ? "Blog post is now live" : "Blog post has been moved to drafts",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update blog status",
      });
    },
  });

  // Delete mutation
  const deleteBlogMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/blogs/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete blog");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blogs"] });
      toast({
        title: "Blog deleted",
        description: "Blog post has been deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete blog",
      });
    },
  });

  const handleOpenDialog = (blog?: Blog) => {
    if (blog) {
      setSelectedBlog(blog);
      form.reset({
        title: blog.title,
        slug: blog.slug,
        excerpt: blog.excerpt || "",
        content: blog.content,
        category: blog.category || "",
        tags: blog.tags || [],
        featuredImageUrl: blog.featuredImageUrl || "",
        metaTitle: blog.metaTitle || "",
        metaDescription: blog.metaDescription || "",
        ogImageUrl: blog.ogImageUrl || "",
        status: blog.status,
      });
    } else {
      setSelectedBlog(null);
      form.reset({
        title: "",
        slug: "",
        excerpt: "",
        content: "",
        category: "",
        tags: [],
        featuredImageUrl: "",
        metaTitle: "",
        metaDescription: "",
        ogImageUrl: "",
        status: "draft",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedBlog(null);
    form.reset();
  };

  const handleSubmit = (data: BlogFormValues) => {
    saveBlogMutation.mutate(data);
  };

  const handleTogglePublish = (blog: Blog) => {
    const action = blog.status === "published" ? "unpublish" : "publish";
    togglePublishMutation.mutate({ id: blog.id, action });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this blog post?")) {
      deleteBlogMutation.mutate(id);
    }
  };

  // Seed sample blogs mutation
  const seedBlogsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/admin/blogs/seed", "POST", {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blogs"] });
      toast({
        title: "Sample blogs seeded",
        description: `Created ${data.created} blogs, skipped ${data.skipped} (already exist)`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to seed blogs",
      });
    },
  });

  // Generate slug from title
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  return (
    <div className="space-y-6" data-testid="admin-blog-management">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Blog Management</h2>
          <p className="text-muted-foreground">
            Create and manage blog posts for your platform
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => seedBlogsMutation.mutate()} 
            disabled={seedBlogsMutation.isPending}
            data-testid="button-seed-blogs"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {seedBlogsMutation.isPending ? "Seeding..." : "Seed Sample Blogs"}
          </Button>
          <Button onClick={() => handleOpenDialog()} data-testid="button-create-blog">
            <Plus className="mr-2 h-4 w-4" />
            New Blog Post
          </Button>
        </div>
      </div>

      {/* Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="w-48">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Blogs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Blog Posts ({blogs.length})</CardTitle>
          <CardDescription>
            All blog posts in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading blogs...</div>
          ) : blogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No blog posts found. Create your first blog post!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Published Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blogs.map((blog) => (
                  <TableRow key={blog.id} data-testid={`blog-row-${blog.id}`}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{blog.title}</div>
                        <div className="text-sm text-muted-foreground">{blog.slug}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {blog.category && <Badge variant="secondary">{blog.category}</Badge>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={blog.status === "published" ? "default" : "outline"}>
                        {blog.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {blog.publishedAt
                        ? new Date(blog.publishedAt).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTogglePublish(blog)}
                          data-testid={`button-toggle-publish-${blog.id}`}
                        >
                          {blog.status === "published" ? "Unpublish" : "Publish"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(blog)}
                          data-testid={`button-edit-${blog.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(blog.id)}
                          data-testid={`button-delete-${blog.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedBlog ? "Edit Blog Post" : "Create New Blog Post"}</DialogTitle>
            <DialogDescription>
              {selectedBlog ? "Update the blog post details" : "Fill in the details to create a new blog post"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter blog title"
                        data-testid="input-blog-title"
                        onBlur={(e) => {
                          field.onBlur();
                          if (!selectedBlog && !form.getValues("slug")) {
                            form.setValue("slug", generateSlug(e.target.value));
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="blog-post-slug" data-testid="input-blog-slug" />
                    </FormControl>
                    <FormDescription>
                      URL-friendly version of the title (lowercase letters, numbers, and hyphens only)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="excerpt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Excerpt</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Brief summary of the blog post (max 300 characters)"
                        rows={3}
                        data-testid="textarea-blog-excerpt"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content * (Markdown)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Write your blog content in Markdown..."
                        rows={12}
                        data-testid="textarea-blog-content"
                      />
                    </FormControl>
                    <FormDescription>
                      Use Markdown syntax for formatting (headings, lists, links, etc.)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Education, News" data-testid="input-blog-category" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="featuredImageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Featured Image URL</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://..." data-testid="input-featured-image" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="metaTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SEO: Meta Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="SEO title (max 60 characters)" data-testid="input-meta-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="metaDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SEO: Meta Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="SEO description (max 160 characters)"
                        rows={2}
                        data-testid="textarea-meta-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveBlogMutation.isPending} data-testid="button-save-blog">
                  {saveBlogMutation.isPending ? "Saving..." : selectedBlog ? "Update Blog" : "Create Blog"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
