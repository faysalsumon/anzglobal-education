import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Plus, Edit, Trash2, Sparkles, Newspaper, FileText, Radio, User } from "lucide-react";
import type { BlogWithAuthor } from "@shared/schema";
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

type StaffMember = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  role: string | null;
};

const blogFormSchema = insertBlogSchema.extend({
  id: z.string().optional(),
  authorId: z.string().optional(),
});

type BlogFormValues = z.infer<typeof blogFormSchema>;

const POST_TYPE_OPTIONS = [
  { value: "blog", label: "Blog", icon: FileText },
  { value: "news", label: "News", icon: Newspaper },
  { value: "update", label: "Update", icon: Radio },
] as const;

type PostType = "blog" | "news" | "update";

function PostTypeBadge({ type }: { type: string }) {
  const opt = POST_TYPE_OPTIONS.find((o) => o.value === type) ?? POST_TYPE_OPTIONS[0];
  const variantMap: Record<PostType, "default" | "secondary" | "outline"> = {
    blog: "default",
    news: "secondary",
    update: "outline",
  };
  return (
    <Badge variant={variantMap[type as PostType] ?? "outline"} className="capitalize">
      {opt.label}
    </Badge>
  );
}

function getStaffInitials(member: StaffMember): string {
  const first = member.firstName?.charAt(0) ?? "";
  const last = member.lastName?.charAt(0) ?? "";
  return (first + last).toUpperCase() || "?";
}

function getStaffDisplayName(member: StaffMember): string {
  return [member.firstName, member.lastName].filter(Boolean).join(" ") || "Unknown";
}

function AuthorCell({ authorName, authorAvatar }: { authorName?: string | null; authorAvatar?: string | null }) {
  if (!authorName) return <span className="text-muted-foreground text-sm">—</span>;
  const initials = authorName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-7 w-7 shrink-0">
        {authorAvatar && <AvatarImage src={authorAvatar} alt={authorName} />}
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <span className="text-sm font-medium truncate max-w-[120px]">{authorName}</span>
    </div>
  );
}

