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
import { Menu, GraduationCap, BookOpen, Users, Info } from "lucide-react";
import logoUrl from "@assets/ANZ PNG Logo_1762427712478.png";

interface PublicHeaderProps {
  onStudentLoginClick?: () => void;
}

export function PublicHeader({ onStudentLoginClick }: PublicHeaderProps = {}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { title: "Courses", href: "/courses", icon: BookOpen },
    { title: "Institutions", href: "/institutions", icon: GraduationCap },
    { title: "Blog", href: "/blog", icon: Users },
    { title: "About", href: "/our-story", icon: Info },
  ];

  return (
    <header className="sticky top-0 z-[9999] bg-background/95 backdrop-blur-md border-b border-border/40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center" data-testid="link-logo">
            <img src={logoUrl} alt="ANZ Global Education" className="h-9 w-auto" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent/50"
                data-testid={`link-nav-${item.title.toLowerCase()}`}
              >
                {item.title}
              </Link>
            ))}
          </nav>

          {/* Desktop Student Login Button */}
          <div className="hidden md:flex items-center gap-3">
            {onStudentLoginClick ? (
              <Button
                variant="default"
                size="sm"
                onClick={onStudentLoginClick}
                data-testid="button-student-login"
              >
                Student Login
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                asChild
                data-testid="button-student-login"
              >
                <a href="/api/login?type=student">Student Login</a>
              </Button>
            )}
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" data-testid="button-mobile-menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] p-0">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle className="text-left">Menu</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col p-4">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                        data-testid={`mobile-link-${item.title.toLowerCase()}`}
                      >
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        {item.title}
                      </Link>
                    );
                  })}
                  
                  <div className="mt-4 pt-4 border-t">
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
                        Student Login
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        className="w-full"
                        asChild
                        data-testid="button-mobile-student-login"
                      >
                        <a href="/api/login?type=student">Student Login</a>
                      </Button>
                    )}
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
