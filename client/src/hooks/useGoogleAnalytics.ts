import { useEffect } from "react";
import { useLocation } from "wouter";
import { pageview } from "@/lib/google-analytics";

export function useGoogleAnalytics(): void {
  const [location] = useLocation();

  useEffect(() => {
    pageview(location);
  }, [location]);
}
