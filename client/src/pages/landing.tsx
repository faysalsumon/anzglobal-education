import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Building2, Users, Sparkles, TrendingUp, GraduationCap, Search, FileCheck, Filter, UserPlus, Calendar, ArrowRight, Quote, MapPin } from "lucide-react";
import { Link } from "wouter";
import type { Course, University, Blog } from "@shared/schema";
import { StudentAuthModal } from "@/components/student-auth-modal";
import { InstitutionAuthModal } from "@/components/institution-auth-modal";
import { TypingText } from "@/components/typing-text";
import { PublicLayout } from "@/components/public-layout";
import { NaturalLanguageSearch } from "@/components/natural-language-search";

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

  // Featured student reviews
  const featuredReviews = [
    {
      id: 1,
      title: "Dreams Turned Into Reality",
      content: "Studying abroad was always a dream of mine, but I didn't know how to make it a reality. ANZ Global Education made that dream come true. They guided me step-by-step—from career counseling and IELTS preparation to choosing a university and submitting my visa application.",
      studentName: "MD Areen Chowdhury",
      location: "Melbourne, Australia",
      institution: "Swinburne University"
    },
    {
      id: 2,
      title: "Genuine and Supportive Team",
      content: "ANZ Global Education really stands out because of their honesty and personal care. They didn't just treat me like another student—they listened, guided, and supported me like family. Whether it was choosing the right course, writing my SOP, or preparing for the visa interview, they were always one step ahead.",
      studentName: "AKM ERADAT HOSSAIN NILOY",
      location: "Melbourne, Australia",
      institution: "Victoria University"
    },
    {
      id: 3,
      title: "Support That Feels Like Family",
      content: "What really sets ANZ Global Education apart is how personal and supportive their team is. They treated me not just as a client, but as a member of their own family. I had doubts because my academic background wasn't perfect, but instead of discouraging me, they helped me present my story with honesty and strength.",
      studentName: "Nosin Anjum Promity",
      location: "Melbourne, Australia",
      institution: "Victoria University"
    }
  ];

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
            <p className="mb-12 text-lg text-white sm:text-xl max-w-2xl mx-auto font-medium">
              Connect with top universities or discover your ideal course — our AI makes it simple
            </p>

            {/* Natural Language Search */}
            <div className="mx-auto max-w-4xl">
              <NaturalLanguageSearch />
            </div>
          </div>
        </div>
      </section>

      {/* Your Journey Starts Here */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-background to-card/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="mb-4 text-4xl font-bold text-foreground md:text-5xl">
              For Students: Your Path to Success
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Three simple steps to find your perfect course and start your international education journey
            </p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-3 max-w-6xl mx-auto">
            {/* Step 1 */}
            <Card className="relative overflow-hidden border-primary/20 hover-elevate group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full"></div>
              <CardHeader className="relative">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    1
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Search className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-2xl">Discover & Filter</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Tell our AI what you're looking for in plain language. Get instant, personalized course recommendations that match your goals, budget, and career aspirations.
                </p>
              </CardContent>
            </Card>

            {/* Step 2 */}
            <Card className="relative overflow-hidden border-secondary/20 hover-elevate group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-secondary/10 to-transparent rounded-bl-full"></div>
              <CardHeader className="relative">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-secondary to-secondary/80 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    2
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <GraduationCap className="h-6 w-6 text-secondary" />
                  </div>
                </div>
                <CardTitle className="text-2xl">Compare & Choose</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Review detailed course information, compare scholarships, explore career pathways, and read real student reviews. Make confident decisions about your education.
                </p>
              </CardContent>
            </Card>

            {/* Step 3 */}
            <Card className="relative overflow-hidden border-accent/20 hover-elevate group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-accent/10 to-transparent rounded-bl-full"></div>
              <CardHeader className="relative">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    3
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ArrowRight className="h-6 w-6 text-accent" />
                  </div>
                </div>
                <CardTitle className="text-2xl">Apply with Ease</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Apply directly through our platform with expert guidance. Track your application status in real-time and get personalized support from our experienced counselors.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* CTA */}
          <div className="text-center mt-12">
            <Button 
              size="lg" 
              onClick={() => setShowStudentAuthModal(true)}
              className="bg-primary hover:bg-primary/90 text-white px-8 py-6 text-lg"
              data-testid="button-get-started"
            >
              Get Started Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              Join thousands of students already on their journey
            </p>
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
            <p className="text-lg text-muted-foreground">Connecting ambitious students with world-class universities since 2017</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <Card className="border-card-border hover-elevate">
              <CardHeader>
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>For Universities</CardTitle>
                <CardDescription>Reach qualified students globally and simplify admissions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <FileCheck className="h-4 w-4 mt-0.5 text-secondary" />
                  <span>Showcase your programs to thousands of motivated international students</span>
                </div>
                <div className="flex items-start gap-2">
                  <FileCheck className="h-4 w-4 mt-0.5 text-secondary" />
                  <span>Streamline application review with centralized dashboard and AI tools</span>
                </div>
                <div className="flex items-start gap-2">
                  <FileCheck className="h-4 w-4 mt-0.5 text-secondary" />
                  <span>Reduce administrative burden with automated content generation</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-card-border hover-elevate">
              <CardHeader>
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10">
                  <Users className="h-6 w-6 text-secondary" />
                </div>
                <CardTitle>For Students</CardTitle>
                <CardDescription>Discover courses that match your goals and budget</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <FileCheck className="h-4 w-4 mt-0.5 text-secondary" />
                  <span>Get personalized course matches based on your career goals and preferences</span>
                </div>
                <div className="flex items-start gap-2">
                  <FileCheck className="h-4 w-4 mt-0.5 text-secondary" />
                  <span>Build your profile with AI assistance and expert counselor support</span>
                </div>
                <div className="flex items-start gap-2">
                  <FileCheck className="h-4 w-4 mt-0.5 text-secondary" />
                  <span>Apply to multiple universities and track everything in one place</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-card-border hover-elevate">
              <CardHeader>
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                  <Sparkles className="h-6 w-6 text-accent" />
                </div>
                <CardTitle>AI-Powered Platform</CardTitle>
                <CardDescription>Smart technology that saves time and improves outcomes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <FileCheck className="h-4 w-4 mt-0.5 text-secondary" />
                  <span>Natural language search understands what you're really looking for</span>
                </div>
                <div className="flex items-start gap-2">
                  <FileCheck className="h-4 w-4 mt-0.5 text-secondary" />
                  <span>Intelligent matching connects students with their best-fit programs</span>
                </div>
                <div className="flex items-start gap-2">
                  <FileCheck className="h-4 w-4 mt-0.5 text-secondary" />
                  <span>Automated workflows reduce manual work for universities and students</span>
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

      {/* Student Reviews Section */}
      <section className="py-16 md:py-24 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Quote className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Trusted by Students Worldwide
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Real stories from students who turned their Australian education dreams into reality
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {featuredReviews.map((review) => (
                <Card 
                  key={review.id} 
                  className="hover-elevate h-full"
                  data-testid={`landing-review-card-${review.id}`}
                >
                  <CardContent className="p-6 flex flex-col h-full">
                    <Quote className="h-8 w-8 text-primary/30 mb-4" />
                    <h3 className="text-lg font-bold mb-3" data-testid={`text-review-title-${review.id}`}>
                      {review.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-4 flex-1" data-testid={`text-review-content-${review.id}`}>
                      {review.content}
                    </p>
                    <div className="border-t pt-4 space-y-2">
                      <p className="font-semibold text-sm" data-testid={`text-review-student-${review.id}`}>
                        {review.studentName}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{review.location}</span>
                      </div>
                      <p className="text-xs text-muted-foreground" data-testid={`text-review-institution-${review.id}`}>
                        {review.institution}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center">
              <Link href="/student-reviews">
                <Button variant="outline" size="lg" data-testid="button-view-all-reviews">
                  View All Student Reviews
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl rounded-2xl bg-gradient-to-r from-primary to-secondary p-8 text-center text-white md:p-12">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">Ready to Get Started?</h2>
            <p className="mb-8 text-lg opacity-90">
              Whether you're a student seeking your ideal course or a university looking to connect with qualified candidates, we're here to help
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
