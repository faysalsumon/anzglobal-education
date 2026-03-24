import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Helmet } from "react-helmet";
import { PublicLayout } from "@/components/public-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Calendar, Clock, ArrowLeft, Share2, GraduationCap, MapPin,
  Twitter, Facebook, Linkedin, Link2, ChevronRight, FileText,
  Newspaper, Radio,
} from "lucide-react";
import type { BlogWithAuthor, CourseWithDetails } from "@shared/schema";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { InstitutionLogo } from "@/components/institution-logo";
import { useEffect, useRef, useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";

// ── helpers ──────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function parseToc(content: string): Array<{ level: 2 | 3; text: string; id: string }> {
  const lines = content.split("\n");
  const toc: Array<{ level: 2 | 3; text: string; id: string }> = [];
  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+)$/);
    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      const text = h3[1].trim();
      toc.push({ level: 3, text, id: slugify(text) });
    } else if (h2) {
      const text = h2[1].trim();
      toc.push({ level: 2, text, id: slugify(text) });
    }
  }
  return toc;
}

const ROLE_LABELS: Record<string, string> = {
  cto: "Chief Technology Officer",
  ceo: "Chief Executive Officer",
  branch_manager: "Education Consultant",
  support_staff: "Education Advisor",
  operations_staff: "Operations Specialist",
  admin: "Education Specialist",
};

