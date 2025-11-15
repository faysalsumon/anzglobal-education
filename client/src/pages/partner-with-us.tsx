import { useState } from "react";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Globe, 
  Users, 
  TrendingUp, 
  Shield, 
  MessageSquare, 
  GraduationCap,
  Building2,
  CheckCircle2,
  Sparkles,
  BarChart3,
  Zap,
  ArrowRight,
  Target,
  FileCheck
} from "lucide-react";
import { PublicLayout } from "@/components/public-layout";
import { InstitutionAuthModal } from "@/components/institution-auth-modal";
import { useQuery } from "@tanstack/react-query";

interface PlatformStats {
  institutionCount: number;
  courseCount: number;
}

export default function PartnerWithUs() {
  const [showInstitutionAuthModal, setShowInstitutionAuthModal] = useState(false);

  const { data: stats } = useQuery<PlatformStats>({
    queryKey: ["/api/platform/stats"],
  });

  const benefits = [
    {
      icon: Globe,
      title: "Global Digital Reach",
      description: "Connect with qualified international students across 80+ countries through our AI-powered platform—no geographic limitations, no additional cost.",
      gradient: "from-blue-500/10 to-blue-600/10",
      iconColor: "text-blue-600 dark:text-blue-400"
    },
    {
      icon: Users,
      title: "Diverse Student Pipeline",
      description: "Access a pre-qualified pool of international applicants. Our intelligent filtering ensures you receive applications from students who match your criteria.",
      gradient: "from-orange-500/10 to-orange-600/10",
      iconColor: "text-orange-600 dark:text-orange-400"
    },
    {
      icon: TrendingUp,
      title: "Multi-Channel Marketing",
      description: "Benefit from continuous promotion via Google Ads, social media, SEO, and content marketing—we act as your dedicated international recruitment channel.",
      gradient: "from-primary/10 to-primary/20",
      iconColor: "text-primary"
    },
    {
      icon: Shield,
      title: "Document Verification",
      description: "Every student application undergoes rigorous document verification before reaching you, reducing administrative burden and ensuring authenticity.",
      gradient: "from-green-500/10 to-green-600/10",
      iconColor: "text-green-600 dark:text-green-400"
    },
    {
      icon: Target,
      title: "Targeted Enrollment",
      description: "Set your enrollment targets by semester or year. Our platform actively connects you with the right number of qualified students to meet your goals.",
      gradient: "from-purple-500/10 to-purple-600/10",
      iconColor: "text-purple-600 dark:text-purple-400"
    },
    {
      icon: GraduationCap,
      title: "Expert Counselor Support",
      description: "Professional education counselors guide students through course selection, ensuring they choose programs aligned with their goals and qualifications.",
      gradient: "from-indigo-500/10 to-indigo-600/10",
      iconColor: "text-indigo-600 dark:text-indigo-400"
    },
  ];

  const platformFeatures = [
    {
      icon: BarChart3,
      title: "Real-Time Analytics",
      description: "Track application metrics, student engagement, and conversion rates through your personalized dashboard."
    },
    {
      icon: Zap,
      title: "Automated Workflows",
      description: "Streamline admissions with automated notifications, application tracking, and intelligent student matching."
    },
    {
      icon: FileCheck,
      title: "Quality Assurance",
      description: "AI-powered document verification and fraud detection ensure only legitimate applications reach your team."
    }
  ];

  // Partner logos - these would typically be stored in your assets or database
  const partnerLogos = [
    { name: "Leading Australian University", placeholder: true },
    { name: "International College", placeholder: true },
    { name: "Technical Institute", placeholder: true },
    { name: "Education Provider", placeholder: true },
    { name: "Global Academy", placeholder: true },
    { name: "Higher Education", placeholder: true },
    { name: "Professional Institute", placeholder: true },
    { name: "Australian College", placeholder: true },
  ];

  return (
    <PublicLayout>
      <Helmet>
        <title>Partner with ANZ Global Education - Expand Your International Reach</title>
        <meta 
          name="description" 
          content="Join 50+ leading institutions on ANZ Global Education's platform. Access qualified international students from 80+ countries with AI-powered matching, automated workflows, and comprehensive marketing support." 
        />
        <meta property="og:title" content="Partner with ANZ Global Education - Expand Your International Reach" />
        <meta 
          property="og:description" 
          content="Join 50+ leading institutions on ANZ Global Education's platform. Access qualified international students from 80+ countries with AI-powered matching and comprehensive support." 
        />
        <meta property="og:type" content="website" />
        <meta name="keywords" content="international student recruitment, education partnership, Australian universities, global student platform, institution partnership" />
      </Helmet>

      {/* Hero Section - Enhanced with modern gradient and platform positioning */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/90 py-20 md:py-28 lg:py-36">
        {/* Decorative background pattern */}
        <div className="absolute inset-0 bg-grid-white/5 bg-[size:30px_30px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/50 to-transparent" />
        
        <div className="container relative mx-auto px-4 md:px-6">
          <div className="max-w-5xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6 bg-white/10 text-white border-white/20 hover:bg-white/20" data-testid="tag-partnership">
              <Building2 className="h-3.5 w-3.5 mr-1.5" />
              Institutional Partnership Program
            </Badge>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-6 leading-tight" data-testid="heading-hero">
              Expand Your International Reach with ANZ Global
            </h1>
            
            <p className="text-lg md:text-xl lg:text-2xl text-white/90 mb-10 max-w-4xl mx-auto leading-relaxed">
              With over 1,100 institutions and 22,000 courses in Australia, finding the right international students can be overwhelming. Our AI-powered platform simplifies global recruitment for you.
            </p>
            
            {/* Stats showcase in hero */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10 max-w-3xl mx-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <div className="text-2xl md:text-3xl font-bold text-white">6+</div>
                <div className="text-sm text-white/80 mt-1">Years Experience</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <div className="text-2xl md:text-3xl font-bold text-white">{stats?.institutionCount || "50"}+</div>
                <div className="text-sm text-white/80 mt-1">Partner Institutions</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <div className="text-2xl md:text-3xl font-bold text-white">{stats?.courseCount || "500"}+</div>
                <div className="text-sm text-white/80 mt-1">Listed Courses</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <div className="text-2xl md:text-3xl font-bold text-white">80+</div>
                <div className="text-sm text-white/80 mt-1">Countries Reached</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                size="lg" 
                variant="secondary"
                onClick={() => setShowInstitutionAuthModal(true)}
                className="min-w-[240px] h-12 md:h-14 text-base md:text-lg font-semibold group"
                data-testid="button-register-institution"
              >
                Become a Partner
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => {
                  document.getElementById('benefits')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="min-w-[240px] h-12 md:h-14 text-base md:text-lg font-semibold bg-white/10 text-white border-white/30 hover:bg-white/20 hover:text-white backdrop-blur-sm"
                data-testid="button-learn-more"
              >
                Explore Benefits
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section - Redesigned with modern cards */}
      <section id="benefits" className="py-16 md:py-20 lg:py-28 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
            <Badge variant="outline" className="mb-4">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Partnership Benefits
            </Badge>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Benefits of Partnership with ANZ Global Education
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground">
              Join leading institutions across Australia and unlock the full potential of global student recruitment
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-7xl mx-auto">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <Card 
                  key={index} 
                  className={`hover-elevate border-border/50 bg-gradient-to-br ${benefit.gradient} group`}
                  data-testid={`benefit-card-${benefit.title.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <CardHeader className="space-y-4">
                    <div className={`w-12 h-12 rounded-lg bg-card flex items-center justify-center ${benefit.iconColor} shadow-sm group-hover:scale-110 transition-transform`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-xl mb-2">{benefit.title}</CardTitle>
                      <CardDescription className="text-base leading-relaxed">
                        {benefit.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Platform Features Section - NEW */}
      <section className="py-16 md:py-20 lg:py-28 bg-card">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12 md:mb-16">
              <Badge variant="outline" className="mb-4">
                <Zap className="h-3.5 w-3.5 mr-1.5" />
                Platform Technology
              </Badge>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
                Powered by Advanced Technology
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                Our platform combines artificial intelligence, automation, and data analytics to deliver measurable results for your institution
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-12">
              {platformFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Card key={index} className="hover-elevate" data-testid={`platform-feature-${index}`}>
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-lg bg-accent/10">
                          <Icon className="h-6 w-6 text-accent" />
                        </div>
                        <div>
                          <CardTitle className="text-lg mb-2">{feature.title}</CardTitle>
                          <CardDescription className="text-sm leading-relaxed">
                            {feature.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>

            {/* Platform value proposition */}
            <div className="bg-gradient-to-br from-primary/5 to-accent/5 p-8 md:p-10 rounded-xl border border-border/50">
              <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-6 text-center">
                What You Get When You Partner
              </h3>
              <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                {[
                  "AI-powered student matching and qualification assessment",
                  "Automated application workflows and status tracking",
                  "Comprehensive document verification and fraud detection",
                  "Multi-channel marketing across Google, social media, and SEO",
                  "Dedicated education counselor support for student guidance",
                  "Real-time analytics dashboard for enrollment insights",
                  "Complete control over course listings and admissions criteria",
                  "24/7 platform access with mobile-responsive interface",
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground text-sm md:text-base">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted Partners Section - NEW */}
      <section className="py-16 md:py-20 lg:py-28 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
                Trusted by Leading Institutions Across Australia
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground">
                Throughout our six-year journey, we have successfully collaborated with leading institutions across Australia. Join our diverse community of international education providers.
              </p>
            </div>

            {/* Partner logos grid - placeholder styling */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mb-12">
              {partnerLogos.map((partner, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-center p-6 bg-card rounded-lg border border-border/50 hover-elevate h-24"
                  data-testid={`partner-logo-${index}`}
                >
                  <div className="text-center">
                    <Building2 className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-xs text-muted-foreground/60">{partner.name}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center">
              <Button 
                size="lg"
                onClick={() => setShowInstitutionAuthModal(true)}
                className="min-w-[280px]"
                data-testid="button-join-partners"
              >
                Join Our Partner Network
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition Section */}
      <section className="py-16 md:py-20 lg:py-28 bg-card">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4">
                <Target className="h-3.5 w-3.5 mr-1.5" />
                We Diversify Your Reach
              </Badge>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
                Adding Value to International Education
              </h2>
            </div>
            
            <div className="space-y-6 mb-12 text-center md:text-left">
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground">We understand international student recruitment.</span> Our platform provides a comprehensive digital marketplace where prospective students from around the world can discover and compare courses from leading Australian institutions.
              </p>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                This creates an <span className="font-semibold text-foreground">unprecedented opportunity</span> to expand your reach by connecting with motivated students who have all the information they need to make informed decisions about joining your institution.
              </p>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                Join us in <span className="font-semibold text-foreground">transforming international education delivery</span> and become part of Australia's most innovative student recruitment platform.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 md:py-24 lg:py-32 bg-gradient-to-br from-primary via-primary/95 to-accent relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/5 bg-[size:30px_30px]" />
        <div className="container relative mx-auto px-4 md:px-6">
          <div className="max-w-4xl mx-auto text-center text-white">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Ready to Transform Your International Recruitment?
            </h2>
            <p className="text-lg md:text-xl mb-10 opacity-90 max-w-2xl mx-auto">
              Join the ANZ Global Education platform today and gain immediate access to qualified international students from 80+ countries worldwide.
            </p>
            <Button 
              size="lg" 
              variant="secondary"
              onClick={() => setShowInstitutionAuthModal(true)}
              className="min-w-[280px] h-14 text-lg font-semibold"
              data-testid="button-register-cta-bottom"
            >
              Become a Partner Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Institution Auth Modal */}
      <InstitutionAuthModal 
        open={showInstitutionAuthModal} 
        onOpenChange={setShowInstitutionAuthModal}
      />
    </PublicLayout>
  );
}
