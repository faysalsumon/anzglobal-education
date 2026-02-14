import { Link } from "wouter";
import { Facebook, Instagram, Linkedin, Youtube, Twitter } from "lucide-react";
import logoUrl from "@assets/ANZ PNG Logo_1762427712478.png";
import { useRegion } from "@/context/RegionContext";
import { getRegionConfig } from "@/lib/region-config";

const socialLinks = [
  {
    name: "Facebook",
    href: "https://www.facebook.com/anzglobal",
    icon: Facebook,
    testId: "social-facebook",
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com/anzglobal",
    icon: Instagram,
    testId: "social-instagram",
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/company/anzglobal",
    icon: Linkedin,
    testId: "social-linkedin",
  },
  {
    name: "YouTube",
    href: "https://www.youtube.com/channel/UCzaqG5ugCxIQsVu2IAdA-mQ",
    icon: Youtube,
    testId: "social-youtube",
  },
  {
    name: "X",
    href: "https://x.com/anz_global",
    icon: Twitter,
    testId: "social-twitter",
  },
];

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { region, regionCode } = useRegion();
  const effectiveRegionCode = region?.code || regionCode;
  const regionConfig = getRegionConfig(effectiveRegionCode);
  const footerNav = regionConfig.footerSections;

  return (
    <footer className="border-t bg-card dark:bg-card" data-testid="footer">
      <div className="container mx-auto px-4 md:px-6 py-10 md:py-14">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          <div className="col-span-2 md:col-span-1 lg:col-span-2">
            <Link href="/" aria-label="Go to homepage" data-testid="footer-logo">
              <img
                src={logoUrl}
                alt="ANZ Global Education"
                className="h-8 w-auto mb-4"
              />
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs mb-6">
              {effectiveRegionCode === 'BD'
                ? "Helping Bangladeshi students achieve their dreams of studying abroad at world-class universities."
                : "Connecting international students with world-class Australian education opportunities."}
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground transition-colors hover-elevate"
                  aria-label={`Follow us on ${social.name}`}
                  data-testid={social.testId}
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {footerNav.map((section) => (
            <div key={section.title}>
              <h3
                className="text-sm font-semibold text-foreground mb-4"
                data-testid={`footer-heading-${section.title.toLowerCase()}`}
              >
                {section.title}
              </h3>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      data-testid={`footer-link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 md:px-6 py-3.5">
          <p className="text-xs text-center opacity-90" data-testid="text-copyright">
            &copy; {currentYear} ANZ Global Education. All rights reserved. A product of ANZ Global Education.
          </p>
        </div>
      </div>
    </footer>
  );
}
