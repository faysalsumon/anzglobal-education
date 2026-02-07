import { Link } from "wouter";
import { Facebook, Instagram, Linkedin, Youtube, Twitter, Sparkles, Brain, Zap, Database, Boxes, Smartphone, BookOpen, MapPin, Mail, GraduationCap } from "lucide-react";
import { SiOpenai, SiApple, SiGoogleplay } from "react-icons/si";
import whiteLogoUrl from "@assets/White_Logo_Primary-Dark_Background_400x120_1770431203113.png";
import anzLogoUrl from "@assets/WHITE_no_Background_1770436368004.jpeg";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const aiTechnologies = [
  { name: "OpenAI", icon: SiOpenai, description: "Advanced language models" },
  { name: "Anthropic", icon: Brain, description: "Claude AI assistant" },
  { name: "OpenRouter", icon: Zap, description: "Multi-model gateway" },
  { name: "Pinecone", icon: Database, description: "Vector database" },
  { name: "RAG", icon: BookOpen, description: "Knowledge retrieval" },
  { name: "Blockchain", icon: Boxes, description: "Document verification" },
];

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
    title: "QUICK LINKS",
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
    title: "ABOUT CAMPQ",
    links: [
      { label: "Our Story", href: "/our-story" },
      { label: "Student Reviews", href: "/student-reviews" },
      { label: "Contact Us", href: "/contact" },
      { label: "Affiliate Program", href: "/affiliate" },
    ],
  },
  {
    title: "FOR INSTITUTIONS",
    links: [
      { label: "Institution Login", href: "/auth" },
      { label: "Become a Partner", href: "/partner-with-us" },
      { label: "Partner Support", href: "/contact?topic=partner" },
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
  {
    title: "LEGAL",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Use", href: "/terms" },
      { label: "Cookie Policy", href: "/cookie-policy" },
      { label: "Disclaimer", href: "/disclaimer" },
      { label: "Refund Policy", href: "/refund-policy" },
    ],
  },
];

const socialLinks = [
  { href: "https://www.facebook.com/anzglobal", icon: Facebook, label: "Facebook", testId: "social-facebook" },
  { href: "https://www.instagram.com/anzglobal/#", icon: Instagram, label: "Instagram", testId: "social-instagram" },
  { href: "https://www.linkedin.com/company/anzglobal", icon: Linkedin, label: "LinkedIn", testId: "social-linkedin" },
  { href: "https://www.youtube.com/channel/UCzaqG5ugCxIQsVu2IAdA-mQ", icon: Youtube, label: "YouTube", testId: "social-youtube" },
  { href: "https://x.com/anz_global", icon: Twitter, label: "X", testId: "social-twitter" },
];

