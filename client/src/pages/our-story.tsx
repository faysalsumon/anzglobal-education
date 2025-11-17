import { Helmet } from "react-helmet";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { 
  GraduationCap, 
  Globe, 
  Heart, 
  Target, 
  Users, 
  TrendingUp,
  Sparkles,
  Award,
  MapPin
} from "lucide-react";

export default function OurStory() {
  const [, setLocation] = useLocation();

  return (
    <>
      <Helmet>
        <title>Our Story - ANZ Global Education</title>
        <meta 
          name="description" 
          content="Learn about ANZ Global Education's mission to connect international students with world-class Australian universities. Discover our journey, values, and commitment to transforming global education." 
        />
        <meta property="og:title" content="Our Story - ANZ Global Education" />
        <meta property="og:description" content="Transforming global education by connecting ambitious students with world-class Australian universities through AI-powered technology and personalized support." />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-primary via-primary/95 to-secondary py-20 md:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm mb-6 border border-white/20">
                <Heart className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                Our Story
              </h1>
              <p className="text-xl md:text-2xl text-white/90 font-medium">
                Bridging dreams and destinations through education
              </p>
            </div>
          </div>
        </section>

        {/* Mission Statement */}
        <section className="py-16 md:py-24 bg-card/50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <Card className="border-primary/20 bg-gradient-to-br from-card to-card/50">
                <CardContent className="p-8 md:p-12">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Target className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                        Our Mission
                      </h2>
                      <p className="text-lg text-muted-foreground leading-relaxed">
                        To democratize access to world-class Australian education by empowering international students 
                        with intelligent tools, transparent information, and personalized support throughout their 
                        educational journey.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* The Journey */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                The Journey That Started It All
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Every great story begins with a vision and a commitment to make a difference
              </p>
            </div>

            <div className="max-w-5xl mx-auto space-y-12">
              {/* Story Timeline */}
              <div className="grid md:grid-cols-2 gap-8">
                <Card className="border-primary/20 hover-elevate">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                        <Sparkles className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">
                          The Vision
                        </h3>
                        <p className="text-muted-foreground">
                          We saw talented students around the world facing barriers to accessing quality education. 
                          Complex processes, information overload, and lack of personalized guidance were holding 
                          dreams back.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-secondary/20 hover-elevate">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-secondary to-secondary/80 flex items-center justify-center">
                        <Globe className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">
                          The Solution
                        </h3>
                        <p className="text-muted-foreground">
                          ANZ Global Education was born to transform the international education experience. 
                          We combined cutting-edge AI technology with human expertise to create a platform that 
                          truly understands student needs.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Story Content */}
              <div className="prose prose-lg max-w-none">
                <div className="bg-card border border-card-border rounded-lg p-8">
                  <p className="text-muted-foreground leading-relaxed mb-6">
                    Founded by education professionals and technology innovators, ANZ Global Education emerged from 
                    a simple observation: the process of studying abroad shouldn't be complicated. Students deserve 
                    transparency, personalized guidance, and access to comprehensive information—all in one place.
                  </p>
                  <p className="text-muted-foreground leading-relaxed mb-6">
                    We partnered with leading Australian universities to create a platform that benefits everyone. 
                    Students gain AI-powered search capabilities that understand their unique needs. Universities 
                    connect with qualified, motivated candidates from around the world. And education agents can 
                    manage applications more efficiently than ever before.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Today, we're proud to serve thousands of students across multiple regions, helping them discover 
                    courses, compare options, and apply to their dream universities with confidence. But we're just 
                    getting started—our mission is to make quality education accessible to aspiring students everywhere.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Core Values */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-background to-card/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                What We Stand For
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Our values guide every decision we make and every feature we build
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              <Card className="border-primary/20 hover-elevate">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    Student-First
                  </h3>
                  <p className="text-muted-foreground">
                    Every feature, every design decision, every partnership—we build with students' 
                    best interests at heart.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-secondary/20 hover-elevate">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="h-8 w-8 text-secondary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    Innovation
                  </h3>
                  <p className="text-muted-foreground">
                    We leverage AI and modern technology to make education discovery intuitive, 
                    fast, and personalized.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-accent/20 hover-elevate">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                    <Award className="h-8 w-8 text-accent" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    Transparency
                  </h3>
                  <p className="text-muted-foreground">
                    No hidden fees, no misleading information. We believe in honest, clear 
                    communication every step of the way.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Global Reach */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardContent className="p-8 md:p-12">
                  <div className="grid md:grid-cols-2 gap-8 items-center">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <MapPin className="h-8 w-8 text-primary" />
                        <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                          Global Reach, Local Touch
                        </h2>
                      </div>
                      <p className="text-muted-foreground leading-relaxed mb-6">
                        With offices and partnerships spanning Australia and Bangladesh, we understand 
                        both the aspirations of international students and the requirements of Australian institutions.
                      </p>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <GraduationCap className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            <strong className="text-foreground">22+ Partner Universities</strong> across Australia
                          </p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Globe className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            <strong className="text-foreground">Multiple Regions</strong> including Australia and Bangladesh
                          </p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Users className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            <strong className="text-foreground">Thousands of Students</strong> supported on their journey
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="aspect-square rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                        <Globe className="h-32 w-32 text-primary/40" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-gradient-to-br from-primary via-primary/95 to-secondary">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Be Part of Our Story
              </h2>
              <p className="text-lg md:text-xl text-white/90 mb-8">
                Join thousands of students who are already discovering their dream universities through 
                ANZ Global Education
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg"
                  onClick={() => setLocation('/courses')}
                  className="bg-white text-primary hover:bg-white/90 px-8"
                  data-testid="button-explore-courses"
                >
                  <GraduationCap className="mr-2 h-5 w-5" />
                  Explore Courses
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  onClick={() => setLocation('/contact')}
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm px-8"
                  data-testid="button-contact-us"
                >
                  Get in Touch
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
