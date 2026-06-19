import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  GraduationCap,
  Globe,
  Users,
  FileCheck,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  Target,
  Shield,
  Award
} from "lucide-react";
import { PublicLayout } from "@/components/public-layout";
import { useQuery } from "@tanstack/react-query";
import heroImage from "@assets/stock_images/diverse_internationa_09386d83.jpg";
import successImage from "@assets/stock_images/student_success_cele_a3674b15.jpg";
import campusImage from "@assets/stock_images/university_campus_st_8fa8bceb.jpg";

interface PlatformStats {
  institutionCount: number;
  courseCount: number;
}

export default function StudyInAustralia() {
  const { data: _stats } = useQuery<PlatformStats>({
    queryKey: ["/api/platform/stats"],
  });

  const benefits = [
    {
      icon: Globe,
      title: "1,100+ Institutions",
      description: "Access Australia's complete education landscape in one platform. From world-renowned universities to specialized colleges.",
      gradient: "from-blue-500/10 to-blue-600/10",
      iconColor: "text-blue-600 dark:text-blue-400"
    },
    {
      icon: BookOpen,
      title: "22,000+ Courses",
      description: "Discover programs across all disciplines. Whether you're pursuing undergraduate, postgraduate, or vocational studies—we've got you covered.",
      gradient: "from-accent/10 to-accent/20",
      iconColor: "text-accent dark:text-accent"
    },
    {
      icon: Target,
      title: "AI-Powered Matching",
      description: "Our intelligent system understands your goals, qualifications, and preferences to recommend courses that truly fit your aspirations.",
      gradient: "from-primary/10 to-primary/20",
      iconColor: "text-primary"
    },
    {
      icon: Shield,
      title: "Expert Guidance",
      description: "Free counseling from experienced education consultants who've helped thousands of international students navigate Australian education.",
      gradient: "from-green-500/10 to-green-600/10",
      iconColor: "text-green-600 dark:text-green-400"
    },
    {
      icon: FileCheck,
      title: "Simplified Applications",
      description: "Apply to multiple institutions with a single profile. Track all your applications in one dashboard—no more juggling multiple portals.",
      gradient: "from-purple-500/10 to-purple-600/10",
      iconColor: "text-purple-600 dark:text-purple-400"
    },
    {
      icon: Award,
      title: "Scholarship Finder",
      description: "Automatically discover scholarship opportunities that match your profile. We help you find funding you might have missed.",
      gradient: "from-indigo-500/10 to-indigo-600/10",
      iconColor: "text-indigo-600 dark:text-indigo-400"
    },
  ];

  const howItWorks = [
    {
      step: "01",
      title: "Create Your Profile",
      description: "Sign up in minutes using your Google or social accounts. Complete your academic background and study preferences.",
      icon: UserPlus
    },
    {
      step: "02",
      title: "Discover Courses",
      description: "Browse personalized course recommendations or use advanced filters to find your perfect program across Australia.",
      icon: Search
    },
    {
      step: "03",
      title: "Apply & Track",
      description: "Submit applications to multiple institutions from your dashboard. Get real-time updates and expert support throughout your journey.",
      icon: FileCheck
    }
  ];

  const popularCategories = [
    { title: "Engineering & IT", count: "3,500+ courses", color: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
    { title: "Business & Management", count: "4,200+ courses", color: "bg-accent/10 text-accent-foreground dark:text-accent" },
    { title: "Health Sciences", count: "2,800+ courses", color: "bg-green-500/10 text-green-700 dark:text-green-400" },
    { title: "Creative Arts", count: "1,900+ courses", color: "bg-purple-500/10 text-purple-700 dark:text-purple-400" },
    { title: "Education & Teaching", count: "1,500+ courses", color: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400" },
    { title: "Law & Social Sciences", count: "2,100+ courses", color: "bg-pink-500/10 text-pink-700 dark:text-pink-400" },
  ];

  const testimonials = [
    {
      name: "Priya Sharma",
      country: "India",
      course: "Master of Data Science",
      quote: "ANZ Global made the entire process so simple. I found my course in a week, applied through the platform, and got accepted within a month. The counselors were incredibly supportive!",
      initial: "P"
    },
    {
      name: "Ahmed Hassan",
      country: "Egypt",
      course: "Bachelor of Engineering",
      quote: "As an international student, I was overwhelmed by options. The AI matching system helped me discover programs I never knew existed. Now I'm studying at my dream university!",
      initial: "A"
    },
    {
      name: "Maria Santos",
      country: "Philippines",
      course: "Diploma in Nursing",
      quote: "The platform showed me scholarship opportunities I wouldn't have found on my own. I saved thousands of dollars and the application process was incredibly smooth.",
      initial: "M"
    }
  ];

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const pageUrl = `${siteUrl}/study-in-australia`;

  return (
    <PublicLayout>
      <Helmet>
        <title>Study in Australia - Built by International Students for International Students | ANZ Global Education</title>
        <meta 
          name="description" 
          content="Discover 22,000+ courses across 1,100+ Australian institutions. Built by international students who understand your journey. Get AI-powered course matching, expert guidance, and simplified applications." 
        />
        
        {/* Open Graph / Facebook */}
        <meta property="og:title" content="Study in Australia - Built by International Students for International Students" />
        <meta 
          property="og:description" 
          content="Your complete guide to studying in Australia. 22,000+ courses, 1,100+ institutions, AI-powered matching, and expert support from people who've been in your shoes." 
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content={`${siteUrl}${heroImage}`} />
        <meta property="og:site_name" content="ANZ Global Education" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Study in Australia - Built by International Students for International Students" />
        <meta name="twitter:description" content="Your complete guide to studying in Australia. 22,000+ courses, 1,100+ institutions, AI-powered matching, and expert support." />
        <meta name="twitter:image" content={`${siteUrl}${heroImage}`} />
        
        <meta name="keywords" content="study in Australia, international students Australia, Australian universities, study abroad Australia, courses in Australia, education Australia, student visa Australia, international education" />
        <link rel="canonical" href={pageUrl} />
        
        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Study in Australia",
            "description": "Discover 22,000+ courses across 1,100+ Australian institutions. Built by international students who understand your journey.",
            "url": pageUrl,
            "provider": {
              "@type": "EducationalOrganization",
              "name": "ANZ Global Education",
              "description": "Built by international students, for international students",
              "url": siteUrl,
              "address": {
                "@type": "PostalAddress",
                "addressCountry": "AU"
              }
            },
            "about": {
              "@type": "EducationalOccupationalProgram",
              "name": "Study in Australia Programs",
              "description": "Access to 1,100+ institutions and 22,000+ courses across Australia",
              "provider": {
                "@type": "EducationalOrganization",
                "name": "ANZ Global Education"
              },
              "educationalCredentialAwarded": "Various (Undergraduate, Postgraduate, Vocational)",
              "numberOfCredits": "22000+ courses available"
            },
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "AUD",
              "description": "100% free service for students"
            }
          })}
        </script>
      </Helmet>

      {/* Hero Section with Background Image */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/90 py-20 md:py-28 lg:py-36">
        {/* Hero Background Image with Overlay */}
        <div 
          className="absolute inset-0 opacity-10 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/85 to-primary/80" />
        
        <div className="container relative mx-auto px-4 md:px-6">
          <div className="max-w-5xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6 bg-white/10 text-white border-white/20 hover:bg-white/20" data-testid="tag-student">
              <GraduationCap className="h-3.5 w-3.5 mr-1.5" />
              Your Gateway to Australian Education
            </Badge>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-6 leading-tight" data-testid="heading-hero">
              Study in Australia
            </h1>
            
            <p className="text-2xl md:text-3xl lg:text-4xl font-semibold text-white/95 mb-4 leading-tight">
              Built by international students,
              <br />
              for international students
            </p>
            
            <p className="text-lg md:text-xl text-white/90 mb-10 max-w-3xl mx-auto leading-relaxed">
              We've navigated the Australian education system firsthand—from visa applications to finding the perfect course. Now we're here to make your journey smoother.
            </p>
            
            {/* Stats showcase in hero */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10 max-w-3xl mx-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <div className="text-2xl md:text-3xl font-bold text-white">1,100+</div>
                <div className="text-sm text-white/80 mt-1">Institutions</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <div className="text-2xl md:text-3xl font-bold text-white">22,000+</div>
                <div className="text-sm text-white/80 mt-1">Courses</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <div className="text-2xl md:text-3xl font-bold text-white">100%</div>
                <div className="text-sm text-white/80 mt-1">Free Service</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <div className="text-2xl md:text-3xl font-bold text-white">24/7</div>
                <div className="text-sm text-white/80 mt-1">Expert Support</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                size="lg" 
                variant="secondary"
                onClick={() => { window.location.href = '/auth'; }}
                className="w-full sm:w-auto min-h-12 px-8 text-base group hover-elevate active-elevate-2"
                data-testid="button-register-hero"
              >
                <span>Start Your Journey</span>
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                asChild
                className="w-full sm:w-auto min-h-12 px-8 text-base border-white/30 text-white hover:bg-white/10 backdrop-blur-sm"
                data-testid="button-browse-courses"
              >
                <a href="/courses">
                  Browse Courses
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Simplifying Admission Process Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4" data-testid="heading-admission">
                SIMPLIFYING YOUR ADMISSION PROCESS
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                Admission Process with ANZ Global Education covers 1,100 institutions and 22,000 courses in Australia. Finding the right course can be overwhelming, but we can simplify it for you.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 items-center mb-12">
              <div className="order-2 md:order-1">
                <img 
                  src={campusImage} 
                  alt="Students on Australian university campus" 
                  className="rounded-lg shadow-lg w-full h-auto"
                />
              </div>
              <div className="order-1 md:order-2 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Comprehensive Database</h3>
                    <p className="text-muted-foreground">Access every accredited institution and course in Australia, updated in real-time.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Intelligent Filtering</h3>
                    <p className="text-muted-foreground">Find courses that match your budget, qualifications, and career goals in seconds.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">End-to-End Support</h3>
                    <p className="text-muted-foreground">From course discovery to enrollment, we guide you every step of the way.</p>
                  </div>
                </div>
                <Button 
                  size="lg"
                  onClick={() => { window.location.href = '/auth'; }}
                  className="mt-6 group"
                  data-testid="button-register-admission"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose ANZ Section */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4" data-testid="heading-why-choose">
                Why Choose ANZ Global Education?
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                We're not just a platform—we're your partners in this journey because we've lived it ourselves.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <Card key={index} className="hover-elevate" data-testid={`card-benefit-${index}`}>
                    <CardHeader>
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${benefit.gradient} flex items-center justify-center mb-4`}>
                        <Icon className={`h-6 w-6 ${benefit.iconColor}`} />
                      </div>
                      <CardTitle className="text-xl">{benefit.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-base">
                        {benefit.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4" data-testid="heading-how-it-works">
                How It Works
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                Your journey to studying in Australia starts here—simple, fast, and completely free.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 md:gap-12">
              {howItWorks.map((step, stepIdx) => {
                const _Icon = step.icon;
                return (
                  <div key={stepIdx} className="relative text-center" data-testid={`step-${stepIdx}`}>
                    {stepIdx < howItWorks.length - 1 && (
                      <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/50 to-primary/20" />
                    )}
                    <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary text-white text-2xl font-bold mb-6">
                      {step.step}
                    </div>
                    <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </div>
                );
              })}
            </div>

            <div className="text-center mt-12">
              <Button 
                size="lg"
                onClick={() => { window.location.href = '/auth'; }}
                className="group"
                data-testid="button-register-how-it-works"
              >
                Create Free Account
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Course Categories */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4" data-testid="heading-popular-courses">
                Explore Popular Study Areas
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                From technology to healthcare, find programs across every discipline.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {popularCategories.map((category, index) => (
                <Card key={index} className="hover-elevate cursor-pointer" data-testid={`category-${index}`}>
                  <CardHeader>
                    <CardTitle className="text-lg">{category.title}</CardTitle>
                    <Badge className={category.color} variant="secondary">
                      {category.count}
                    </Badge>
                  </CardHeader>
                </Card>
              ))}
            </div>

            <div className="text-center mt-10">
              <Button 
                size="lg"
                variant="outline"
                asChild
                data-testid="button-view-all-courses"
              >
                <a href="/courses">
                  View All Courses
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Success Stories / Testimonials */}
      <section className="py-16 md:py-24 bg-background relative overflow-hidden">
        <div 
          className="absolute inset-0 opacity-5 bg-cover bg-center"
          style={{ backgroundImage: `url(${successImage})` }}
        />
        <div className="container relative mx-auto px-4 md:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4" data-testid="heading-testimonials">
                Success Stories
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                Join thousands of international students who found their path through ANZ Global Education.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 md:gap-8">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="hover-elevate" data-testid={`testimonial-${index}`}>
                  <CardHeader>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                        {testimonial.initial}
                      </div>
                      <div>
                        <div className="font-semibold">{testimonial.name}</div>
                        <div className="text-sm text-muted-foreground">{testimonial.country}</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground italic mb-4">"{testimonial.quote}"</p>
                    <Badge variant="secondary" className="text-xs">
                      {testimonial.course}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-primary via-primary/95 to-primary/90 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/5 bg-[size:30px_30px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/50 to-transparent" />
        
        <div className="container relative mx-auto px-4 md:px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6" data-testid="heading-final-cta">
              Ready to Start Your Australian Education Journey?
            </h2>
            <p className="text-lg md:text-xl text-white/90 mb-10 max-w-2xl mx-auto">
              Join thousands of international students who trust ANZ Global Education. Create your free account and discover your perfect course today.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                size="lg" 
                variant="secondary"
                onClick={() => { window.location.href = '/auth'; }}
                className="w-full sm:w-auto min-h-12 px-8 text-base group hover-elevate active-elevate-2"
                data-testid="button-register-final"
              >
                <span>Create Free Account</span>
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                asChild
                className="w-full sm:w-auto min-h-12 px-8 text-base border-white/30 text-white hover:bg-white/10 backdrop-blur-sm"
                data-testid="button-contact-counselor"
              >
                <a href="/contact?topic=counseling">
                  Talk to a Counselor
                </a>
              </Button>
            </div>

            <p className="text-sm text-white/70 mt-8">
              100% Free • No Hidden Fees • Expert Support
            </p>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
}

// Helper icon components (defined inline since they're simple)
function UserPlus({ className }: { className?: string }) {
  return <Users className={className} />;
}

function Search({ className }: { className?: string }) {
  return <Globe className={className} />;
}