function FooterLinkItem({ link }: { link: FooterLink }) {
  const className = "text-sm text-white/60 transition-opacity hover:opacity-80";
  if (link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        data-testid={`footer-link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
      >
        {link.label}
      </a>
    );
  }
  return (
    <Link
      href={link.href}
      className={className}
      data-testid={`footer-link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      {link.label}
    </Link>
  );
}

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer data-testid="footer">
      {/* ── Main Footer ── Navy Background ── */}
      <div style={{ backgroundColor: "#1E2A5E" }}>

        {/* ═══ DESKTOP ═══ */}
        <div className="hidden md:block">
          <div className="container mx-auto px-6 pt-16 pb-12">

            {/* Row 1: Brand column + link columns */}
            <div className="grid lg:grid-cols-12 gap-10">

              {/* Brand Column */}
              <div className="lg:col-span-3 flex flex-col gap-5">
                <Link href="/" data-testid="footer-logo-link">
                  <img
                    src={whiteLogoUrl}
                    alt="CampQ"
                    className="h-10 object-contain"
                    data-testid="img-footer-logo"
                  />
                </Link>
                <p className="text-sm text-white/50 leading-relaxed">
                  Intelligent course matching powered by AI. Connecting international students with the right courses at the right institutions across Australia and beyond.
                </p>

                {/* Contact Info */}
                <div className="flex flex-col gap-2.5 mt-1">
                  <div className="flex items-center gap-2.5 text-white/50">
                    <MapPin className="h-4 w-4 shrink-0 text-[#2DBDB6]" />
                    <span className="text-xs">Melbourne, Victoria, Australia</span>
                  </div>
                  <a href="mailto:info@campq.com.au" className="flex items-center gap-2.5 text-white/50 transition-opacity hover:opacity-80" data-testid="link-footer-email">
                    <Mail className="h-4 w-4 shrink-0 text-[#2DBDB6]" />
                    <span className="text-xs">info@campq.com.au</span>
                  </a>
                </div>

                {/* Social Icons */}
                <div className="flex items-center gap-2 mt-2">
                  {socialLinks.map((social) => (
                    <a
                      key={social.testId}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 rounded-full bg-white/10 text-white/70 flex items-center justify-center transition-all hover-elevate"
                      data-testid={social.testId}
                      aria-label={`Follow us on ${social.label}`}
                    >
                      <social.icon className="h-4 w-4" />
                    </a>
                  ))}
                </div>

                {/* Backed by ANZ Global Education */}
                <div className="flex items-center gap-2.5 mt-4 pt-4 border-t border-white/10">
                  <span className="text-[10px] text-white/30 uppercase tracking-wider font-medium whitespace-nowrap">Backed by</span>
                  <img
                    src={anzLogoUrl}
                    alt="ANZ Global Education"
                    className="h-6 object-contain opacity-50"
                    data-testid="img-anz-logo"
                  />
                </div>
              </div>

              {/* Link Columns — occupies remaining 9 cols, split into sub-grid */}
              <div className="lg:col-span-9 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
                {footerSections.slice(0, 5).map((section) => (
                  <div key={section.title}>
                    <h3 className="text-xs font-bold text-[#2DBDB6] mb-4 tracking-widest">
                      {section.title}
                    </h3>
                    <ul className="space-y-2.5">
                      {section.links.map((link) => (
                        <li key={link.label}>
                          <FooterLinkItem link={link} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-white/10 mt-12 pt-8">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-8">

                {/* Left: Legal Links inline */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  {footerSections[5].links.map((link) => (
                    <FooterLinkItem key={link.label} link={link} />
                  ))}
                </div>

                {/* Right: App Badges */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-white/40 mr-2">
                    <Smartphone className="h-3.5 w-3.5" />
                    <span className="text-[10px] uppercase tracking-wider font-medium">Coming Soon</span>
                  </div>
                  <div data-testid="badge-app-store" className="flex items-center gap-2 bg-white/10 text-white rounded-md px-3 py-2 opacity-50 cursor-default">
                    <SiApple className="h-5 w-5" />
                    <div className="flex flex-col leading-tight">
                      <span className="text-[9px] text-white/60">Download on the</span>
                      <span className="text-xs font-semibold">App Store</span>
                    </div>
                  </div>
                  <div data-testid="badge-google-play" className="flex items-center gap-2 bg-white/10 text-white rounded-md px-3 py-2 opacity-50 cursor-default">
                    <SiGoogleplay className="h-4 w-4" />
                    <div className="flex flex-col leading-tight">
                      <span className="text-[9px] text-white/60">GET IT ON</span>
                      <span className="text-xs font-semibold">Google Play</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tech Partners Strip */}
            <div className="border-t border-white/10 mt-8 pt-6">
              <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
                <div className="flex items-center gap-1.5 text-white/30">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="text-[10px] uppercase tracking-widest font-medium">Powered by</span>
                </div>
                {aiTechnologies.map((tech) => (
                  <div
                    key={tech.name}
                    className="flex items-center gap-1.5 text-white/25"
                    title={tech.description}
                    data-testid={`ai-tech-${tech.name.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <tech.icon className="h-4 w-4" />
                    <span className="text-xs font-medium">{tech.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ MOBILE ═══ */}
        <div className="md:hidden">
          <div className="container mx-auto px-4 pt-10 pb-8">

            {/* Logo + Tagline */}
            <div className="flex flex-col items-center gap-3 mb-8">
              <Link href="/" data-testid="footer-logo-link-mobile">
                <img
                  src={whiteLogoUrl}
                  alt="CampQ"
                  className="h-8 object-contain"
                  data-testid="img-footer-logo-mobile"
                />
              </Link>
              <p className="text-xs text-white/40 text-center max-w-xs">
                Intelligent course matching powered by AI. Connecting students with the right courses across Australia.
              </p>
            </div>

            {/* Accordion Navigation */}
            <Accordion type="single" collapsible className="w-full">
              {footerSections.map((section, index) => (
                <AccordionItem
                  key={section.title}
                  value={`section-${index}`}
                  className="border-white/10"
                >
                  <AccordionTrigger
                    className="text-xs font-bold text-[#2DBDB6] uppercase tracking-widest py-3.5 hover:no-underline [&>svg]:text-white/40"
                    data-testid={`accordion-footer-section-${index}`}
                  >
                    {section.title}
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-2.5 pb-3">
                      {section.links.map((link) => (
                        <li key={link.label}>
                          <FooterLinkItem link={link} />
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            {/* Contact Info */}
            <div className="flex flex-col items-center gap-2 mt-8 pt-6 border-t border-white/10">
              <div className="flex items-center gap-2 text-white/40">
                <MapPin className="h-3.5 w-3.5 text-[#2DBDB6]" />
                <span className="text-xs">Melbourne, Victoria, Australia</span>
              </div>
              <a href="mailto:info@campq.com.au" className="flex items-center gap-2 text-white/40 transition-opacity hover:opacity-80" data-testid="link-footer-email-mobile">
                <Mail className="h-3.5 w-3.5 text-[#2DBDB6]" />
                <span className="text-xs">info@campq.com.au</span>
              </a>
            </div>

            {/* Social Icons */}
            <div className="flex items-center justify-center gap-3 mt-6">
              {socialLinks.map((social) => (
                <a
                  key={`${social.testId}-mobile`}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-white/10 text-white/70 flex items-center justify-center transition-all hover-elevate"
                  data-testid={`${social.testId}-mobile`}
                  aria-label={`Follow us on ${social.label}`}
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>

            {/* Backed by ANZ Global Education - Mobile */}
            <div className="flex flex-col items-center gap-2 mt-5">
              <span className="text-[10px] text-white/30 uppercase tracking-wider font-medium">Backed by</span>
              <img
                src={anzLogoUrl}
                alt="ANZ Global Education"
                className="h-5 object-contain opacity-50"
                data-testid="img-anz-logo-mobile"
              />
            </div>

            {/* App Badges */}
            <div className="flex flex-col items-center gap-3 mt-6 pt-6 border-t border-white/10">
              <div className="flex items-center gap-1.5 text-white/30">
                <Smartphone className="h-3.5 w-3.5" />
                <span className="text-[10px] uppercase tracking-wider font-medium">Coming Soon</span>
              </div>
              <div className="flex items-center gap-3" data-testid="app-store-badges-mobile">
                <div data-testid="badge-app-store-mobile" className="flex items-center gap-2 bg-white/10 text-white rounded-md px-3 py-2 opacity-50 cursor-default">
                  <SiApple className="h-5 w-5" />
                  <div className="flex flex-col leading-tight">
                    <span className="text-[9px] text-white/60">Download on the</span>
                    <span className="text-xs font-semibold">App Store</span>
                  </div>
                </div>
                <div data-testid="badge-google-play-mobile" className="flex items-center gap-2 bg-white/10 text-white rounded-md px-3 py-2 opacity-50 cursor-default">
                  <SiGoogleplay className="h-4 w-4" />
                  <div className="flex flex-col leading-tight">
                    <span className="text-[9px] text-white/60">GET IT ON</span>
                    <span className="text-xs font-semibold">Google Play</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tech Partners */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-1.5 text-white/25">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="text-[10px] uppercase tracking-widest font-medium">Powered by</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {aiTechnologies.map((tech) => (
                    <div
                      key={tech.name}
                      className="flex items-center gap-1.5 text-white/20"
                      title={tech.description}
                      data-testid={`ai-tech-mobile-${tech.name.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <tech.icon className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-medium">{tech.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Copyright Bar ── Deeper Navy ── */}
      <div style={{ backgroundColor: "#141D45" }}>
        <div className="container mx-auto px-4 md:px-6 py-3.5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-2">
            <p className="text-xs text-white/40 text-center md:text-left" data-testid="text-copyright">
              {currentYear} CampQ. All rights reserved.
            </p>
            <div className="flex items-center gap-1.5 text-white/25">
              <GraduationCap className="h-3.5 w-3.5" />
              <span className="text-[10px]">Empowering global education through technology</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
