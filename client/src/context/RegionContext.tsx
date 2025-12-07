import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

export interface PublicRegion {
  code: string;
  name: string;
  flagEmoji?: string;
  flagUrl?: string;
  defaultCurrency: string;
  defaultLocale: string;
  timezone?: string;
}

export interface PublicPathway {
  code: string;
  name: string;
  description?: string;
  requiresVisa: boolean;
}

interface RegionContextValue {
  region: PublicRegion | null;
  pathway: PublicPathway | null;
  currency: string;
  locale: string;
  isLoading: boolean;
  availableRegions: PublicRegion[];
  availablePathways: PublicPathway[];
  setRegion: (regionCode: string) => void;
  setPathway: (pathwayCode: string | null) => void;
  setLocale: (locale: string) => void;
  formatCurrency: (amount: number | string | null) => string;
  detectedFromDomain: boolean;
}

const RegionContext = createContext<RegionContextValue | null>(null);

const REGION_STORAGE_KEY = "anz_selected_region";
const PATHWAY_STORAGE_KEY = "anz_selected_pathway";
const LOCALE_STORAGE_KEY = "anz_selected_locale";

const CURRENCY_SYMBOLS: Record<string, string> = {
  AUD: "A$",
  BDT: "৳",
  USD: "$",
  GBP: "£",
  EUR: "€",
  NZD: "NZ$",
  INR: "₹",
  MYR: "RM",
  SGD: "S$",
  PHP: "₱",
  VND: "₫",
  PKR: "Rs",
  LKR: "Rs",
  NPR: "Rs",
};

function detectRegionFromDomain(): string | null {
  const hostname = window.location.hostname.toLowerCase();
  
  const tldPatterns: Record<string, string> = {
    ".com.au": "AU",
    ".com.bd": "BD",
    ".co.uk": "UK",
    ".com.nz": "NZ",
    ".com.my": "MY",
    ".com.sg": "SG",
    ".com.ph": "PH",
    ".com.vn": "VN",
    ".co.in": "IN",
    ".com.pk": "PK",
    ".com.lk": "LK",
    ".com.np": "NP",
  };

  for (const [pattern, code] of Object.entries(tldPatterns)) {
    if (hostname.endsWith(pattern)) {
      return code;
    }
  }

  const parts = hostname.split(".");
  if (parts.length >= 3) {
    const subdomain = parts[0];
    const regionCodes = ["au", "bd", "uk", "nz", "my", "sg", "ph", "vn", "in", "pk", "lk", "np"];
    if (regionCodes.includes(subdomain)) {
      return subdomain.toUpperCase();
    }
  }

  return null;
}

export function RegionProvider({ children }: { children: ReactNode }) {
  const [selectedRegionCode, setSelectedRegionCode] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const domainRegion = detectRegionFromDomain();
      if (domainRegion) return domainRegion;
      return localStorage.getItem(REGION_STORAGE_KEY);
    }
    return null;
  });

  const [selectedPathwayCode, setSelectedPathwayCode] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(PATHWAY_STORAGE_KEY);
    }
    return null;
  });

  const [selectedLocale, setSelectedLocale] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(LOCALE_STORAGE_KEY) || "en";
    }
    return "en";
  });

  const [detectedFromDomain, setDetectedFromDomain] = useState(false);

  const { data: availableRegions = [], isLoading: regionsLoading } = useQuery<PublicRegion[]>({
    queryKey: ["/api/public/regions"],
  });

  const { data: availablePathways = [], isLoading: pathwaysLoading } = useQuery<PublicPathway[]>({
    queryKey: ["/api/public/pathways"],
  });

  useEffect(() => {
    const domainRegion = detectRegionFromDomain();
    if (domainRegion) {
      setSelectedRegionCode(domainRegion);
      setDetectedFromDomain(true);
    }
  }, []);

  useEffect(() => {
    if (selectedRegionCode && !detectedFromDomain) {
      localStorage.setItem(REGION_STORAGE_KEY, selectedRegionCode);
    }
  }, [selectedRegionCode, detectedFromDomain]);

  useEffect(() => {
    if (selectedPathwayCode) {
      localStorage.setItem(PATHWAY_STORAGE_KEY, selectedPathwayCode);
    } else {
      localStorage.removeItem(PATHWAY_STORAGE_KEY);
    }
  }, [selectedPathwayCode]);

  useEffect(() => {
    if (selectedLocale) {
      localStorage.setItem(LOCALE_STORAGE_KEY, selectedLocale);
      document.documentElement.lang = selectedLocale;
    }
  }, [selectedLocale]);

  const region = useMemo(() => {
    if (!selectedRegionCode) return null;
    return availableRegions.find(r => r.code === selectedRegionCode) || null;
  }, [selectedRegionCode, availableRegions]);

  const pathway = useMemo(() => {
    if (!selectedPathwayCode) return null;
    return availablePathways.find(p => p.code === selectedPathwayCode) || null;
  }, [selectedPathwayCode, availablePathways]);

  const currency = region?.defaultCurrency || "AUD";
  const locale = selectedLocale || region?.defaultLocale || "en";

  const setRegion = (regionCode: string) => {
    setSelectedRegionCode(regionCode);
    setDetectedFromDomain(false);
  };

  const setPathway = (pathwayCode: string | null) => {
    setSelectedPathwayCode(pathwayCode);
  };

  const setLocale = (newLocale: string) => {
    setSelectedLocale(newLocale);
  };

  const formatCurrency = (amount: number | string | null): string => {
    if (amount === null || amount === undefined) return "N/A";
    
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return "N/A";
    
    const symbol = CURRENCY_SYMBOLS[currency] || "$";
    
    return `${symbol}${numAmount.toLocaleString(locale === "bn" ? "bn-BD" : "en-AU", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const contextValue: RegionContextValue = {
    region,
    pathway,
    currency,
    locale,
    isLoading: regionsLoading || pathwaysLoading,
    availableRegions,
    availablePathways,
    setRegion,
    setPathway,
    setLocale,
    formatCurrency,
    detectedFromDomain,
  };

  return (
    <RegionContext.Provider value={contextValue}>
      {children}
    </RegionContext.Provider>
  );
}

export function useRegion(): RegionContextValue {
  const context = useContext(RegionContext);
  if (!context) {
    throw new Error("useRegion must be used within a RegionProvider");
  }
  return context;
}

export function useRegionHeaders(): Record<string, string> {
  const { region, pathway, locale } = useRegion();
  
  const headers: Record<string, string> = {};
  
  if (region) {
    headers["X-ANZ-Region"] = region.code;
  }
  if (pathway) {
    headers["X-ANZ-Pathway"] = pathway.code;
  }
  if (locale) {
    headers["X-ANZ-Locale"] = locale;
  }
  
  return headers;
}
