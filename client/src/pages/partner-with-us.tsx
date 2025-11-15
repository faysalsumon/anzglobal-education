import { useState } from "react";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Globe, 
  Users, 
  TrendingUp, 
  Shield, 
  MessageSquare, 
  GraduationCap,
  Building2,
  CheckCircle2
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
      title: "Digital Reach",
      description: "Our digital platform helps you reach students in any country worldwide without any cost.",
      color: "text-primary"
    },
    {
      icon: Users,
      title: "Diverse Students",
      description: "We help you filter applications and find the most diverse and qualified students for your institution.",
      color: "text-primary"
    },
    {
      icon: TrendingUp,
      title: "Promotional Channel",
      description: "From Google Ads to Social Media, we promote continuously, acting as a promotional channel for you.",
      color: "text-primary"
    },
    {
      icon: Shield,
      title: "Verified Students",
      description: "We verify the documents of each student before sending their applications for your approval.",
      color: "text-primary"
    },
    {
      icon: MessageSquare,
      title: "Increased Enquiries",
      description: "Partner with ANZ Global to get the number of students you require for a particular semester or year.",
      color: "text-primary"
    },
    {
      icon: GraduationCap,
      title: "Qualified Counsellors",
      description: "We have qualified counsellors who guide students to choose the right programs from your institution.",
      color: "text-primary"
    },
  ];

  const achievements = [
    { label: "Years of Experience", value: "6+" },
    { label: "Partner Institutions", value: stats?.institutionCount.toString() || "50+" },
    { label: "Available Courses", value: stats?.courseCount.toString() || "500+" },
    { label: "Countries Reached", value: "80+" },
  ];

  return (
    <PublicLayout>
      <Helmet>
        <title>Partner with Us - ANZ Global Education</title>
        <meta 
          name="description" 
          content="Expand your international reach with ANZ Global Education. Connect with qualified international students worldwide through our digital platform. Join leading institutions in Australia." 
        />
        <meta property="og:title" content="Partner with Us - ANZ Global Education" />
        <meta 
          property="og:description" 
          content="Expand your international reach with ANZ Global Education. Connect with qualified international students worldwide through our digital platform." 
        />
        <meta property="og:type" content="website" />
      </Helmet>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/10 via-background to-accent/5 py-16 md:py-24 lg:py-32">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6" data-testid="tag-partnership">
              <Building2 className="h-4 w-4" />
              <span>Institutional Partnership Program</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6" data-testid="heading-hero">
              Expand Your International Reach with ANZ Global
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              There are over 1,100 institutions and 22,000 courses in Australia. Finding the right students for your institution can be overwhelming, but our partnership with ANZ Global Education can simplify it for you.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                size="lg" 
                onClick={() => setShowInstitutionAuthModal(true)}
                className="min-w-[200px]"
                data-testid="button-register-institution"
              >
                Register Your Institution Today
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => {
                  document.getElementById('benefits')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="min-w-[200px]"
                data-testid="button-learn-more"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 md:py-16 bg-card">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {achievements.map((achievement, index) => (
              <div key={index} className="text-center" data-testid={`stat-${achievement.label.toLowerCase().replace(/\s+/g, "-")}`}>
                <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                  {achievement.value}
                </div>
                <div className="text-sm md:text-base text-muted-foreground">
                  {achievement.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Benefits of Partnership with ANZ Global Education
            </h2>
            <p className="text-lg text-muted-foreground">
              Join leading institutions in Australia and unlock the power of global student recruitment
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <Card key={index} className="hover-elevate" data-testid={`benefit-card-${benefit.title.toLowerCase().replace(/\s+/g, "-")}`}>
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg bg-primary/10 ${benefit.color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-xl mb-2">{benefit.title}</CardTitle>
                        <CardDescription className="text-base leading-relaxed">
                          {benefit.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Partner Section */}
      <section className="py-16 md:py-24 bg-card">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
              Adding Value to the Industry
            </h2>
            
            <div className="space-y-6 mb-12">
              <p className="text-lg text-muted-foreground leading-relaxed">
                We know how international student recruitment works. We are delighted to offer our platform where potential students can explore all the courses available from different providers.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                This platform will be an incredible opportunity to reach more students by providing them with all the information they require before they make the decision of joining your institute.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                This is truly an incredible opportunity to change the way we deliver our services to potential students, and we want your institute to be a part of this.
              </p>
            </div>

            <div className="bg-background p-6 md:p-8 rounded-lg border">
              <h3 className="text-xl font-semibold text-foreground mb-4">
                What You Get When You Partner:
              </h3>
              <ul className="space-y-3">
                {[
                  "Global digital presence reaching students worldwide",
                  "AI-powered student matching and application filtering",
                  "Verified document screening before applications reach you",
                  "Continuous marketing promotion across multiple channels",
                  "Professional counsellor support for student guidance",
                  "Complete control over your courses and admissions",
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-primary to-primary/80">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl mx-auto text-center text-primary-foreground">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Become a Partner Today
            </h2>
            <p className="text-lg md:text-xl mb-8 opacity-90">
              Join hands with the team of ANZ Global Education and get access to millions of students worldwide
            </p>
            <Button 
              size="lg" 
              variant="secondary"
              onClick={() => setShowInstitutionAuthModal(true)}
              className="min-w-[250px]"
              data-testid="button-register-cta-bottom"
            >
              Register Your Institution Today
            </Button>
            <p className="mt-6 text-sm opacity-75">
              Questions? Contact us at{" "}
              <a href="mailto:partners@anzglobal.com.au" className="underline hover:no-underline">
                partners@anzglobal.com.au
              </a>
            </p>
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
