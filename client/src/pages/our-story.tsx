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
          content="Founded in 2017 by former international students Golam Haque and Faysal Bahar, ANZ Global Education transforms the study abroad journey with AI-powered tools. From students who struggled, to a platform that makes studying in Australia simple and stress-free." 
        />
        <meta property="og:title" content="Our Story - ANZ Global Education" />
        <meta property="og:description" content="Founded by ex-international students in 2017, we built an AI platform that breaks down barriers to Australian education. From conventional agency to cutting-edge technology—helping students navigate their journey with clarity and confidence." />
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
                From students who struggled, to a platform that makes it simple
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
                        To break down the barriers in international education by connecting the right students with the right courses. 
                        We give students the tools, transparency, and support they deserve—while helping universities reach motivated, 
                        qualified students who'll thrive in their programs. Simple, smart, and stress-free for everyone.
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
                A Story Born from Experience
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Because we've walked in your shoes—and we know the struggle is real
              </p>
            </div>

            <div className="max-w-5xl mx-auto space-y-12">
              {/* Founders Story */}
              <div className="bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 rounded-2xl p-8 md:p-12 border border-primary/10">
                <div className="flex items-start gap-4 mb-8">
                  <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                      Founded by Students, For Students
                    </h3>
                    <p className="text-muted-foreground text-lg">
                      Golam Haque & Faysal Bahar • Est. 2017
                    </p>
                  </div>
                </div>
                
                <div className="space-y-6 text-muted-foreground leading-relaxed">
                  <p className="text-lg">
                    Back in 2017, two former international students—<strong className="text-foreground">Golam Haque</strong> and{" "}
                    <strong className="text-foreground">Faysal Bahar</strong>—sat down with a shared frustration and a bold vision. 
                    They had both navigated the maze of studying in Australia firsthand: the endless paperwork, the confusing requirements, 
                    the sleepless nights wondering if they'd chosen the right course or the right university.
                  </p>
                  
                  <p className="text-lg">
                    But as they started working with universities as education consultants, they discovered another side of the problem. 
                    <strong className="text-foreground"> Institutions were struggling too</strong>—drowning in applications, unable to effectively 
                    reach the <em>right students</em> for their programs. Quality courses were going unnoticed while talented students were 
                    ending up in programs that didn't match their goals.
                  </p>
                  
                  <p className="text-lg">
                    They realized: <em>this isn't just a student problem—it's a matching problem</em>. Students need the right course. 
                    Universities need the right students. Both were struggling, and nobody was winning. That's when ANZ Global Education 
                    was born—a platform designed to solve <strong className="text-foreground">both sides</strong> of the equation.
                  </p>
                </div>
              </div>

              {/* Timeline Cards */}
              <div className="grid md:grid-cols-3 gap-6">
                <Card className="border-primary/20 hover-elevate">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white font-bold">
                        2017
                      </div>
                      <h3 className="text-xl font-semibold text-foreground">The Beginning</h3>
                    </div>
                    <p className="text-muted-foreground">
                      Started as a conventional education agency, helping students one application at a time. 
                      We learned what students really needed—clarity, speed, and someone who understood their journey.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-secondary/20 hover-elevate">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-secondary to-secondary/80 flex items-center justify-center text-white font-bold">
                        2019
                      </div>
                      <h3 className="text-xl font-semibold text-foreground">The Turning Point</h3>
                    </div>
                    <p className="text-muted-foreground">
                      After two years of running a traditional agency, we saw the limitations. Students deserved better. 
                      We asked ourselves: <em>What if technology could do the heavy lifting?</em>
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-accent/20 hover-elevate">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center text-white font-bold">
                        <Sparkles className="h-6 w-6" />
                      </div>
                      <h3 className="text-xl font-semibold text-foreground">The Platform</h3>
                    </div>
                    <p className="text-muted-foreground">
                      We built an AI-powered platform that puts everything students need at their fingertips. 
                      No more endless emails. No more confusion. Just smart, simple, and stress-free.
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* The Why */}
              <Card className="border-primary/20">
                <CardContent className="p-8 md:p-12">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Heart className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                        Why We Do What We Do
                      </h3>
                    </div>
                  </div>
                  
                  <div className="space-y-4 text-muted-foreground leading-relaxed">
                    <p className="text-lg">
                      Here's the truth: navigating the Australian education system can feel overwhelming. The forms, the deadlines, 
                      the visa requirements—it's a lot. And when you're doing it from thousands of miles away, in a different time zone, 
                      sometimes in a different language? It can feel impossible.
                    </p>
                    
                    <p className="text-lg">
                      But it doesn't have to be. <strong className="text-foreground">We've been there.</strong> We know what it's like to dream big 
                      and feel small. To want a better future but not know where to start. That's why we built this platform—to give you 
                      the clarity, confidence, and support you need to take that leap.
                    </p>
                    
                    <p className="text-lg">
                      And for our university partners, we saw how daunting it was to promote courses and reach the right students. 
                      Quality programs were invisible to the students who'd thrive in them. That's why our platform doesn't just help students 
                      find courses—<strong className="text-foreground">it helps universities find the right students</strong>. Smart matching. 
                      Better outcomes. Everyone wins.
                    </p>
                    
                    <p className="text-lg">
                      Today, we partner with <strong className="text-foreground">22+ Australian universities</strong>, offering{" "}
                      <strong className="text-foreground">AI-powered search</strong> that actually understands what you're looking for. 
                      Whether you're searching for "affordable engineering in Melbourne" or "nursing courses with scholarships," 
                      our platform gets it—and gets you results in seconds. And universities get qualified, motivated students who are 
                      genuinely interested in their programs.
                    </p>
                    
                    <p className="text-lg font-medium text-foreground">
                      Your dream of studying in Australia shouldn't come with a headache. And universities shouldn't struggle to reach 
                      their ideal students. Let us handle the complexity, so everyone can focus on what matters: education and future success.
                    </p>
                  </div>
                </CardContent>
              </Card>
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
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Ready to Be Part of the Solution?
              </h2>
              <p className="text-lg md:text-xl text-white/90 mb-8">
                <strong className="text-white">Students:</strong> Join thousands who've turned their Australian education dreams into reality. 
                Let's make your journey simple, transparent, and stress-free.
              </p>
              <p className="text-base md:text-lg text-white/80 mb-8">
                <strong className="text-white">Universities:</strong> Connect with motivated, qualified students who are genuinely interested in your programs. 
                Smart matching means better outcomes for everyone.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
                <Button 
                  size="lg"
                  onClick={() => setLocation('/courses')}
                  className="bg-white text-primary hover:bg-white/90 px-8"
                  data-testid="button-explore-courses"
                >
                  <GraduationCap className="mr-2 h-5 w-5" />
                  Find Your Course
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  onClick={() => setLocation('/contact')}
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm px-8"
                  data-testid="button-contact-us"
                >
                  Talk to an Advisor
                </Button>
              </div>
              <p className="text-sm text-white/70">
                Universities interested in partnering?{" "}
                <button 
                  onClick={() => setLocation('/contact')}
                  className="underline hover:text-white transition-colors font-medium"
                  data-testid="link-partner-inquiry"
                >
                  Get in touch
                </button>
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