function roleLabel(role: string | null | undefined): string {
  if (!role) return "Education Specialist";
  return ROLE_LABELS[role] ?? role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function authorInitials(name: string | null | undefined): string {
  if (!name) return "ANZ";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function postTypeBadgeVariant(postType: string): "default" | "secondary" | "outline" {
  if (postType === "news") return "secondary";
  if (postType === "update") return "outline";
  return "default";
}

function postTypeLabel(postType: string): string {
  if (postType === "news") return "News";
  if (postType === "update") return "Update";
  return "Blog";
}

function postTypeIcon(postType: string) {
  if (postType === "news") return <Newspaper className="h-3.5 w-3.5" />;
  if (postType === "update") return <Radio className="h-3.5 w-3.5" />;
  return <FileText className="h-3.5 w-3.5" />;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PublicBlogDetail() {
  const params = useParams();
  const slug = params.slug;
  const { toast } = useToast();
  const [activeHeading, setActiveHeading] = useState<string>("");
  const headingRefs = useRef<Map<string, Element>>(new Map());

  const { data: blog, isLoading, error } = useQuery<BlogWithAuthor>({
    queryKey: [`/api/blogs/${slug}`],
    enabled: !!slug,
  });

  const categoryParam = blog?.category ? encodeURIComponent(blog.category) : "";
  const { data: relatedBlogsData } = useQuery<{ blogs: BlogWithAuthor[]; total: number }>({
    queryKey: [`/api/blogs?category=${categoryParam}&limit=4`],
    enabled: !!blog?.category,
  });
  const relatedBlogs = (relatedBlogsData?.blogs || []).filter((b) => b.slug !== slug).slice(0, 3);

  const tagSearchParam = blog?.tags?.slice(0, 3).join(" ") || blog?.category || "";
  const { data: relatedCoursesData } = useQuery<{ courses: CourseWithDetails[]; total: number }>({
    queryKey: [`/api/public/courses?search=${encodeURIComponent(tagSearchParam)}&limit=3`],
    enabled: !!blog && (!!blog.tags?.length || !!blog.category),
  });
  const relatedCourses = relatedCoursesData?.courses || [];

  // Table of contents
  const toc = useMemo(() => (blog ? parseToc(blog.content) : []), [blog]);

  // IntersectionObserver for active TOC heading
  useEffect(() => {
    if (toc.length < 2) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveHeading(entry.target.id);
          }
        }
      },
      { rootMargin: "-20% 0% -60% 0%", threshold: 0 }
    );
    toc.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) {
        headingRefs.current.set(id, el);
        observer.observe(el);
      }
    });
    return () => observer.disconnect();
  }, [toc]);

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return "";
    const date = typeof dateString === "string" ? new Date(dateString) : dateString;
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  };

  const estimateReadingTime = (content: string) => {
    const minutes = Math.ceil(content.split(/\s+/).length / 200);
    return `${minutes} min read`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link copied!", description: "The post URL has been copied to your clipboard." });
  };

  const handleShare = () => {
    if (navigator.share && blog) {
      navigator.share({ title: blog.title, text: blog.excerpt || "", url: window.location.href }).catch(() => {});
    } else {
      handleCopyLink();
    }
  };

  const shareUrl = encodeURIComponent(typeof window !== "undefined" ? window.location.href : "");
  const shareTitle = encodeURIComponent(blog?.title || "");

  // Custom heading renderers to inject id anchors for TOC
  const markdownComponents = useMemo(() => ({
    h2: ({ children, ...props }: any) => {
      const text = String(children);
      const id = slugify(text);
      return <h2 id={id} {...props}>{children}</h2>;
    },
    h3: ({ children, ...props }: any) => {
      const text = String(children);
      const id = slugify(text);
      return <h3 id={id} {...props}>{children}</h3>;
    },
  }), []);

  // ── Loading / error states ────────────────────────────────────────────────

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
          <p className="mt-4 text-muted-foreground">Loading post...</p>
        </div>
      </PublicLayout>
    );
  }

  if (error || !blog) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl font-bold mb-4">Post Not Found</h1>
          <p className="text-muted-foreground mb-8">
            The post you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/blog">
            <Button type="button">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Blog
            </Button>
          </Link>
        </div>
      </PublicLayout>
    );
  }

  // ── SEO ───────────────────────────────────────────────────────────────────

  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";
  const blogUrl = `${siteUrl}/blog/${blog.slug}`;
  const metaTitle = blog.metaTitle || blog.title;
  const metaDescription = blog.metaDescription || blog.excerpt || blog.content.substring(0, 160);
  const ogImage = blog.ogImageUrl || blog.featuredImageUrl || `${siteUrl}/og-image.png`;
  const postType = blog.postType || "blog";

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: blog.title,
    description: metaDescription,
    image: ogImage,
    datePublished: blog.publishedAt,
    dateModified: blog.updatedAt || blog.publishedAt,
    author: {
      "@type": "Person",
      name: blog.authorName || "ANZ Global Education",
    },
    publisher: {
      "@type": "Organization",
      name: "ANZ Global Education",
      url: siteUrl,
      logo: { "@type": "ImageObject", url: `${siteUrl}/logo.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": blogUrl },
    articleSection: blog.category || undefined,
    keywords: blog.tags?.join(", ") || undefined,
    inLanguage: "en",
  };

  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${siteUrl}/blog` },
      ...(blog.category
        ? [{ "@type": "ListItem", position: 3, name: blog.category, item: `${siteUrl}/blog?category=${encodeURIComponent(blog.category)}` }]
        : []),
      { "@type": "ListItem", position: blog.category ? 4 : 3, name: blog.title, item: blogUrl },
    ],
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <PublicLayout>
      <Helmet>
        <title>{metaTitle} | ANZ Global Education</title>
        <meta name="title" content={metaTitle} />
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={blogUrl} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={blogUrl} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:site_name" content="ANZ Global Education" />
        {blog.publishedAt && <meta property="article:published_time" content={new Date(blog.publishedAt).toISOString()} />}
        {blog.updatedAt && <meta property="article:modified_time" content={new Date(blog.updatedAt).toISOString()} />}
        {blog.category && <meta property="article:section" content={blog.category} />}
        {blog.tags?.map((tag) => <meta key={tag} property="article:tag" content={tag} />)}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={blogUrl} />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDescription} />
        <meta name="twitter:image" content={ogImage} />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbData)}</script>
      </Helmet>

      <div className="min-h-screen">

        {/* ── Hero ── */}
        <section
          className="relative min-h-[480px] flex flex-col justify-end"
          data-testid="blog-hero"
          style={
            blog.featuredImageUrl
              ? { backgroundImage: `url(${blog.featuredImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
              : undefined
          }
        >
          {/* Dark wash overlay — always rendered when image present */}
          {blog.featuredImageUrl && (
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/55 to-black/80 pointer-events-none" />
          )}

          {/* Solid gradient fallback when no image */}
          {!blog.featuredImageUrl && (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary to-primary/80" />
          )}

          <div className="relative z-10 container mx-auto px-4 pb-12 pt-12">
            {/* Back + breadcrumb */}
            <div className="mb-6 flex items-center gap-1 text-sm flex-wrap">
              <Link href="/blog">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-white/80 hover:text-white hover:bg-white/10 px-2 h-7"
                  data-testid="button-back-to-blog"
                >
                  <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                  Blog
                </Button>
              </Link>
              {blog.category && (
                <>
                  <ChevronRight className="h-3.5 w-3.5 text-white/50 shrink-0" />
                  <Link href={`/blog?category=${encodeURIComponent(blog.category)}`}>
                    <span className="text-white/70 hover:text-white cursor-pointer transition-colors">{blog.category}</span>
                  </Link>
                </>
              )}
            </div>

            <div className="max-w-3xl space-y-4">
              {/* Post-type badge */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant={postTypeBadgeVariant(postType)}
                  className="gap-1.5 capitalize shadow-sm"
                  data-testid="badge-post-type"
                >
                  {postTypeIcon(postType)}
                  {postTypeLabel(postType)}
                </Badge>
                {blog.category && (
                  <Badge variant="outline" className="border-white/30 text-white/80 bg-transparent">
                    {blog.category}
                  </Badge>
                )}
              </div>

              <h1
                className="text-3xl md:text-5xl font-bold tracking-tight text-white leading-tight"
                data-testid="blog-title"
              >
                {blog.title}
              </h1>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-white/80">
                {/* Author */}
                <div className="flex items-center gap-2" data-testid="blog-author-meta">
                  <Avatar className="h-7 w-7 border border-white/30">
                    {blog.authorAvatar && <AvatarImage src={blog.authorAvatar} alt={blog.authorName || "Author"} />}
                    <AvatarFallback className="bg-white/20 text-white text-xs">
                      {authorInitials(blog.authorName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-white">{blog.authorName || "ANZ Global Education"}</span>
                </div>

                <span className="text-white/40">·</span>

                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span data-testid="blog-date">{formatDate(blog.publishedAt)}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span data-testid="blog-reading-time">{estimateReadingTime(blog.content)}</span>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleShare}
                  className="text-white/80 hover:text-white hover:bg-white/10 h-7 px-2"
                  data-testid="button-share-hero"
                >
                  <Share2 className="h-3.5 w-3.5 mr-1.5" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Body: two-column ── */}
        <div className="container mx-auto px-4 py-10">
          <div className="lg:grid lg:grid-cols-[1fr_260px] gap-10 items-start">

            {/* ── Left: article ── */}
            <div className="min-w-0">
              {/* Mobile TOC accordion */}
              {toc.length >= 2 && (
                <details className="lg:hidden mb-6 group" data-testid="toc-mobile">
                  <summary className="cursor-pointer list-none">
                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">Table of Contents</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
                      </div>
                    </Card>
                  </summary>
                  <Card className="mt-2 p-4">
                    <nav>
                      <ul className="space-y-1.5">
                        {toc.map(({ level, text, id }) => (
                          <li key={id} className={level === 3 ? "pl-4" : ""}>
                            <a
                              href={`#${id}`}
                              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {text}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </nav>
                  </Card>
                </details>
              )}

              {/* Article body */}
              <Card data-testid="blog-content-card">
                <CardContent className="prose prose-slate dark:prose-invert max-w-none p-6 md:p-8" data-testid="blog-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {blog.content}
                  </ReactMarkdown>
                </CardContent>
              </Card>

              {/* Tags */}
              {blog.tags && blog.tags.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2 items-center" data-testid="blog-tags">
                  <span className="text-sm font-medium text-muted-foreground">Tags:</span>
                  {blog.tags.map((tag) => (
                    <Badge key={tag} variant="outline" data-testid={`blog-tag-${tag}`}>
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Author card */}
              <Card className="mt-6" data-testid="blog-author-card">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16 shrink-0 border-2 border-border" data-testid="author-avatar">
                      {blog.authorAvatar && (
                        <AvatarImage src={blog.authorAvatar} alt={blog.authorName || "Author"} />
                      )}
                      <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                        {authorInitials(blog.authorName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-semibold text-base leading-tight" data-testid="author-name">
                        {blog.authorName || "ANZ Global Education Team"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5" data-testid="author-role">
                        {roleLabel(blog.authorRole)}
                      </p>
                      <p className="text-sm text-muted-foreground/70 mt-0.5">ANZ Global Education</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Publisher attribution */}
              <div className="mt-6 pt-6 border-t flex items-center gap-3" data-testid="publisher-attribution">
                <div className="flex items-center justify-center h-10 w-10 rounded-md bg-primary/10 text-primary shrink-0 font-bold text-sm">
                  ANZ
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">Published by ANZ Global Education</p>
                  <p className="text-xs text-muted-foreground">Your trusted partner for international education</p>
                </div>
                <Link href="/our-story" className="ml-auto shrink-0">
                  <Button type="button" variant="ghost" size="sm" className="text-xs">
                    About us
                  </Button>
                </Link>
              </div>
            </div>

            {/* ── Right: sticky sidebar ── */}
            <aside className="hidden lg:block sticky top-6 space-y-4" data-testid="blog-sidebar">

              {/* Table of Contents */}
              {toc.length >= 2 && (
                <Card data-testid="toc-desktop">
                  <CardHeader className="pb-3 pt-4 px-4">
                    <CardTitle className="text-sm font-semibold">Contents</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <nav>
                      <ul className="space-y-1">
                        {toc.map(({ level, text, id }) => (
                          <li key={id} className={level === 3 ? "pl-3" : ""}>
                            <a
                              href={`#${id}`}
                              className={`block text-sm py-0.5 transition-colors leading-snug ${
                                activeHeading === id
                                  ? "text-primary font-medium"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                              data-testid={`toc-link-${id}`}
                            >
                              {text}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </nav>
                  </CardContent>
                </Card>
              )}

              {/* Share */}
              <Card data-testid="blog-share-card">
                <CardHeader className="pb-3 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold">Share this post</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  <a
                    href={`https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="share-twitter"
                  >
                    <Button type="button" variant="outline" size="sm" className="w-full justify-start gap-2">
                      <Twitter className="h-4 w-4" />
                      Share on X / Twitter
                    </Button>
                  </a>
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="share-facebook"
                  >
                    <Button type="button" variant="outline" size="sm" className="w-full justify-start gap-2">
                      <Facebook className="h-4 w-4" />
                      Share on Facebook
                    </Button>
                  </a>
                  <a
                    href={`https://www.linkedin.com/shareArticle?mini=true&url=${shareUrl}&title=${shareTitle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="share-linkedin"
                  >
                    <Button type="button" variant="outline" size="sm" className="w-full justify-start gap-2">
                      <Linkedin className="h-4 w-4" />
                      Share on LinkedIn
                    </Button>
                  </a>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2"
                    onClick={handleCopyLink}
                    data-testid="share-copy-link"
                  >
                    <Link2 className="h-4 w-4" />
                    Copy link
                  </Button>
                </CardContent>
              </Card>

              {/* Back link */}
              <Link href="/blog">
                <Button type="button" variant="ghost" size="sm" className="w-full gap-2 text-muted-foreground">
                  <ArrowLeft className="h-4 w-4" />
                  All posts
                </Button>
              </Link>
            </aside>
          </div>
        </div>

        {/* ── Related Posts ── */}
        {relatedBlogs.length > 0 && (
          <section className="border-t bg-muted/30 py-14" data-testid="section-related-posts">
            <div className="container mx-auto px-4">
              <div className="max-w-5xl mx-auto">
                <h2 className="text-2xl font-bold mb-8">Related Articles</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {relatedBlogs.map((relatedBlog) => {
                    const rType = relatedBlog.postType || "blog";
                    return (
                      <Link key={relatedBlog.id} href={`/blog/${relatedBlog.slug}`} data-testid={`related-blog-${relatedBlog.slug}`}>
                        <Card className="h-full hover-elevate group flex flex-col">
                          <div className="relative">
                            {relatedBlog.featuredImageUrl ? (
                              <div className="aspect-video w-full overflow-hidden rounded-t-md">
                                <img
                                  src={relatedBlog.featuredImageUrl}
                                  alt={relatedBlog.title}
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                              </div>
                            ) : (
                              <div className="aspect-video w-full rounded-t-md bg-muted flex items-center justify-center">
                                {postTypeIcon(rType)}
                              </div>
                            )}
                            <div className="absolute top-2.5 left-2.5">
                              <Badge
                                variant={postTypeBadgeVariant(rType)}
                                className="text-xs capitalize shadow-sm gap-1"
                              >
                                {postTypeIcon(rType)}
                                {postTypeLabel(rType)}
                              </Badge>
                            </div>
                          </div>
                          <CardHeader className="pb-2 flex-1">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1 flex-wrap">
                              <Calendar className="h-3 w-3 shrink-0" />
                              <span>{formatDate(relatedBlog.publishedAt)}</span>
                              {relatedBlog.category && (
                                <>
                                  <span className="text-muted-foreground/40">·</span>
                                  <span className="text-primary/70 font-medium">{relatedBlog.category}</span>
                                </>
                              )}
                            </div>
                            <CardTitle className="text-sm font-semibold line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                              {relatedBlog.title}
                            </CardTitle>
                          </CardHeader>
                          {relatedBlog.authorName && (
                            <CardContent className="pt-0 pb-3">
                              <div className="flex items-center gap-1.5">
                                <Avatar className="h-5 w-5 shrink-0">
                                  {relatedBlog.authorAvatar && (
                                    <AvatarImage src={relatedBlog.authorAvatar} alt={relatedBlog.authorName} />
                                  )}
                                  <AvatarFallback className="text-[9px]">
                                    {authorInitials(relatedBlog.authorName)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-muted-foreground">By {relatedBlog.authorName}</span>
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Related Courses ── */}
        {relatedCourses.length > 0 && (
          <section className="container mx-auto px-4 py-14" data-testid="section-related-courses">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center gap-2 mb-8">
                <GraduationCap className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold">Related Courses</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedCourses.map((course) => (
                  <Link key={course.id} href={`/courses/${course.slug || course.id}`} data-testid={`related-course-${course.id}`}>
                    <Card className="h-full hover-elevate">
                      <CardHeader className="pb-2">
                        <div className="flex items-start gap-3">
                          {course.university && (
                            <InstitutionLogo src={course.university.logo} alt={course.university.name} size="sm" />
                          )}
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base line-clamp-2" data-testid={`text-course-title-${course.id}`}>
                              {course.title}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1" data-testid={`text-course-provider-${course.id}`}>
                              {course.university?.name || "Unknown Provider"}
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-2">
                        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                          {course.duration && (
                            <span className="flex items-center gap-1" data-testid={`text-course-duration-${course.id}`}>
                              <Clock className="h-3.5 w-3.5" />
                              {course.duration}
                            </span>
                          )}
                          {course.location && (
                            <span className="flex items-center gap-1" data-testid={`text-course-location-${course.id}`}>
                              <MapPin className="h-3.5 w-3.5" />
                              {course.location}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
              <div className="mt-8 text-center">
                <Link href="/courses">
                  <Button type="button" variant="outline" data-testid="button-view-all-courses">
                    Browse All Courses
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        )}

      </div>
    </PublicLayout>
  );
}
