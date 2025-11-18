import { Link } from "wouter";
import { Facebook, Instagram, Linkedin, Youtube, Twitter } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Footer configuration
interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

const footerSections: FooterSection[] = [
  {
    title: "QUICK LINK",
    links: [
      { label: "Find Institutions", href: "/institutions" },
      { label: "Find Courses", href: "/courses" },
      { label: "Partner with Us", href: "/partner-with-us" },
      { label: "Study in Australia", href: "/study-in-australia" },
    ],
  },
  {
    title: "KNOWLEDGE BASE",
    links: [
      { label: "About Australia", href: "/blog?category=australia" },
      { label: "Student Visa 101", href: "/blog?category=visa" },
      { label: "Work While Studying", href: "/blog?category=work" },
      { label: "Life In Australia", href: "/blog?category=life" },
    ],
  },
  {
    title: "ABOUT ANZ",
    links: [
      { label: "Our Story", href: "/our-story" },
      { label: "Student Reviews", href: "/student-reviews" },
      { label: "Contact Us", href: "/contact" },
    ],
  },
  {
    title: "TOP INSTITUTES",
    links: [
      { label: "Southern Cross University", href: "/institutions?search=Southern+Cross" },
      { label: "Engineer Institute of Technology", href: "/institutions?search=Engineer+Institute" },
      { label: "Holmes Institute", href: "/institutions?search=Holmes" },
      { label: "Federation University", href: "/institutions?search=Federation" },
    ],
  },
  {
    title: "POPULAR COURSES",
    links: [
      { label: "Social Work", href: "/courses?search=Social+Work" },
      { label: "Early Childhood Education", href: "/courses?search=Early+Childhood" },
      { label: "Engineering", href: "/courses?search=Engineering" },
      { label: "Nursing", href: "/courses?search=Nursing" },
      { label: "Information Technology", href: "/courses?search=Information+Technology" },
      { label: "Trade", href: "/courses?search=Trade" },
    ],
  },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-background" data-testid="footer">
      {/* Desktop Footer - Grid Layout */}
      <div className="hidden md:block">
        <div className="container mx-auto px-4 md:px-6 py-12 md:py-16">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
            {footerSections.map((section) => (
              <div key={section.title}>
                <h3 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wide">
                  {section.title}
                </h3>
                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      {link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                          data-testid={`footer-link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                          data-testid={`footer-link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          {/* Social Media Icons - Desktop */}
          <div className="mt-12 pt-8 border-t border-border">
            <div className="flex items-center justify-center gap-4">
              <a
                href="https://www.facebook.com/anzglobal"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-primary/10 hover:bg-primary hover:text-primary-foreground text-primary flex items-center justify-center transition-all hover-elevate"
                data-testid="social-facebook"
                aria-label="Follow us on Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="https://www.instagram.com/anzglobal/#"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-primary/10 hover:bg-primary hover:text-primary-foreground text-primary flex items-center justify-center transition-all hover-elevate"
                data-testid="social-instagram"
                aria-label="Follow us on Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://www.linkedin.com/company/anzglobal"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-primary/10 hover:bg-primary hover:text-primary-foreground text-primary flex items-center justify-center transition-all hover-elevate"
                data-testid="social-linkedin"
                aria-label="Follow us on LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href="https://www.youtube.com/channel/UCzaqG5ugCxIQsVu2IAdA-mQ"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-primary/10 hover:bg-primary hover:text-primary-foreground text-primary flex items-center justify-center transition-all hover-elevate"
                data-testid="social-youtube"
                aria-label="Subscribe on YouTube"
              >
                <Youtube className="h-5 w-5" />
              </a>
              <a
                href="https://x.com/anz_global"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-primary/10 hover:bg-primary hover:text-primary-foreground text-primary flex items-center justify-center transition-all hover-elevate"
                data-testid="social-twitter"
                aria-label="Follow us on X"
              >
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Footer - Accordion Layout */}
      <div className="md:hidden">
        <div className="container mx-auto px-4 py-8">
          <Accordion type="single" collapsible className="w-full">
            {footerSections.map((section, index) => (
              <AccordionItem key={section.title} value={`section-${index}`}>
                <AccordionTrigger className="text-sm font-semibold uppercase tracking-wide py-4">
                  {section.title}
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-3 pb-4">
                    {section.links.map((link) => (
                      <li key={link.label}>
                        {link.external ? (
                          <a
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors block"
                            data-testid={`footer-link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                          >
                            {link.label}
                          </a>
                        ) : (
                          <Link
                            href={link.href}
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors block"
                            data-testid={`footer-link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                          >
                            {link.label}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          
          {/* Social Media Icons - Mobile */}
          <div className="mt-8 pt-8 border-t border-border">
            <div className="flex items-center justify-center gap-4">
              <a
                href="https://www.facebook.com/anzglobal"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-primary/10 hover:bg-primary hover:text-primary-foreground text-primary flex items-center justify-center transition-all hover-elevate"
                data-testid="social-facebook-mobile"
                aria-label="Follow us on Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="https://www.instagram.com/anzglobal/#"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-primary/10 hover:bg-primary hover:text-primary-foreground text-primary flex items-center justify-center transition-all hover-elevate"
                data-testid="social-instagram-mobile"
                aria-label="Follow us on Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://www.linkedin.com/company/anzglobal"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-primary/10 hover:bg-primary hover:text-primary-foreground text-primary flex items-center justify-center transition-all hover-elevate"
                data-testid="social-linkedin-mobile"
                aria-label="Follow us on LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href="https://www.youtube.com/channel/UCzaqG5ugCxIQsVu2IAdA-mQ"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-primary/10 hover:bg-primary hover:text-primary-foreground text-primary flex items-center justify-center transition-all hover-elevate"
                data-testid="social-youtube-mobile"
                aria-label="Subscribe on YouTube"
              >
                <Youtube className="h-5 w-5" />
              </a>
              <a
                href="https://x.com/anz_global"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-primary/10 hover:bg-primary hover:text-primary-foreground text-primary flex items-center justify-center transition-all hover-elevate"
                data-testid="social-twitter-mobile"
                aria-label="Follow us on X"
              >
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright Bar - Blue Background */}
      <div className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 md:px-6 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
            <p className="text-center md:text-left">
              Copyright {currentYear} | ANZ Global Education
            </p>
            <div className="flex items-center gap-4">
              <Link
                href="/contact?topic=terms"
                className="hover:underline transition-all"
                data-testid="footer-link-terms"
              >
                Terms of Use
              </Link>
              <span className="text-primary-foreground/60">|</span>
              <Link
                href="/contact?topic=privacy"
                className="hover:underline transition-all"
                data-testid="footer-link-privacy"
              >
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
