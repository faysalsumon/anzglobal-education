import { useState, useRef, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, GraduationCap, Building2 } from "lucide-react";
import { useTypingAnimation } from "@/hooks/useTypingAnimation";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface NaturalLanguageSearchProps {
  onSearchResults?: (results: any) => void;
}

const courseExamples = [
  "I want to study engineering in Melbourne under $30k",
  "MBA programs in Sydney budget 20-25k",
  "Computer science courses between $15000-$20000",
  "Masters in business administration under 25 thousand",
  "IT courses in Brisbane around $18000 per year",
];

const institutionExamples = [
  "universities in Melbourne",
  "TAFE in Sydney offering engineering",
  "business schools in Australia",
  "public universities in Brisbane",
  "Private institutions offering IT programs",
];

export function NaturalLanguageSearch({ onSearchResults }: NaturalLanguageSearchProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [searchType, setSearchType] = useState<"courses" | "institutions">("courses");
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const exampleQueries = searchType === "courses" ? courseExamples : institutionExamples;

  const placeholderText = useTypingAnimation({
    phrases: exampleQueries,
    typingSpeed: 50,
    deletingSpeed: 30,
    pauseDuration: 2500,
  });

  const searchMutation = useMutation({
    mutationFn: async (searchQuery: string) => {
      const endpoint = searchType === "courses" 
        ? "/api/courses/natural-search" 
        : "/api/institutions/natural-search";
      
      // apiRequest throws if response is not OK (via throwIfResNotOk)
      const response = await apiRequest("POST", endpoint, { query: searchQuery });
      
      // Parse JSON response (apiRequest already validated response is OK)
      const data = await response.json();
      
      // Validate we got expected data structure
      if (!data || typeof data !== 'object' || !data.parsedParams) {
        throw new Error("Invalid response structure from server");
      }
      
      return { ...data, searchType };
    },
    onSuccess: (data: { parsedParams: any; courses?: any[]; institutions?: any[]; totalResults?: number; searchType: string }) => {
      if (onSearchResults) {
        onSearchResults(data);
      } else {
        if (data.searchType === "courses") {
          // Navigate to courses page with parsed parameters
          const params = new URLSearchParams();
          const { parsedParams } = data;
          
          // Combine subject and location into search term for full-text search
          const searchTerms: string[] = [];
          if (parsedParams.subject) {
            searchTerms.push(parsedParams.subject);
          }
          if (parsedParams.location) {
            searchTerms.push(parsedParams.location);
          }
          
          if (searchTerms.length > 0) {
            params.set("search", searchTerms.join(" "));
          }
          
          // Also pass structured parameters for filter dropdowns
          if (parsedParams.subject) {
            params.set("subject", parsedParams.subject);
          }
          if (parsedParams.level) {
            params.set("level", parsedParams.level);
          }
          // Always pass country if identified by AI
          if (parsedParams.country) {
            params.set("country", parsedParams.country);
          }
          if (parsedParams.minFees !== undefined || parsedParams.maxFees !== undefined) {
            if (parsedParams.minFees !== undefined) {
              params.set("minFees", String(parsedParams.minFees));
            }
            if (parsedParams.maxFees !== undefined) {
              params.set("maxFees", String(parsedParams.maxFees));
            }
          }
          
          // Add original query for display
          params.set("nlQuery", parsedParams.originalQuery || query);
          
          window.location.href = `/courses?${params.toString()}`;
        } else {
          // Navigate to institutions page with parsed parameters
          const params = new URLSearchParams();
          const { parsedParams } = data;
          
          // Build search terms from parsed parameters
          const searchTerms: string[] = [];
          if (parsedParams.searchTerm) {
            searchTerms.push(parsedParams.searchTerm);
          }
          if (parsedParams.location) {
            searchTerms.push(parsedParams.location);
          }
          
          if (searchTerms.length > 0) {
            params.set("search", searchTerms.join(" "));
          }
          
          // Pass structured parameters for filter dropdowns
          if (parsedParams.providerType) {
            params.set("providerType", parsedParams.providerType);
          }
          if (parsedParams.country) {
            params.set("country", parsedParams.country);
          }
          
          // Add original query for display
          params.set("nlQuery", parsedParams.originalQuery || query);
          
          window.location.href = `/institutions?${params.toString()}`;
        }
      }
    },
    onError: (error: any) => {
      toast({
        title: "Search Error",
        description: error.message || "Failed to process your search. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSearch = () => {
    if (!query.trim()) {
      toast({
        title: "Empty Search",
        description: "Please describe what you're looking for",
        variant: "destructive",
      });
      return;
    }
    searchMutation.mutate(query.trim());
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
    inputRef.current?.focus();
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {/* Search Type Toggle */}
      <div className="flex gap-2 justify-center">
        <Button
          variant={searchType === "courses" ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setSearchType("courses");
            setQuery("");
          }}
          className={searchType === "courses" 
            ? "bg-white text-primary hover:bg-white/90" 
            : "bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm"}
          data-testid="button-search-type-courses"
        >
          <GraduationCap className="h-4 w-4 mr-2" />
          Courses
        </Button>
        <Button
          variant={searchType === "institutions" ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setSearchType("institutions");
            setQuery("");
          }}
          className={searchType === "institutions" 
            ? "bg-white text-primary hover:bg-white/90" 
            : "bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm"}
          data-testid="button-search-type-institutions"
        >
          <Building2 className="h-4 w-4 mr-2" />
          Institutions
        </Button>
      </div>

      {/* Main Search Bar */}
      <div className="relative">
        <div className="relative group">
          <div className={`absolute -inset-1 bg-gradient-to-r from-primary via-accent to-primary rounded-lg blur-sm opacity-0 group-hover:opacity-30 transition duration-300 ${isFocused ? 'opacity-30' : ''}`}></div>
          <div className="relative flex items-center bg-background rounded-lg border-2 border-border focus-within:border-primary transition-all duration-200">
            <div className="flex-1 relative min-w-0">
              <Input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder=""
                className="h-14 sm:h-16 text-base sm:text-lg border-0 focus-visible:ring-0 focus-visible:ring-offset-0 pr-2 sm:pr-4 bg-transparent text-primary"
                disabled={searchMutation.isPending}
                data-testid="input-natural-search"
              />
              {!query && (
                <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 pointer-events-none right-2 overflow-hidden">
                  <span className="text-base sm:text-lg text-primary/70 whitespace-nowrap block overflow-hidden text-ellipsis">
                    {placeholderText}
                    <span className="animate-pulse">|</span>
                  </span>
                </div>
              )}
            </div>
            <Button
              onClick={handleSearch}
              disabled={searchMutation.isPending || !query.trim()}
              size="lg"
              className="h-12 sm:h-14 px-4 sm:px-8 m-1 bg-primary hover:bg-primary/90 shrink-0"
              data-testid="button-search"
            >
              {searchMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Search className="w-5 h-5 sm:mr-2" />
                  <span className="hidden sm:inline">Search</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Example Suggestions */}
      <div className="flex flex-wrap gap-2 justify-center">
        <span className="text-sm text-white/80 self-center font-medium">Try:</span>
        {exampleQueries.slice(0, 3).map((example, index) => (
          <button
            key={index}
            onClick={() => handleExampleClick(example)}
            className="text-sm text-white/90 hover:text-white hover-elevate active-elevate-2 px-3 py-1 rounded-md border border-white/30 bg-white/10 backdrop-blur-sm transition-all duration-200 font-medium"
            data-testid={`button-example-${index}`}
          >
            "{example}"
          </button>
        ))}
      </div>

      {/* Search Tips */}
      <div className="text-center text-sm text-white/90">
        <p className="font-medium">💡 Describe what you want in plain English - our AI will understand!</p>
      </div>
    </div>
  );
}
