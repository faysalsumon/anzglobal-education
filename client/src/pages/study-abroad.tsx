import { Helmet } from "react-helmet";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Globe, BookOpen, Users, Award, CheckCircle, ArrowRight, MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useRegion } from "@/context/RegionContext";

interface PlatformStats {
  totalCourses: number;
  totalInstitutions: number;
  totalStudents: number;
}

const destinations = [
  {
    country: "Australia",
    flag: "au",
    description: "World-class universities, post-study work rights, and a multicultural environment make Australia the top choice for Bangladeshi students.",
    highlights: ["Post-Study Work Visa", "High Quality of Life", "Globally Ranked Universities"],
    popularCourses: ["Business & Management", "IT & Computer Science", "Engineering"],
  },
  {
    country: "United Kingdom",
    flag: "gb",
    description: "Rich academic heritage, 1-year master's programs, and the Graduate Route visa make the UK an attractive destination.",
    highlights: ["1-Year Master's Programs", "Graduate Route Visa", "World-Famous Universities"],
    popularCourses: ["Business & Finance", "Law", "Healthcare"],
  },
  {
    country: "Canada",
    flag: "ca",
    description: "Affordable education, pathways to permanent residency, and a welcoming immigration policy for international students.",
    highlights: ["PR Pathway", "Affordable Tuition", "Co-op Work Programs"],
    popularCourses: ["Computer Science", "Business", "Health Sciences"],
  },
  {
    country: "Malaysia",
    flag: "my",
    description: "Quality education at affordable costs, cultural proximity, and English-medium instruction in a diverse environment.",
    highlights: ["Affordable Living", "English-Medium Programs", "Cultural Proximity"],
    popularCourses: ["Engineering", "Medicine", "Hospitality"],
  },
];

const benefits = [
  {
    icon: Award,
    title: "Free Expert Counseling",
    description: "Our experienced counselors guide you through every step of the application process at no cost.",
  },
  {
    icon: GraduationCap,
    title: "Scholarship Assistance",
    description: "We help you find and apply for scholarships that can significantly reduce your education costs.",
  },
  {
    icon: BookOpen,
    title: "IELTS & Test Preparation",
    description: "Get guidance on English proficiency test preparation and requirements for your target country.",
  },
  {
    icon: Globe,
    title: "Visa Support",
    description: "End-to-end visa application support with a high success rate for student visas.",
  },
  {
    icon: Users,
    title: "Pre-Departure Briefing",
    description: "Comprehensive orientation sessions covering accommodation, culture, and practical tips.",
  },
  {
    icon: CheckCircle,
    title: "Post-Arrival Support",
    description: "Our support doesn't end at arrival. We help you settle in and connect with local communities.",
  },
];

export default function StudyAbroad() {
  const { region, regionCode } = useRegion();
  const effectiveRegionCode = region?.code || regionCode;
  const regionQuery = effectiveRegionCode ? { region: effectiveRegionCode } : {};

  const { data: stats } = useQuery<PlatformStats>({
    queryKey: ["/api/platform/stats", regionQuery],
  });

  return (
    <>
      <Helmet>
        <title>Study Abroad from Bangladesh | ANZ Global Education</title>
        <meta name="description" content="Explore study abroad opportunities from Bangladesh. Find courses in Australia, UK, Canada, Malaysia and more. Free counseling and scholarship support." />
      </Helmet>

      <section className="relative bg-gradient-to-br from-primary/10 via-background to-accent/5 py-16 md:py-24" data-testid="study-abroad-hero">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4" data-testid="badge-study-abroad">
              <Globe className="h-3 w-3 mr-1" />
              Study Abroad from Bangladesh
            </Badge>
            <h1 className="text-3xl md:text-5xl font-bold mb-6" data-testid="heading-study-abroad">
              Your Journey to a <span className="text-primary">World-Class Education</span> Starts Here
            </h1>
            <p className="text-lg text-muted-foreground mb-8" data-testid="text-study-abroad-subtitle">
              Thousands of Bangladeshi students have trusted ANZ Global Education to help them study at top universities around the world. Let us help you find your perfect course and destination.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/courses">
                <Button size="lg" data-testid="button-browse-courses">
                  Browse Courses <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" data-testid="button-free-consultation">
                  Free Consultation
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {stats && (
        <section className="py-8 bg-primary/5" data-testid="study-abroad-stats">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto text-center">
              <div data-testid="stat-courses">
                <p className="text-2xl md:text-3xl font-bold text-primary">{stats.totalCourses?.toLocaleString() || "500+"}+</p>
                <p className="text-sm text-muted-foreground">Courses Available</p>
              </div>
              <div data-testid="stat-institutions">
                <p className="text-2xl md:text-3xl font-bold text-primary">{stats.totalInstitutions?.toLocaleString() || "50+"}+</p>
                <p className="text-sm text-muted-foreground">Partner Institutions</p>
              </div>
              <div data-testid="stat-students">
                <p className="text-2xl md:text-3xl font-bold text-primary">{stats.totalStudents?.toLocaleString() || "1000+"}+</p>
                <p className="text-sm text-muted-foreground">Students Helped</p>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="py-16 md:py-24" data-testid="study-abroad-destinations">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4" data-testid="heading-destinations">
              Popular Study Destinations
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Choose from the world's top education destinations, each offering unique advantages for Bangladeshi students.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {destinations.map((dest) => (
              <Card key={dest.country} className="hover-elevate" data-testid={`card-destination-${dest.country.toLowerCase().replace(/\s+/g, '-')}`}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`fi fi-${dest.flag} text-2xl`} />
                    <h3 className="text-xl font-semibold">{dest.country}</h3>
                    {dest.country === "Australia" && (
                      <Badge variant="default" className="ml-auto">Most Popular</Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground mb-4">{dest.description}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {dest.highlights.map((h) => (
                      <Badge key={h} variant="secondary">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {h}
                      </Badge>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-2">Popular Courses:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {dest.popularCourses.map((c) => (
                        <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-muted/30" data-testid="study-abroad-benefits">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4" data-testid="heading-why-choose-us">
              Why Choose ANZ Global Education?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We provide comprehensive support at every stage of your study abroad journey, completely free of charge.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <Card key={benefit.title} data-testid={`card-benefit-${benefit.title.toLowerCase().replace(/\s+/g, '-')}`}>
                  <CardContent className="p-6">
                    <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-primary text-primary-foreground" data-testid="study-abroad-cta">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4" data-testid="heading-cta">
            Ready to Start Your Study Abroad Journey?
          </h2>
          <p className="text-primary-foreground/80 max-w-xl mx-auto mb-8">
            Get free expert counseling from our team in Bangladesh. We'll help you choose the right course, apply to universities, and prepare for your visa.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/contact">
              <Button size="lg" variant="secondary" data-testid="button-contact-us">
                <MapPin className="mr-2 h-4 w-4" /> Contact Our Bangladesh Office
              </Button>
            </Link>
            <Link href="/courses">
              <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground bg-primary-foreground/10 backdrop-blur-sm" data-testid="button-explore-courses">
                Explore All Courses
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
