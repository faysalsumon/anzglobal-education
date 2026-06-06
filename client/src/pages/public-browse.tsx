import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Helmet } from "react-helmet";
import { PublicLayout } from "@/components/public-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Tag as TagIcon, ArrowRight, Home, GraduationCap, Building2, Briefcase, Users, Award, Laptop, DollarSign, MapPin, Wrench, BookOpen } from "lucide-react";
import type { Tag } from "@shared/schema";

const categoryIcons: Record<string, typeof GraduationCap> = {
  feature: Award,
  delivery: Laptop,
  career: Briefcase,
  skill: Wrench,
  industry: Building2,
  audience: Users,
  type: Building2,
  specialization: BookOpen,
  experience: GraduationCap,
  location: MapPin,
  financial: DollarSign,
  accreditation: Award,
  services: Users,
};

const categoryDescriptions: Record<string, string> = {
  feature: "Discover courses with special features like scholarships, work placements, and fast-track options.",
  delivery: "Find courses by study mode - online, on-campus, hybrid, or evening classes.",
  career: "Explore programs designed for high-demand careers and industry certifications.",
  skill: "Browse courses emphasizing hands-on training, research, or project-based learning.",
  industry: "Find programs aligned with healthcare, technology, finance, and other sectors.",
  audience: "Courses tailored for international students, working professionals, or school leavers.",
  type: "Browse by institution type - universities, TAFEs, colleges, and private providers.",
  specialization: "Research-intensive, teaching-focused, or industry-partnered institutions.",
  experience: "Campus life, online learning, and international student support options.",
  location: "Urban, suburban, regional, or multi-campus institutions.",
  financial: "Scholarship-friendly, affordable, and work-study program options.",
  accreditation: "Top-ranked institutions with AACSB, EQUIS, and national accreditations.",
  services: "Career services, housing, visa support, and mentorship programs.",
};

function formatCategoryName(category: string): string {
  const names: Record<string, string> = {
    feature: "Course Features",
    delivery: "Delivery Modes",
    career: "Career Outcomes",
    skill: "Skills Focus",
    industry: "Industry Sectors",
    audience: "Target Audience",
    type: "Institution Types",
    specialization: "Specializations",
    experience: "Student Experience",
    location: "Location Types",
    financial: "Financial Options",
    accreditation: "Accreditations",
    services: "Student Services",
  };
  return names[category] || category.charAt(0).toUpperCase() + category.slice(1);
}

export default function PublicBrowsePage() {
  const { data: tags, isLoading } = useQuery<Tag[]>({
    queryKey: ["/api/public/tags"],
  });

  const groupedTags = tags?.reduce((acc, tag) => {
    if (!tag.isActive) return acc;
    if (!acc[tag.category]) {
      acc[tag.category] = [];
    }
    acc[tag.category].push(tag);
    return acc;
  }, {} as Record<string, Tag[]>) || {};

  const sortedCategories = Object.keys(groupedTags).sort((a, b) => {
    const order = ['feature', 'delivery', 'career', 'industry', 'audience', 'skill', 'type', 'specialization', 'experience', 'location', 'financial', 'accreditation', 'services'];
    return order.indexOf(a) - order.indexOf(b);
  });

  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";
  const pageUrl = `${siteUrl}/browse`;

  const metaTitle = "Browse Courses & Institutions by Category | ANZ Global Education";
  const metaDescription = "Explore courses and universities in Australia by category. Filter by delivery mode, career outcomes, industry sectors, and more. Find your perfect study program.";

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Browse Courses by Category",
    "description": metaDescription,
    "url": pageUrl,
    "mainEntity": {
      "@type": "ItemList",
      "itemListElement": sortedCategories.map((category, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": formatCategoryName(category),
        "url": `${pageUrl}#${category}`
      }))
    }
  };

  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": siteUrl },
      { "@type": "ListItem", "position": 2, "name": "Browse", "item": pageUrl }
    ]
  };

  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How can I find courses by delivery mode?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Use the Delivery Modes category to filter courses by online, on-campus, hybrid, or evening classes. This helps you find study options that fit your schedule and preferences."
        }
      },
      {
        "@type": "Question",
        "name": "What career-focused courses are available?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Browse the Career Outcomes category to find courses leading to high-demand jobs, industry certifications, and graduate employment opportunities in Australia."
        }
      },
      {
        "@type": "Question",
        "name": "Can I find courses with scholarships?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes! Check the Financial Options and Course Features categories to find scholarship-friendly programs, affordable options, and courses offering work-study opportunities."
        }
      }
    ]
  };

  return (
    <PublicLayout>
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="title" content={metaTitle} />
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={pageUrl} />

        <meta property="og:type" content="website" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:site_name" content="ANZ Global Education" />

        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDescription} />

        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbData)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(faqData)}
        </script>
      </Helmet>

      <div className="min-h-screen">
        <section className="bg-gradient-to-br from-primary/90 via-primary to-primary/80 text-primary-foreground py-12">
          <div className="container mx-auto px-4">
            <Breadcrumb className="mb-6" data-testid="breadcrumb">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/" className="text-primary-foreground/80 hover:text-primary-foreground">
                      <Home className="h-4 w-4" />
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-primary-foreground/60" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-primary-foreground font-medium">Browse</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <h1 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-page-title">
              Browse by Category
            </h1>
            <p className="text-lg text-primary-foreground/90 max-w-2xl" data-testid="text-page-description">
              Discover courses and institutions organized by features, delivery modes, career outcomes, and more.
              Find the perfect match for your educational journey in Australia.
            </p>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12">
          {isLoading ? (
            <div className="space-y-8">
              {[1, 2, 3].map(i => (
                <div key={i}>
                  <Skeleton className="h-8 w-48 mb-4" />
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map(j => (
                      <Skeleton key={j} className="h-12" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : sortedCategories.length > 0 ? (
            <div className="space-y-10">
              {sortedCategories.map(category => {
                const Icon = categoryIcons[category] || TagIcon;
                const categoryTags = groupedTags[category]?.sort((a, b) => 
                  (a.displayOrder || 0) - (b.displayOrder || 0)
                ) || [];

                return (
                  <div key={category} id={category} className="scroll-mt-20">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold" data-testid={`text-category-${category}`}>
                          {formatCategoryName(category)}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          {categoryDescriptions[category]}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                      {categoryTags.map(tag => (
                        <Link key={tag.id} href={`/browse/${tag.slug}`}>
                          <Card 
                            className="hover-elevate cursor-pointer h-full"
                            data-testid={`card-tag-${tag.slug}`}
                          >
                            <CardContent className="p-4 flex items-center justify-between">
                              <span className="text-sm font-medium">{tag.name}</span>
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <TagIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Categories Available</h2>
              <p className="text-muted-foreground">
                Check back later for categorized browsing options.
              </p>
            </div>
          )}
        </section>

        <section className="bg-muted py-12">
          <div className="container mx-auto px-4">
            <h2 className="text-xl font-semibold mb-6" data-testid="text-help-heading">
              How to Use Category Browsing
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">1</span>
                    Choose a Category
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Browse categories like delivery modes, career outcomes, or financial options to narrow your search.
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">2</span>
                    Select a Tag
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Click on specific tags to see all courses and institutions matching that criteria.
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">3</span>
                    Compare & Apply
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Compare courses, save favorites, and start your application with confidence.
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
