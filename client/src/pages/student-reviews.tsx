import { Helmet } from "react-helmet";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Quote, GraduationCap, MapPin, Building2 } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import type { Testimonial } from "@shared/schema";

const staticReviews = [
  {
    id: 1,
    title: "Trusted Visa Support You Can Count On",
    content: "I have chosen ANZ Global Education from the reference of my relatives, who lives in Australia. so, it was believable for me. When we visited their agency, I got feelings of authentic services from them. As they have excellent visa success, so I started my processing with my legal documents. Within few months I got my Visa. Thanks to them for making my dream come true.",
    studentName: "Mustakin Mohammad",
    location: "Melbourne, Australia",
    institution: "Royal Melbourne Institute of Technology (RMIT)",
    imageUrl: "/api/placeholder/100/100"
  },
  {
    id: 2,
    title: "At least I mad decision.",
    content: "I was not vocal with my dream. But anyhow my cousin Redoan Karim understand me and suggest me to go for abroad. Though it was my dream too, but I couldn't speak my mind from the beginning. Any how my father understand my thought from my cousin. So, he also put trust on ANZ Global Education. And I start my dream journey. with a very short time I got my visa though I was late in decision making.",
    studentName: "Sajid Hasan",
    location: "Melbourne, Australia",
    institution: "Swinburne University of Technology.",
    imageUrl: "/api/placeholder/100/100"
  },
  {
    id: 3,
    title: "My faith got trust",
    content: "From my childhood it was my dream to study in abroad. As soon I was about to give my HSC, I start searching for believable agencies but with many hopes I stick with ANZ Global Education. Because they were very informative from the biggening. And they just grab my trust. within a very short time I got my visa. In those processing time I suggest my childhood friend who is also my cousin to apply for abroad and he should apply by this agency. now we both are flying together for Australia. Thank you, ANZ Global Education.",
    studentName: "Redoan Karim",
    location: "Melbourne, Australia",
    institution: "Swinburne University of Technology.",
    imageUrl: "/api/placeholder/100/100"
  },
  {
    id: 4,
    title: "Dreams Turned Into Reality",
    content: "Studying abroad was always a dream of mine, but I didn't know how to make it a reality. ANZ Global Education made that dream come true. They guided me step-by-step—from career counseling and IELTS preparation to choosing a university and submitting my visa application. Every time I had a question, they answered it patiently and clearly. Their team was well-informed and deeply experienced in handling student visas. Today, I am studying at Swinburne University and thriving in a new environment—all thanks to ANZ Global Education. I'll always be grateful for their help and recommend them to every student looking to study in Australia.",
    studentName: "MD Areen Chowdhury",
    location: "Melbourne, Australia",
    institution: "Swinburne University",
    imageUrl: "/api/placeholder/100/100"
  },
  {
    id: 5,
    title: "Genuine and Supportive Team",
    content: "ANZ Global Education really stands out because of their honesty and personal care. They didn't just treat me like another student—they listened, guided, and supported me like family. Whether it was choosing the right course, writing my SOP, or preparing for the visa interview, they were always one step ahead. Thanks to their help, I'm now studying in Australia with a clear plan for my future. I'm so grateful for their support and highly recommend them!",
    studentName: "AKM ERADAT HOSSAIN NILOY",
    location: "Melbourne, Australia",
    institution: "Victoria University",
    imageUrl: "/api/placeholder/100/100"
  },
  {
    id: 6,
    title: "Support That Feels Like Family",
    content: "What really sets ANZ Global Education apart is how personal and supportive their team is. They treated me not just as a client, but as a member of their own family. I had doubts because my academic background wasn't perfect, but instead of discouraging me, they helped me present my story with honesty and strength in my SOP. They guided me through every detail—from choosing the best intake to finding affordable accommodation in Sydney.I consulted many agencies, but ANZ Global was different. They were transparent from the start—no hidden costs or false promises. They explained everything in detail and helped me at every stage, including health insurance and GTE documentation. I felt secure and confident with them. Their visa documentation process was super organized, and they kept me updated at every stage. Even after my visa was granted, they helped me with travel arrangements and settling in. Now I'm studying Melbourne at Victoria University, and I feel confident about my future here in Australia. Without their help, I would have been lost in the system. Thank you, ANZ Global, for believing in me!",
    studentName: "Nosin Anjum Promity",
    location: "Melbourne, Australia",
    institution: "Victoria University",
    imageUrl: "/api/placeholder/100/100"
  }
];

