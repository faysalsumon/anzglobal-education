import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Building2, Users, Sparkles, TrendingUp, GraduationCap, Search, FileCheck, Filter, UserPlus, Calendar, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import type { Course, University, Blog } from "@shared/schema";
import { StudentAuthModal } from "@/components/student-auth-modal";
import { InstitutionAuthModal } from "@/components/institution-auth-modal";
import { TypingText } from "@/components/typing-text";
import { PublicLayout } from "@/components/public-layout";

interface PlatformStats {
  institutionCount: number;
  courseCount: number;
}

type CourseWithUniversity = Course & { university?: University };

export default function Landing() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchType, setSearchType] = useState<"courses" | "institutions">("courses");
  const [showStudentAuthModal, setShowStudentAuthModal] = useState(false);
  const [showInstitutionAuthModal, setShowInstitutionAuthModal] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const { data: stats } = useQuery<PlatformStats>({
    queryKey: ["/api/platform/stats"],
  });

  const { data: courses = [] } = useQuery<CourseWithUniversity[]>({
    queryKey: ["/api/courses"],
  });

  const { data: institutions = [] } = useQuery<University[]>({
    queryKey: ["/api/institutions"],
  });

  // Fetch latest blog posts
  const { data: blogsData } = useQuery<{ blogs: Blog[]; total: number }>({
    queryKey: ["/api/blogs"],
  });

  const blogs = blogsData?.blogs || [];

  // Filter courses or institutions based on search query and type
  const courseSuggestions = searchQuery.trim().length > 0 && searchType === "courses"
    ? courses
        .filter((course) => 
          course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          course.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          course.description?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 5)
    : [];

  const institutionSuggestions = searchQuery.trim().length > 0 && searchType === "institutions"
    ? institutions
        .filter((institution) => 
          institution.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          institution.country?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          institution.description?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 5)
    : [];

  const suggestions = searchType === "courses" ? courseSuggestions : institutionSuggestions;

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (query?: string, itemId?: string) => {
    const searchTerm = query || searchQuery;
    const basePath = searchType === "courses" ? "/courses" : "/institutions";
    
    if (itemId && searchType === "courses") {
      // If a specific course is selected, highlight it
      window.location.href = `${basePath}?search=${encodeURIComponent(searchTerm)}&highlight=${itemId}`;
    } else if (searchTerm.trim()) {
      // Just search
      window.location.href = `${basePath}?search=${encodeURIComponent(searchTerm)}`;
    } else {
      // No search term, just go to the page
      window.location.href = basePath;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
      setShowSuggestions(false);
    }
  };

  const handleCourseSuggestionClick = (course: CourseWithUniversity) => {
    setSearchQuery(course.title);
    setShowSuggestions(false);
    handleSearch(course.title, String(course.id));
  };

  const handleInstitutionSuggestionClick = (institution: University) => {
    setSearchQuery(institution.name);
    setShowSuggestions(false);
    handleSearch(institution.name);
  };

  // SEO data
  const siteUrl = window.location.origin;
  const pageTitle = "ANZ Global Education - Connect Universities and Students Worldwide";
  const pageDescription = "AI-powered course discovery platform connecting universities and students worldwide. Find your perfect course with intelligent filtering and direct application system.";
  const ogImage = `${siteUrl}/og-image.png`;

  return (
    <PublicLayout onStudentLoginClick={() => setShowStudentAuthModal(true)}>
      <Helmet>
        {/* Primary Meta Tags */}
        <title>{pageTitle}</title>
        <meta name="title" content={pageTitle} />
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={siteUrl} />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={siteUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:site_name" content="ANZ Global Education" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={siteUrl} />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={ogImage} />

        {/* JSON-LD Organization Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "ANZ Global Education",
            "url": siteUrl,
            "logo": `${siteUrl}/logo.png`,
            "description": pageDescription,
            "sameAs": []
          })}
        </script>
      </Helmet>

      {/* Hero Section */}
      <section className="overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 py-20 md:py-32 text-white isolate -z-10">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl min-h-[120px] sm:min-h-[140px] md:min-h-[160px]">
              Find Your{" "}
              <TypingText 
                words={["Dream Course", "Perfect University", "Future Career"]}
                className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-orange-200 to-pink-200"
              />
              <br />
              with{" "}
              <span className="relative inline-block">
                <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 to-blue-200 font-extrabold">
                  AI
                </span>
                <span className="absolute inset-0 blur-xl bg-gradient-to-r from-cyan-400 to-blue-400 opacity-50" aria-hidden="true"></span>
              </span>
            </h1>
            <p className="mb-8 text-lg opacity-90 sm:text-xl max-w-2xl mx-auto">
              Smart recommendations. Instant applications. Your Australian education journey starts here.
            </p>
            <div className="mx-auto max-w-2xl relative" ref={searchContainerRef}>
              {/* Search Type Toggle */}
              <div className="flex gap-2 mb-4 justify-center">
                <Button
                  variant={searchType === "courses" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setSearchType("courses");
                    setSearchQuery("");
                    setShowSuggestions(false);
                  }}
                  data-testid="button-search-type-courses"
                >
                  <GraduationCap className="h-4 w-4 mr-2" />
                  Search Courses
                </Button>
                <Button
                  variant={searchType === "institutions" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setSearchType("institutions");
                    setSearchQuery("");
                    setShowSuggestions(false);
                  }}
                  data-testid="button-search-type-institutions"
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Search Institutions
                </Button>
              </div>

              <div className="bg-white rounded-lg p-2 shadow-lg flex gap-2">
                <Input 
                  placeholder={searchType === "courses" ? "Search courses..." : "Search institutions..."} 
                  className="flex-1 border-0 focus-visible:ring-0 text-gray-900 placeholder:text-gray-500"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => searchQuery.trim().length > 0 && setShowSuggestions(true)}
                  onKeyPress={handleKeyPress}
                  data-testid="input-search"
                />
                <Button 
                  variant="default" 
                  size="default" 
                  onClick={() => handleSearch()}
                  data-testid="button-search"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
              
              {/* Autocomplete Suggestions */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-40">
                  {searchType === "courses" ? (
                    courseSuggestions.map((course) => (
                      <button
                        key={course.id}
                        onClick={() => handleCourseSuggestionClick(course)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100 border-b border-gray-100 last:border-b-0 transition-colors"
                        data-testid={`suggestion-course-${course.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <Search className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{course.title}</p>
                            <p className="text-sm text-gray-500 truncate">
                              {course.subject} • {course.university?.name || 'University'}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    institutionSuggestions.map((institution) => (
                      <button
                        key={institution.id}
                        onClick={() => handleInstitutionSuggestionClick(institution)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100 border-b border-gray-100 last:border-b-0 transition-colors"
                        data-testid={`suggestion-institution-${institution.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <Building2 className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{institution.name}</p>
                            <p className="text-sm text-gray-500 truncate">
                              {institution.country}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 3 Steps to University */}
      <section className="py-16 md:py-24 bg-card">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold text-foreground md:text-4xl">
            3 STEPS TO UNIVERSITY
          </h2>
          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="mb-4 mx-auto w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center">
                <Filter className="h-16 w-16 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">Filter</h3>
              <p className="text-muted-foreground">
                Filter universities based on your requirements.
              </p>
            </div>
            <div className="text-center">
              <div className="mb-4 mx-auto w-32 h-32 bg-secondary/10 rounded-full flex items-center justify-center">
                <GraduationCap className="h-16 w-16 text-secondary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">Choose</h3>
              <p className="text-muted-foreground">
                Choose your course & the desired university.
              </p>
            </div>
            <div className="text-center">
              <div className="mb-4 mx-auto w-32 h-32 bg-accent/10 rounded-full flex items-center justify-center">
                <FileCheck className="h-16 w-16 text-accent" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">Apply</h3>
              <p className="text-muted-foreground">
                Apply online through us hassle free.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Statistics */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-2 max-w-3xl mx-auto">
            <Card className="text-center border-primary/20 hover-elevate">
              <CardHeader className="pb-4">
                <div className="mb-4 mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-5xl font-bold text-primary" data-testid="text-institution-count">
                  {stats?.institutionCount || 0}+
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-medium text-foreground">Number of Institutions</p>
              </CardContent>
            </Card>

            <Card className="text-center border-secondary/20 hover-elevate">
              <CardHeader className="pb-4">
                <div className="mb-4 mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
                  <GraduationCap className="h-8 w-8 text-secondary" />
                </div>
                <CardTitle className="text-5xl font-bold text-secondary" data-testid="text-course-count">
                  {stats?.courseCount || 0}+
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-medium text-foreground">Number of Courses</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-16 md:py-24 bg-card">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">Why Choose ANZ Global Education?</h2>
            <p className="text-lg text-muted-foreground">Transforming how universities and students connect</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <Card className="border-card-border hover-elevate">
              <CardHeader>
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>For Universities</CardTitle>
                <CardDescription>Streamline admissions and expand your global reach</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <FileCheck className="h-4 w-4 mt-0.5 text-secondary" />
                  <span>AI-powered content generation for courses</span>
                </div>
                <div className="flex items-start gap-2">
                  <FileCheck className="h-4 w-4 mt-0.5 text-secondary" />
                  <span>Centralized application management system</span>
                </div>
                <div className="flex items-start gap-2">
                  <FileCheck className="h-4 w-4 mt-0.5 text-secondary" />
                  <span>Connect with qualified international candidates</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-card-border hover-elevate">
              <CardHeader>
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10">
                  <Users className="h-6 w-6 text-secondary" />
                </div>
                <CardTitle>For Students</CardTitle>
                <CardDescription>Find and apply to your dream courses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <FileCheck className="h-4 w-4 mt-0.5 text-secondary" />
                  <span>Smart course recommendations</span>
                </div>
                <div className="flex items-start gap-2">
                  <FileCheck className="h-4 w-4 mt-0.5 text-secondary" />
                  <span>AI profile builder assistance</span>
                </div>
                <div className="flex items-start gap-2">
                  <FileCheck className="h-4 w-4 mt-0.5 text-secondary" />
                  <span>Track application status</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-card-border hover-elevate">
              <CardHeader>
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                  <Sparkles className="h-6 w-6 text-accent" />
                </div>
                <CardTitle>AI-Powered</CardTitle>
                <CardDescription>Intelligent tools for better decisions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <FileCheck className="h-4 w-4 mt-0.5 text-secondary" />
                  <span>Advanced course filtering</span>
                </div>
                <div className="flex items-start gap-2">
                  <FileCheck className="h-4 w-4 mt-0.5 text-secondary" />
                  <span>Automated profile generation</span>
                </div>
                <div className="flex items-start gap-2">
                  <FileCheck className="h-4 w-4 mt-0.5 text-secondary" />
                  <span>Personalized recommendations</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Recent Blog Posts Section */}
      {blogs.length > 0 && (
        <section className="py-16 md:py-24 bg-card" data-testid="section-recent-blogs">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-12">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-2" data-testid="heading-recent-blogs">Latest Insights</h2>
                <p className="text-muted-foreground" data-testid="text-recent-blogs-description">
                  Stay updated with the latest news and guides in international education
                </p>
              </div>
              <Link href="/blog">
                <Button variant="outline" data-testid="button-view-all-blogs">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {blogs.slice(0, 3).map((blog) => (
                <Link key={blog.id} href={`/blog/${blog.slug}`} data-testid={`link-blog-${blog.slug}`}>
                  <Card className="h-full hover-elevate group" data-testid={`landing-blog-card-${blog.slug}`}>
                    {blog.featuredImageUrl && (
                      <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                        <img
                          src={blog.featuredImageUrl}
                          alt={blog.title}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          data-testid={`img-blog-${blog.slug}`}
                        />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Calendar className="h-3 w-3" />
                        <span data-testid={`text-blog-date-${blog.slug}`}>
                          {blog.publishedAt
                            ? new Date(blog.publishedAt).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })
                            : ""}
                        </span>
                      </div>
                      <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors" data-testid={`text-blog-title-${blog.slug}`}>
                        {blog.title}
                      </CardTitle>
                    </CardHeader>
                    {blog.excerpt && (
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-3" data-testid={`text-blog-excerpt-${blog.slug}`}>
                          {blog.excerpt}
                        </p>
                      </CardContent>
                    )}
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl rounded-2xl bg-gradient-to-r from-primary to-secondary p-8 text-center text-white md:p-12">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">Ready to Get Started?</h2>
            <p className="mb-8 text-lg opacity-90">
              Join thousands of students finding their perfect course or universities showcasing their programs
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button 
                size="lg" 
                variant="secondary" 
                onClick={() => setShowStudentAuthModal(true)}
                data-testid="button-student-cta"
              >
                <GraduationCap className="h-5 w-5 mr-2" />
                I'm a Student
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="bg-white/10 hover:bg-white/20 border-white text-white" 
                onClick={() => setShowInstitutionAuthModal(true)}
                data-testid="button-university-cta"
              >
                <Building2 className="h-5 w-5 mr-2" />
                I'm a University
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Student Auth Modal */}
      <StudentAuthModal 
        open={showStudentAuthModal} 
        onOpenChange={setShowStudentAuthModal}
      />

      {/* Institution Auth Modal */}
      <InstitutionAuthModal 
        open={showInstitutionAuthModal} 
        onOpenChange={setShowInstitutionAuthModal}
      />
    </PublicLayout>
  );
}
