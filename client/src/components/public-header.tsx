import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu, ChevronDown } from "lucide-react";
import logoUrl from "@assets/ANZ PNG Logo_1762427712478.png";

interface PublicHeaderProps {
  onStudentLoginClick?: () => void;
}

export function PublicHeader({ onStudentLoginClick }: PublicHeaderProps = {}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const servicesMenuItems = [
    { title: "Services For Institutions", href: "/services/institutions" },
    { title: "Study in Australia", href: "/study-in-australia" },
    { title: "Student Visa", href: "/services/visa" },
    { title: "Student Accommodation", href: "/services/accommodation" },
    { title: "Health Insurance", href: "/services/insurance" },
  ];

  return (
    <header className="sticky top-0 z-[9999] isolate">
      {/* Top Utility Bar - Blue */}
      <div className="bg-[#4F5DBE] text-white">
        <div className="container mx-auto px-4">
          <div className="hidden md:flex items-center justify-between h-10 text-sm">
            <nav className="flex items-center gap-6">
              <Link href="/institutions" className="hover:text-white/80 transition-colors" data-testid="link-top-institutions">
                TOP INSTITUTIONS
              </Link>
              <Link href="/courses?filter=trending" className="hover:text-white/80 transition-colors" data-testid="link-courses-demand">
                COURSES IN DEMAND
              </Link>
              <Link href="/knowledge-base" className="hover:text-white/80 transition-colors" data-testid="link-knowledge-base">
                KNOWLEDGE BASE
              </Link>
              <Link href="/blog" className="hover:text-white/80 transition-colors" data-testid="link-blog">
                BLOG
              </Link>
            </nav>
            {onStudentLoginClick ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onStudentLoginClick}
                className="text-white hover:bg-white/10 hover:text-white h-8"
                data-testid="button-student-login-top"
              >
                STUDENT LOGIN
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-white hover:bg-white/10 hover:text-white h-8"
                data-testid="button-student-login-top"
              >
                <a href="/api/login?type=student">
                  STUDENT LOGIN
                </a>
              </Button>
            )}
          </div>
          {/* Mobile - Just show as thin bar */}
          <div className="md:hidden h-10" />
        </div>
      </div>

      {/* Main Navigation Bar - White */}
      <div className="bg-background border-b shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2" data-testid="link-logo">
              <img src={logoUrl} alt="ANZ Global Education" className="h-10 w-auto" />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/institutions" className="text-foreground hover:text-primary transition-colors font-medium" data-testid="link-find-institutes">
                FIND INSTITUTES
              </Link>
              <Link href="/courses" className="text-foreground hover:text-primary transition-colors font-medium" data-testid="link-find-courses">
                FIND COURSES
              </Link>
              
              {/* Services Dropdown */}
              <NavigationMenu>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="font-medium" data-testid="trigger-services">
                      SERVICES
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="grid w-[400px] gap-3 p-4">
                        {servicesMenuItems.map((item) => (
                          <li key={item.href}>
                            <NavigationMenuLink asChild>
                              <Link
                                href={item.href}
                                className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                                data-testid={`link-service-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                              >
                                <div className="text-sm font-medium leading-none">{item.title}</div>
                              </Link>
                            </NavigationMenuLink>
                          </li>
                        ))}
                      </ul>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>

              <Link href="/about" className="text-foreground hover:text-primary transition-colors font-medium" data-testid="link-about">
                ABOUT
              </Link>
            </nav>

            {/* Desktop CTA */}
            <div className="hidden md:block">
              <Button
                variant="default"
                size="default"
                className="bg-[#E86C4F] hover:bg-[#d65c3f] text-white font-medium"
                data-testid="button-free-counseling"
              >
                FREE COUNSELING
              </Button>
            </div>

            {/* Mobile Menu */}
            <div className="md:hidden flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                className="bg-[#E86C4F] hover:bg-[#d65c3f] text-white"
                data-testid="button-free-counseling-mobile"
              >
                FREE COUNSELING
              </Button>
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" data-testid="button-mobile-menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px]">
                  <SheetHeader>
                    <SheetTitle>Menu</SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col gap-4 mt-8">
                    {/* Main nav links - NOW FIRST */}
                    <div className="pb-4 border-b">
                      <p className="text-xs font-semibold text-muted-foreground mb-3">NAVIGATION</p>
                      <Link
                        href="/institutions"
                        className="block py-2 text-sm font-medium hover:text-primary transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                        data-testid="mobile-link-find-institutes"
                      >
                        FIND INSTITUTES
                      </Link>
                      <Link
                        href="/courses"
                        className="block py-2 text-sm font-medium hover:text-primary transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                        data-testid="mobile-link-find-courses"
                      >
                        FIND COURSES
                      </Link>
                      <Link
                        href="/about"
                        className="block py-2 text-sm font-medium hover:text-primary transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                        data-testid="mobile-link-about"
                      >
                        ABOUT
                      </Link>
                    </div>

                    {/* Services - NOW SECOND */}
                    <div className="pb-4 border-b">
                      <p className="text-xs font-semibold text-muted-foreground mb-3">SERVICES</p>
                      {servicesMenuItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="block py-2 text-sm hover:text-primary transition-colors"
                          onClick={() => setMobileMenuOpen(false)}
                          data-testid={`mobile-link-service-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          {item.title}
                        </Link>
                      ))}
                    </div>

                    {/* Quick Links - NOW LAST */}
                    <div className="pb-4">
                      <p className="text-xs font-semibold text-muted-foreground mb-3">QUICK LINKS</p>
                      <Link
                        href="/knowledge-base"
                        className="block py-2 text-sm font-medium hover:text-primary transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                        data-testid="mobile-link-knowledge-base"
                      >
                        KNOWLEDGE BASE
                      </Link>
                      <Link
                        href="/blog"
                        className="block py-2 text-sm font-medium hover:text-primary transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                        data-testid="mobile-link-blog"
                      >
                        BLOG
                      </Link>
                    </div>

                    {/* Student Login */}
                    {onStudentLoginClick ? (
                      <Button
                        variant="default"
                        className="w-full"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          onStudentLoginClick();
                        }}
                        data-testid="button-mobile-student-login"
                      >
                        STUDENT LOGIN
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        className="w-full"
                        asChild
                        data-testid="button-mobile-student-login"
                      >
                        <a href="/api/login?type=student">
                          STUDENT LOGIN
                        </a>
                      </Button>
                    )}
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