export default function StudentReviews() {
  const [, setLocation] = useLocation();
  
  const { data: cmsTestimonials = [], isLoading } = useQuery<Testimonial[]>({
    queryKey: ["/api/public/testimonials"],
  });

  const reviews = !isLoading && cmsTestimonials.length > 0
    ? cmsTestimonials.map(t => ({
        id: t.id,
        title: t.title || "Student Review",
        content: t.content,
        studentName: t.studentName,
        location: t.studentLocation || "",
        institution: t.institution || "",
        imageUrl: t.imageUrl || null,
      }))
    : staticReviews;

  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";
  const pageUrl = `${siteUrl}/student-reviews`;

  // Organization schema with testimonials (without ratings as these are success stories, not rated reviews)
  const organizationWithReviewsSchema = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "@id": `${siteUrl}/#organization`,
    "name": "ANZ Global Education",
    "url": siteUrl,
    "logo": `${siteUrl}/logo.png`,
    "description": "Australia's trusted education consultancy helping international students achieve their study abroad dreams since 2017.",
    "foundingDate": "2017",
    "areaServed": ["Australia", "Bangladesh"],
    "review": reviews.slice(0, 10).map((review) => ({
      "@type": "Review",
      "author": {
        "@type": "Person",
        "name": review.studentName
      },
      "reviewBody": review.content,
      "name": review.title,
      "datePublished": new Date().toISOString().split('T')[0]
    }))
  };

  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": siteUrl },
      { "@type": "ListItem", "position": 2, "name": "Student Reviews", "item": pageUrl }
    ]
  };

  return (
    <>
      <Helmet>
        <title>Student Reviews - ANZ Global Education</title>
        <meta 
          name="description" 
          content="Read authentic testimonials from students who achieved their Australian education dreams with ANZ Global Education. Real stories, proven success since 2017." 
        />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:title" content="Student Reviews - ANZ Global Education" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:description" content="Thousands of students trusted ANZ Global Education for their Australian study journey. Read their authentic success stories and discover our proven track record." />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://anzglobal.com.au/wp-content/uploads/2021/05/logo.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Student Reviews - ANZ Global Education" />
        <meta name="twitter:description" content="Thousands of students trusted ANZ Global Education for their Australian study journey. Read their authentic success stories." />
        <meta name="twitter:image" content="https://anzglobal.com.au/wp-content/uploads/2021/05/logo.png" />
        
        <script type="application/ld+json">
          {JSON.stringify(organizationWithReviewsSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbData)}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-primary via-primary/95 to-secondary py-20 md:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-black/10" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm mb-6 border border-white/20">
                <Quote className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                Student Reviews
              </h1>
              <p className="text-xl md:text-2xl text-white/90 font-medium mb-4">
                Trusted by Students Worldwide Since 2017
              </p>
              <p className="text-lg text-white/80">
                Real stories from real students who turned their Australian education dreams into reality
              </p>
            </div>
          </div>
        </section>

        {/* Stats Banner */}
        <section className="py-12 bg-card/50 border-b">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto text-center">
              <div>
                <div className="text-3xl md:text-4xl font-bold text-primary mb-2">Thousands</div>
                <div className="text-muted-foreground">of Students Helped</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-primary mb-2">Outstanding</div>
                <div className="text-muted-foreground">Visa Success Record</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-primary mb-2">Since 2017</div>
                <div className="text-muted-foreground">Years of Proven Excellence</div>
              </div>
            </div>
          </div>
        </section>

        {/* Reviews Grid */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto space-y-8">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="border-primary/20">
                    <CardContent className="p-6 md:p-8">
                      <div className="flex flex-col md:flex-row gap-6">
                        <Skeleton className="w-20 h-20 md:w-24 md:h-24 rounded-full flex-shrink-0" />
                        <div className="flex-1 space-y-4">
                          <div className="flex items-start gap-3">
                            <Skeleton className="h-8 w-8 flex-shrink-0" />
                            <div className="flex-1 space-y-3">
                              <Skeleton className="h-6 w-3/4" />
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-2/3" />
                            </div>
                          </div>
                          <div className="space-y-2 pt-4 border-t border-border">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-48" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : reviews.map((review, index) => (
                <Card 
                  key={review.id} 
                  className="border-primary/20 hover-elevate"
                  data-testid={`review-card-${review.id}`}
                >
                  <CardContent className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Student Avatar/Info */}
                      <div className="flex-shrink-0">
                        {review.imageUrl && !review.imageUrl.includes('placeholder') ? (
                          <Avatar className="w-20 h-20 md:w-24 md:h-24">
                            <AvatarImage src={review.imageUrl} alt={review.studentName} />
                            <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-2xl md:text-3xl font-bold">
                              {getInitials(review.studentName)}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-2xl md:text-3xl font-bold">
                            {getInitials(review.studentName)}
                          </div>
                        )}
                      </div>

                      {/* Review Content */}
                      <div className="flex-1 space-y-4">
                        {/* Quote Icon */}
                        <div className="flex items-start gap-3">
                          <Quote className="h-8 w-8 text-primary/30 flex-shrink-0" />
                          <div className="flex-1">
                            <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3">
                              {review.title}
                            </h3>
                            <p className="text-muted-foreground leading-relaxed text-base md:text-lg">
                              {review.content}
                            </p>
                          </div>
                        </div>

                        {/* Student Details */}
                        <div className="flex flex-col gap-2 pt-4 border-t border-border">
                          <div className="flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 text-primary" />
                            <span className="font-semibold text-foreground" data-testid={`student-name-${review.id}`}>
                              {review.studentName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>{review.location}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building2 className="h-4 w-4" />
                            <span>{review.institution}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-gradient-to-br from-primary via-primary/95 to-secondary">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Ready to Write Your Success Story?
              </h2>
              <p className="text-lg md:text-xl text-white/90 mb-8">
                Join thousands of students who trusted ANZ Global Education to make their Australian study dreams come true. 
                Experience our proven track record and personalized support every step of the way.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg"
                  onClick={() => setLocation('/contact')}
                  className="bg-white text-primary hover:bg-white/90 px-8"
                  data-testid="button-start-journey"
                >
                  <GraduationCap className="mr-2 h-5 w-5" />
                  Start Your Journey
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  onClick={() => setLocation('/courses')}
                  className="bg-white/10 border-2 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm px-8"
                  data-testid="button-browse-courses"
                >
                  Browse Courses
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
