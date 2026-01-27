import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Helmet } from "react-helmet";
import { PublicLayout } from "@/components/public-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, ArrowLeft, Share2 } from "lucide-react";
import type { Blog } from "@shared/schema";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function PublicBlogDetail() {
  const params = useParams();
  const slug = params.slug;

  // Fetch the single blog post
  const { data: blog, isLoading, error } = useQuery<Blog>({
    queryKey: [`/api/blogs/${slug}`],
    enabled: !!slug,
  });

  // Fetch related blogs (same category, excluding current post)
  const { data: relatedBlogsData } = useQuery<{ blogs: Blog[]; total: number }>({
    queryKey: ["/api/blogs", { category: blog?.category, exclude: slug }],
    queryFn: async () => {
      if (!blog?.category) return { blogs: [], total: 0 };
      const params = new URLSearchParams({
        category: blog.category,
        limit: "3",
      });
      const response = await fetch(`/api/blogs?${params}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch related blogs");
      return response.json();
    },
    enabled: !!blog?.category,
  });

  // Filter out current blog slug client-side as a safety measure
  const relatedBlogs = (relatedBlogsData?.blogs || []).filter((b: Blog) => b.slug !== slug);

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return "";
    const date = typeof dateString === "string" ? new Date(dateString) : dateString;
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const estimateReadingTime = (content: string) => {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return `${minutes} min read`;
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: blog?.title,
        text: blog?.excerpt || "",
        url: window.location.href,
      }).catch(() => {
        // User cancelled share or error occurred
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
            <p className="mt-4 text-muted-foreground">Loading blog post...</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (error || !blog) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">Blog Post Not Found</h1>
            <p className="text-muted-foreground mb-8">
              The blog post you're looking for doesn't exist or has been removed.
            </p>
            <Link href="/blog">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Blog
              </Button>
            </Link>
          </div>
        </div>
      </PublicLayout>
    );
  }

  // Prepare SEO data
  const siteUrl = window.location.origin;
  const blogUrl = `${siteUrl}/blog/${blog.slug}`;
  const metaTitle = blog.metaTitle || blog.title;
  const metaDescription = blog.metaDescription || blog.excerpt || blog.content.substring(0, 160);
  const ogImage = blog.ogImageUrl || blog.featuredImageUrl || `${siteUrl}/og-image.png`;

  // Create JSON-LD structured data for Article (Enhanced for AI/GEO)
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": blog.title,
    "description": metaDescription,
    "image": ogImage,
    "datePublished": blog.publishedAt,
    "dateModified": blog.updatedAt || blog.publishedAt,
    "author": {
      "@type": "Organization",
      "name": "ANZ Global Education",
      "url": siteUrl
    },
    "publisher": {
      "@type": "Organization",
      "name": "ANZ Global Education",
      "url": siteUrl,
      "logo": {
        "@type": "ImageObject",
        "url": `${siteUrl}/logo.png`
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": blogUrl
    },
    "articleSection": blog.category || undefined,
    "keywords": blog.tags?.join(', ') || undefined,
    "inLanguage": "en"
  };

  // Breadcrumb schema for blog articles
  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": siteUrl
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Blog",
        "item": `${siteUrl}/blog`
      },
      ...(blog.category ? [{
        "@type": "ListItem",
        "position": 3,
        "name": blog.category,
        "item": `${siteUrl}/blog?category=${encodeURIComponent(blog.category)}`
      }] : []),
      {
        "@type": "ListItem",
        "position": blog.category ? 4 : 3,
        "name": blog.title,
        "item": blogUrl
      }
    ]
  };

  return (
    <PublicLayout>
      <Helmet>
        {/* Primary Meta Tags */}
        <title>{metaTitle} | ANZ Global Education</title>
        <meta name="title" content={metaTitle} />
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={blogUrl} />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={blogUrl} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:site_name" content="ANZ Global Education" />
        {blog.publishedAt && (
          <meta property="article:published_time" content={new Date(blog.publishedAt).toISOString()} />
        )}
        {blog.updatedAt && (
          <meta property="article:modified_time" content={new Date(blog.updatedAt).toISOString()} />
        )}
        {blog.category && <meta property="article:section" content={blog.category} />}
        {blog.tags && blog.tags.map((tag) => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={blogUrl} />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDescription} />
        <meta name="twitter:image" content={ogImage} />

        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbData)}
        </script>
      </Helmet>

      <div className="min-h-screen">
        {/* Header */}
        <section className="bg-gradient-to-br from-primary/90 via-primary to-primary/80 text-primary-foreground py-12">
          <div className="container mx-auto px-4">
            <Link href="/blog">
              <Button variant="ghost" className="mb-6 text-primary-foreground hover:bg-primary-foreground/10" data-testid="button-back-to-blog">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Blog
              </Button>
            </Link>

            <div className="max-w-4xl mx-auto space-y-4">
              {blog.category && (
                <Badge variant="secondary" className="mb-2" data-testid="blog-category">
                  {blog.category}
                </Badge>
              )}
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight" data-testid="blog-title">
                {blog.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-sm text-primary-foreground/90">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span data-testid="blog-date">{formatDate(blog.publishedAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span data-testid="blog-reading-time">{estimateReadingTime(blog.content)}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShare}
                  className="text-primary-foreground hover:bg-primary-foreground/10"
                  data-testid="button-share"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Image */}
        {blog.featuredImageUrl && (
          <section className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
              <img
                src={blog.featuredImageUrl}
                alt={blog.title}
                className="w-full rounded-lg shadow-lg object-cover max-h-[500px]"
                data-testid="blog-featured-image"
              />
            </div>
          </section>
        )}

        {/* Blog Content */}
        <section className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardContent className="prose prose-slate dark:prose-invert max-w-none p-8" data-testid="blog-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {blog.content}
                </ReactMarkdown>
              </CardContent>
            </Card>

            {/* Tags */}
            {blog.tags && blog.tags.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2">
                <span className="text-sm font-medium">Tags:</span>
                {blog.tags.map((tag) => (
                  <Badge key={tag} variant="outline" data-testid={`blog-tag-${tag}`}>
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Related Posts */}
        {relatedBlogs.length > 0 && (
          <section className="container mx-auto px-4 py-16 border-t">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold mb-8">Related Articles</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedBlogs.map((relatedBlog) => (
                  <Link key={relatedBlog.id} href={`/blog/${relatedBlog.slug}`}>
                    <Card className="h-full hover-elevate" data-testid={`related-blog-${relatedBlog.slug}`}>
                      {relatedBlog.featuredImageUrl && (
                        <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                          <img
                            src={relatedBlog.featuredImageUrl}
                            alt={relatedBlog.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <CardContent className="p-4">
                        <h3 className="font-semibold line-clamp-2 mb-2">{relatedBlog.title}</h3>
                        {relatedBlog.excerpt && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {relatedBlog.excerpt}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </PublicLayout>
  );
}
