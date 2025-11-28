import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, Search, BookOpen, GraduationCap, MapPin, Coffee } from "lucide-react";

const funnyMessages = [
  "Looks like this page went on a study abroad trip... and forgot to come back!",
  "404: This page is probably at the library cramming for finals.",
  "Oops! This page pulled an all-nighter and overslept.",
  "This page ghosted us harder than your group project partner.",
  "Error 404: Page not found. Unlike your motivation during exam week.",
  "This page is missing, just like your textbook the night before the test.",
  "Whoops! This page took a gap year.",
  "This URL is as lost as a freshman on the first day of uni.",
];

const studentEmojis = ["📚", "🎓", "✏️", "🎒", "💤", "☕", "🍕", "📖"];

export default function NotFound() {
  const [message] = useState(() => funnyMessages[Math.floor(Math.random() * funnyMessages.length)]);
  const [emoji] = useState(() => studentEmojis[Math.floor(Math.random() * studentEmojis.length)]);
  const [bounce, setBounce] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setBounce(true);
      setTimeout(() => setBounce(false), 500);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/10 p-4">
      <div className="text-center max-w-2xl mx-auto">
        <div 
          className={`text-[150px] md:text-[200px] leading-none font-bold select-none transition-transform duration-500 ${bounce ? 'scale-110' : 'scale-100'}`}
          data-testid="text-404-number"
        >
          <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            4
          </span>
          <span 
            className={`inline-block transition-transform duration-300 ${bounce ? 'rotate-12' : 'rotate-0'}`}
            role="img" 
            aria-label="emoji"
          >
            {emoji}
          </span>
          <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            4
          </span>
        </div>

        <h1 
          className="text-2xl md:text-3xl font-bold text-foreground mt-4 mb-3"
          data-testid="text-404-title"
        >
          Page Not Found
        </h1>

        <p 
          className="text-lg md:text-xl text-muted-foreground mb-8 px-4"
          data-testid="text-404-message"
        >
          {message}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-12">
          <Link href="/">
            <Button size="lg" className="gap-2 min-w-[160px]" data-testid="button-go-home">
              <Home className="h-5 w-5" />
              Go Home
            </Button>
          </Link>
          <Link href="/courses">
            <Button size="lg" variant="outline" className="gap-2 min-w-[160px]" data-testid="button-browse-courses">
              <Search className="h-5 w-5" />
              Browse Courses
            </Button>
          </Link>
        </div>

        <div className="border-t border-border pt-8">
          <p className="text-sm text-muted-foreground mb-4">
            Maybe you were looking for one of these?
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/study-in-australia">
              <Button variant="ghost" size="sm" className="gap-2" data-testid="link-study-australia">
                <MapPin className="h-4 w-4" />
                Study in Australia
              </Button>
            </Link>
            <Link href="/institutions">
              <Button variant="ghost" size="sm" className="gap-2" data-testid="link-institutions">
                <GraduationCap className="h-4 w-4" />
                Universities
              </Button>
            </Link>
            <Link href="/blog">
              <Button variant="ghost" size="sm" className="gap-2" data-testid="link-blog">
                <BookOpen className="h-4 w-4" />
                Blog
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="ghost" size="sm" className="gap-2" data-testid="link-contact">
                <Coffee className="h-4 w-4" />
                Contact Us
              </Button>
            </Link>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-8 opacity-60">
          Pro tip: Copy-pasting URLs is harder than it looks. We've all been there.
        </p>
      </div>
    </div>
  );
}
