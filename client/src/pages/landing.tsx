import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2, Users, Sparkles, TrendingUp, GraduationCap, Search, FileCheck, Filter, UserPlus, Calendar, ArrowRight, Quote, MapPin, Award, CheckCircle, MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import type { Course, University, Blog, Testimonial } from "@shared/schema";
import { TypingText } from "@/components/typing-text";
import { PublicLayout } from "@/components/public-layout";
import { NaturalLanguageSearch } from "@/components/natural-language-search";
import { DisciplineCards } from "@/components/discipline-cards";
import { CourseLevelCards } from "@/components/course-level-cards";

interface PlatformStats {
  institutionCount: number;
  courseCount: number;
}

type CourseWithUniversity = Course & { university?: University };

export default function Landing() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchType, setSearchType] = useState<"courses" | "institutions">("courses");
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [reviewIndex, setReviewIndex] = useState(0);

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

  // Fetch published testimonials from CMS
  const { data: cmsTestimonials = [] } = useQuery<Testimonial[]>({
    queryKey: ["/api/public/testimonials"],
  });

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

  // Featured student reviews - use CMS testimonials if available, fallback to static data
  const staticReviews = [
    {
      id: "static-1",
      title: "Dreams Turned Into Reality",
      content: "Studying abroad was always a dream of mine, but I didn't know how to make it a reality. ANZ Global Education made that dream come true. They guided me step-by-step—from career counseling and IELTS preparation to choosing a university and submitting my visa application.",
      studentName: "MD Areen Chowdhury",
      studentLocation: "Melbourne, Australia",
      institution: "Swinburne University",
      imageUrl: ""
    },
    {
      id: "static-2",
      title: "Genuine and Supportive Team",
      content: "ANZ Global Education really stands out because of their honesty and personal care. They didn't just treat me like another student—they listened, guided, and supported me like family. Whether it was choosing the right course, writing my SOP, or preparing for the visa interview, they were always one step ahead.",
      studentName: "AKM ERADAT HOSSAIN NILOY",
      studentLocation: "Melbourne, Australia",
      institution: "Victoria University",
      imageUrl: ""
    },
    {
      id: "static-3",
      title: "Support That Feels Like Family",
      content: "What really sets ANZ Global Education apart is how personal and supportive their team is. They treated me not just as a client, but as a member of their own family. I had doubts because my academic background wasn't perfect, but instead of discouraging me, they helped me present my story with honesty and strength.",
      studentName: "Nosin Anjum Promity",
      studentLocation: "Melbourne, Australia",
      institution: "Victoria University",
      imageUrl: ""
    }
  ];

  // Use CMS testimonials if available (limit to 3), otherwise fallback to static data
  const featuredReviews = cmsTestimonials.length > 0
    ? cmsTestimonials.slice(0, 3).map(t => ({
        id: t.id,
        title: t.title,
        content: t.content,
        studentName: t.studentName || "Anonymous Student",
        location: t.studentLocation || "",
        institution: t.institution || "",
        imageUrl: t.imageUrl || ""
      }))
    : staticReviews.map(t => ({
        id: t.id,
        title: t.title,
        content: t.content,
        studentName: t.studentName,
        location: t.studentLocation,
        institution: t.institution,
        imageUrl: t.imageUrl
      }));
  
  // Helper function to safely get initials from a name
  const getInitials = (name: string | null | undefined): string => {
    if (!name || name.trim() === "") return "??";
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  // SEO data
  const siteUrl = window.location.origin;
  const pageTitle = "ANZ Global Education - Connect Universities and Students Worldwide";
  const pageDescription = "AI-powered course discovery platform connecting universities and students worldwide. Find your perfect course with intelligent filtering and direct application system.";
  const ogImage = `${siteUrl}/og-image.png`;

  return (
    <PublicLayout>
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
      <section id="main-content" className="overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 py-20 md:py-32 text-white isolate -z-10">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl min-h-[120px] sm:min-h-[140px] md:min-h-[160px]">
              Find Your{" "}
              <TypingText 
                words={["Dream Course", "Perfect Institution", "Future Career"]}
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
              Connect with top institutions or discover your ideal course — our AI makes it simple
            </p>

            {/* Natural Language Search */}
            <div className="mx-auto max-w-4xl">
              <NaturalLanguageSearch />
            </div>
          </div>
        </div>
      </section>

      {/* Browse by Discipline Section */}
      <section className="py-20 md:py-32 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="mb-4 text-4xl font-bold text-foreground md:text-5xl">
              Browse Courses by Discipline
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Explore our wide range of programs across different disciplines
            </p>
          </div>
          
          <DisciplineCards />
        </div>
      </section>

      {/* Promotional Video Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjAuNSIgb3BhY2l0eT0iMC4xIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40"></div>
        
        <div className="container mx-auto px-4 relative">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6 border border-primary/20">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
              <span className="text-sm font-semibold">Watch Our Story</span>
            </div>
            <h2 className="mb-6 text-4xl font-bold text-foreground md:text-5xl lg:text-6xl">
              Your Journey to{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary/80 to-accent">
                Australia Starts Here
              </span>
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              See how we've helped thousands of students transform their dreams into reality
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-3 gap-8 items-start">
              {/* Stats Column */}
              <div className="lg:col-span-1 space-y-4">
                <Card className="border-primary/20 bg-card/50 backdrop-blur-sm hover-elevate">
                  <CardContent className="p-6 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-3xl font-bold text-foreground mb-1">5,000+</div>
                    <p className="text-sm text-muted-foreground">Students Guided</p>
                  </CardContent>
                </Card>
                
                <Card className="border-accent/20 bg-card/50 backdrop-blur-sm hover-elevate">
                  <CardContent className="p-6 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent/10 mb-4">
                      <GraduationCap className="h-6 w-6 text-accent" />
                    </div>
                    <div className="text-3xl font-bold text-foreground mb-1">40+</div>
                    <p className="text-sm text-muted-foreground">Partner Institutions</p>
                  </CardContent>
                </Card>
                
                <Card className="border-primary/20 bg-card/50 backdrop-blur-sm hover-elevate">
                  <CardContent className="p-6 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                      <Award className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-3xl font-bold text-foreground mb-1">98%</div>
                    <p className="text-sm text-muted-foreground">Success Rate</p>
                  </CardContent>
                </Card>
              </div>

              {/* Video Column */}
              <div className="lg:col-span-2">
                <div className="relative group">
                  {/* Glow Effect */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary via-accent to-primary rounded-2xl opacity-20 group-hover:opacity-30 blur-xl transition-opacity"></div>
                  
                  {/* Video Container */}
                  <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-card border border-border/50">
                    <div className="aspect-video">
                      <iframe
                        src="https://www.youtube.com/embed/pJSJAu4Piws"
                        title="Transform Your Study Experience in Australia from Bangladesh with ANZ Global Education"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="w-full h-full"
                        data-testid="video-promotional"
                      ></iframe>
                    </div>
                  </div>
                </div>

                {/* Benefits List */}
                <div className="mt-8 grid sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                      <CheckCircle className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">Expert Guidance</h4>
                      <p className="text-sm text-muted-foreground">Personalized support every step</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                      <CheckCircle className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">Visa Assistance</h4>
                      <p className="text-sm text-muted-foreground">Streamlined application process</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Section */}
            <div className="mt-12 text-center">
              <p className="text-muted-foreground mb-6 text-lg max-w-2xl mx-auto">
                Ready to begin your Australian education adventure?
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link href="/courses" data-testid="link-explore-courses-video">
                  <Button size="lg" className="gap-2 shadow-lg" data-testid="button-explore-courses-video">
                    <Search className="h-5 w-5" />
                    Explore Courses
                  </Button>
                </Link>
                <Link href="/contact" data-testid="link-contact-video">
                  <Button size="lg" variant="outline" className="gap-2" data-testid="button-contact-video">
                    <MessageCircle className="h-5 w-5" />
                    Talk to an Advisor
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Browse by Course Level Section */}
      <section className="py-20 md:py-32 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="mb-4 text-4xl font-bold text-foreground md:text-5xl">
              Browse by Qualification Level
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Find courses at your desired qualification level, from certificates to doctoral degrees
            </p>
          </div>
          
          <CourseLevelCards />
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

          {/* Dual CTA */}
          <div className="text-center mt-12">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button 
                asChild
                size="lg" 
                className="bg-primary hover:bg-primary/90 text-white px-8 py-6 text-lg"
                data-testid="button-student-get-started"
              >
                <Link href="/auth">
                  <GraduationCap className="mr-2 h-5 w-5" />
                  Start as a Student
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button 
                asChild
                size="lg" 
                variant="outline"
                className="px-8 py-6 text-lg"
                data-testid="button-institution-get-started"
              >
                <Link href="/auth">
                  <Building2 className="mr-2 h-5 w-5" />
                  Join as an Institution
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Join students and institutions building their futures together
            </p>
          </div>
        </div>
      </section>

      {/* For Institutions Section */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-card/50 to-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="mb-4 text-4xl font-bold text-foreground md:text-5xl">
              For Institutions: Expand Your Global Reach
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Connect with motivated students worldwide and streamline your admissions process
            </p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-3 max-w-6xl mx-auto">
            {/* Benefit 1 */}
            <Card className="relative overflow-hidden border-primary/20 hover-elevate group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full"></div>
              <CardHeader className="relative">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    1
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-2xl">Reach Quality Students</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Showcase your programs to motivated international students actively searching for their ideal institution. Our AI matches your courses with qualified candidates worldwide.
                </p>
              </CardContent>
            </Card>

            {/* Benefit 2 */}
            <Card className="relative overflow-hidden border-secondary/20 hover-elevate group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-secondary/10 to-transparent rounded-bl-full"></div>
              <CardHeader className="relative">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-secondary to-secondary/80 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    2
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileCheck className="h-6 w-6 text-secondary" />
                  </div>
                </div>
                <CardTitle className="text-2xl">Streamline Operations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Manage all applications from a centralized dashboard. Use AI-powered tools to generate course content, review applications faster, and reduce administrative workload.
                </p>
              </CardContent>
            </Card>

            {/* Benefit 3 */}
            <Card className="relative overflow-hidden border-accent/20 hover-elevate group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-accent/10 to-transparent rounded-bl-full"></div>
              <CardHeader className="relative">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    3
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <TrendingUp className="h-6 w-6 text-accent" />
                  </div>
                </div>
                <CardTitle className="text-2xl">Grow Your Enrollment</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Increase international student enrollment with better visibility and targeted marketing. Track application trends and optimize your recruitment strategy with data insights.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Institution CTA */}
          <div className="text-center mt-12">
            <Button 
              asChild
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-white px-8 py-6 text-lg"
              data-testid="button-institution-partner"
            >
              <Link href="/auth">
                <Building2 className="mr-2 h-5 w-5" />
                Partner with Us
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              Join leading institutions already growing their international presence
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
            <p className="text-lg text-muted-foreground">Connecting ambitious students with world-class institutions since 2017</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <Card className="border-card-border hover-elevate">
              <CardHeader>
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>For Institutions</CardTitle>
                <CardDescription>Reach qualified students globally and simplify admissions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <FileCheck className="h-4 w-4 mt-0.5 text-secondary" />
                  <span>Showcase your programs to motivated international students worldwide</span>
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
                  <span>Apply to multiple institutions and track everything in one place</span>
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
                  <span>Automated workflows reduce manual work for institutions and students</span>
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
                          loading="lazy"
                          width={400}
                          height={225}
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

      {/* Student Reviews Section - Compact Slider */}
      <section className="py-12 md:py-16 bg-blue-50 dark:bg-blue-950/20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                  <Quote className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold">Student Reviews</h2>
                  <p className="text-sm text-muted-foreground">Real stories from our students</p>
                </div>
              </div>
              <Link href="/student-reviews">
                <Button variant="ghost" size="sm" data-testid="button-view-all-reviews">
                  View All
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {featuredReviews.length > 0 && (
              <div>
                <div className="relative flex items-center gap-2">
                  {featuredReviews.length > 1 && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full bg-background shadow-md flex-shrink-0"
                      onClick={() => setReviewIndex((prev) => (prev === 0 ? featuredReviews.length - 1 : prev - 1))}
                      data-testid="button-review-prev"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <div className="flex-1 overflow-hidden">
                    <div 
                      className="flex transition-transform duration-300 ease-in-out"
                      style={{ transform: `translateX(-${reviewIndex * 100}%)` }}
                    >
                      {featuredReviews.map((review) => (
                        <div 
                          key={review.id} 
                          className="w-full flex-shrink-0"
                        >
                          <Card 
                            className="hover-elevate"
                            data-testid={`landing-review-card-${review.id}`}
                          >
                            <CardContent className="p-4 sm:p-5">
                              <div className="flex gap-3 sm:gap-4">
                                <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                                  {review.imageUrl ? (
                                    <AvatarImage src={review.imageUrl} alt={review.studentName} />
                                  ) : null}
                                  <AvatarFallback className="text-xs sm:text-sm">
                                    {getInitials(review.studentName)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="min-w-0 flex-1">
                                      <p className="font-semibold text-sm" data-testid={`text-review-student-${review.id}`}>
                                        {review.studentName}
                                      </p>
                                      <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                                        {review.location && (
                                          <span className="flex items-center gap-1">
                                            <MapPin className="h-3 w-3 flex-shrink-0" />
                                            <span className="break-words">{review.location}</span>
                                          </span>
                                        )}
                                        {review.institution && (
                                          <span className="break-words text-left">{review.institution}</span>
                                        )}
                                      </div>
                                    </div>
                                    <Quote className="h-5 w-5 text-primary/30 flex-shrink-0" />
                                  </div>
                                  <h3 className="font-medium text-sm mb-1" data-testid={`text-review-title-${review.id}`}>
                                    {review.title}
                                  </h3>
                                  <p className="text-muted-foreground text-sm line-clamp-2" data-testid={`text-review-content-${review.id}`}>
                                    {review.content}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      ))}
                    </div>
                  </div>

                  {featuredReviews.length > 1 && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full bg-background shadow-md flex-shrink-0"
                      onClick={() => setReviewIndex((prev) => (prev === featuredReviews.length - 1 ? 0 : prev + 1))}
                      data-testid="button-review-next"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {featuredReviews.length > 1 && (
                  <div className="flex justify-center gap-1.5 mt-4">
                    {featuredReviews.map((_, idx) => (
                      <button
                        key={idx}
                        className={`h-2 rounded-full transition-all ${
                          idx === reviewIndex ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                        }`}
                        onClick={() => setReviewIndex(idx)}
                        data-testid={`button-review-dot-${idx}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl rounded-3xl bg-gradient-to-br from-[#3465A5] via-[#2a5286] to-[#1e3a5f] p-8 md:p-12 relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative z-10 text-center">
              <h2 className="mb-4 text-2xl sm:text-3xl md:text-4xl font-bold text-white">Ready to Get Started?</h2>
              <p className="mb-8 text-base sm:text-lg text-white/85 max-w-2xl mx-auto">
                Whether you're a student seeking your ideal course or an institution looking to connect with qualified candidates, we're here to help
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                <Button 
                  asChild
                  size="lg" 
                  className="w-full sm:w-auto bg-white text-[#3465A5] hover:bg-white/90 font-semibold shadow-lg" 
                  data-testid="button-student-cta"
                >
                  <Link href="/auth">
                    <GraduationCap className="h-5 w-5 mr-2" />
                    I'm a Student
                  </Link>
                </Button>
                <Button 
                  asChild
                  size="lg" 
                  className="w-full sm:w-auto bg-[#FF5000] hover:bg-[#e64800] text-white font-semibold shadow-lg border-0" 
                  data-testid="button-institution-cta"
                >
                  <Link href="/auth">
                    <Building2 className="h-5 w-5 mr-2" />
                    I'm an Institution
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
}