export function AdminBlogManagement() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedBlog, setSelectedBlog] = useState<BlogWithAuthor | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: blogsData, isLoading } = useQuery<{ blogs: BlogWithAuthor[]; total: number }>({
    queryKey: ["/api/admin/blogs", statusFilter !== "all" ? { status: statusFilter } : undefined],
  });

  const { data: staffList = [] } = useQuery<StaffMember[]>({
    queryKey: ["/api/admin/staff"],
  });

  const allBlogs = blogsData?.blogs || [];
  const filteredBlogs = typeFilter === "all" ? allBlogs : allBlogs.filter((b) => (b.postType || "blog") === typeFilter);

  const form = useForm<BlogFormValues>({
    resolver: zodResolver(blogFormSchema),
    defaultValues: {
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      category: "",
      postType: "blog",
      tags: [],
      featuredImageUrl: "",
      metaTitle: "",
      metaDescription: "",
      ogImageUrl: "",
      status: "draft",
      authorId: "",
    },
  });

  const saveBlogMutation = useMutation({
    mutationFn: async (data: BlogFormValues) => {
      if (selectedBlog) {
        return await apiRequest(`/api/admin/blogs/${selectedBlog.id}`, "PATCH", data);
      } else {
        return await apiRequest("/api/admin/blogs", "POST", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blogs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/blogs"] });
      toast({
        title: selectedBlog ? "Post updated" : "Post created",
        description: selectedBlog ? "Post has been updated successfully" : "New post has been created",
      });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save post",
      });
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "publish" | "unpublish" }) => {
      return await apiRequest(`/api/admin/blogs/${id}/${action}`, "POST", {});
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blogs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/blogs"] });
      toast({
        title: variables.action === "publish" ? "Post published" : "Post unpublished",
        description: variables.action === "publish" ? "Post is now live" : "Post has been moved to drafts",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update post status",
      });
    },
  });

  const deleteBlogMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/admin/blogs/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blogs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/blogs"] });
      toast({
        title: "Post deleted",
        description: "Post has been deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete post",
      });
    },
  });

  const handleOpenDialog = (blog?: BlogWithAuthor) => {
    if (blog) {
      setSelectedBlog(blog);
      form.reset({
        title: blog.title,
        slug: blog.slug,
        excerpt: blog.excerpt || "",
        content: blog.content,
        category: blog.category || "",
        postType: (blog.postType as PostType) || "blog",
        tags: blog.tags || [],
        featuredImageUrl: blog.featuredImageUrl || "",
        metaTitle: blog.metaTitle || "",
        metaDescription: blog.metaDescription || "",
        ogImageUrl: blog.ogImageUrl || "",
        status: blog.status,
        authorId: blog.authorId || "",
      });
    } else {
      setSelectedBlog(null);
      form.reset({
        title: "",
        slug: "",
        excerpt: "",
        content: "",
        category: "",
        postType: "blog",
        tags: [],
        featuredImageUrl: "",
        metaTitle: "",
        metaDescription: "",
        ogImageUrl: "",
        status: "draft",
        authorId: "",
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

  const handleTogglePublish = (blog: BlogWithAuthor) => {
    const action = blog.status === "published" ? "unpublish" : "publish";
    togglePublishMutation.mutate({ id: blog.id, action });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this post?")) {
      deleteBlogMutation.mutate(id);
    }
  };

  const seedBlogsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/blogs/seed", {});
      return await response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blogs"] });
      toast({
        title: "Sample posts seeded",
        description: `Created ${data.created} posts, skipped ${data.skipped} (already exist)`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to seed posts",
      });
    },
  });

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  return (
    <div className="space-y-6" data-testid="admin-blog-management">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Post Management</h2>
          <p className="text-muted-foreground">
            Create and manage posts — Blog articles, News, and Updates
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => seedBlogsMutation.mutate()}
            disabled={seedBlogsMutation.isPending}
            data-testid="button-seed-blogs"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {seedBlogsMutation.isPending ? "Seeding..." : "Seed Sample Posts"}
          </Button>
          <Button type="button" onClick={() => handleOpenDialog()} data-testid="button-create-blog">
            <Plus className="mr-2 h-4 w-4" />
            New Post
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="w-44">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-44">
              <Label>Post Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger data-testid="select-type-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="blog">Blog</SelectItem>
                  <SelectItem value="news">News</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Posts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Posts ({filteredBlogs.length})</CardTitle>
          <CardDescription>All posts in the system</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading posts...</div>
          ) : filteredBlogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No posts found. Create your first post!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Published Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBlogs.map((blog) => (
                  <TableRow key={blog.id} data-testid={`blog-row-${blog.id}`}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{blog.title}</div>
                        <div className="text-sm text-muted-foreground">{blog.slug}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <PostTypeBadge type={blog.postType || "blog"} />
                    </TableCell>
                    <TableCell>
                      <AuthorCell authorName={blog.authorName} authorAvatar={blog.authorAvatar} />
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
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTogglePublish(blog)}
                          data-testid={`button-toggle-publish-${blog.id}`}
                        >
                          {blog.status === "published" ? "Unpublish" : "Publish"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(blog)}
                          data-testid={`button-edit-${blog.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
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
            <DialogTitle>{selectedBlog ? "Edit Post" : "Create New Post"}</DialogTitle>
            <DialogDescription>
              {selectedBlog ? "Update the post details" : "Fill in the details to create a new post"}
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
                        placeholder="Enter post title"
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
                      <Input {...field} placeholder="post-url-slug" data-testid="input-blog-slug" />
                    </FormControl>
                    <FormDescription>
                      URL-friendly identifier (lowercase letters, numbers, and hyphens only)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="postType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Post Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "blog"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-post-type">
                            <SelectValue placeholder="Select post type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="blog">Blog</SelectItem>
                          <SelectItem value="news">News</SelectItem>
                          <SelectItem value="update">Update</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Controls which tab this post appears under on the landing page
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-post-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Author field */}
              <FormField
                control={form.control}
                name="authorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Author</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-post-author">
                          <SelectValue placeholder={
                            staffList.length === 0
                              ? "No staff members found"
                              : "Select author..."
                          }>
                            {field.value && (() => {
                              const member = staffList.find((s) => s.id === field.value);
                              if (!member) return null;
                              return (
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-5 w-5 shrink-0">
                                    {member.profileImageUrl && <AvatarImage src={member.profileImageUrl} alt={getStaffDisplayName(member)} />}
                                    <AvatarFallback className="text-[10px]">{getStaffInitials(member)}</AvatarFallback>
                                  </Avatar>
                                  <span>{getStaffDisplayName(member)}</span>
                                </div>
                              );
                            })()}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {staffList.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6 shrink-0">
                                {member.profileImageUrl && <AvatarImage src={member.profileImageUrl} alt={getStaffDisplayName(member)} />}
                                <AvatarFallback className="text-[10px]">{getStaffInitials(member)}</AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">{getStaffDisplayName(member)}</span>
                                {member.role && <span className="text-xs text-muted-foreground capitalize">{member.role.replace(/_/g, " ")}</span>}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                        {staffList.length === 0 && (
                          <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
                            <User className="h-4 w-4" />
                            No staff found — current user will be set as author
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The team member who authored this post. Defaults to you if not selected.
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
                        placeholder="Brief summary of the post (max 300 characters)"
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
                        placeholder="Write your post content in Markdown..."
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
                      <FormLabel>Topic / Category</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Visa, Scholarships" data-testid="input-blog-category" />
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
                        <Input {...field} value={field.value ?? ""} placeholder="https://..." data-testid="input-featured-image" />
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
                  {saveBlogMutation.isPending ? "Saving..." : selectedBlog ? "Update Post" : "Create Post"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
