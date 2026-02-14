import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import type { Region, StudentPathway } from "@shared/schema";

export interface RegionContext {
  region: Region | null;
  pathway: StudentPathway | null;
  locale: string;
  currency: string;
  detectedFromDomain: boolean;
}

declare global {
  namespace Express {
    interface Request {
      regionContext?: RegionContext;
    }
  }
}

const REGION_COOKIE_NAME = "anz_region";
const PATHWAY_COOKIE_NAME = "anz_pathway";
const LOCALE_COOKIE_NAME = "anz_locale";
const GEO_REDIRECT_OPTOUT_COOKIE = "anz_no_geo_redirect";

const DOMAIN_MAP: Record<string, string> = {
  "AU": "anzglobal.com.au",
  "BD": "anzglobal.com.bd",
};

const COUNTRY_TO_DOMAIN: Record<string, string> = {
  "AU": "AU",
  "BD": "BD",
};

const TLD_PATTERNS: Record<string, string> = {
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
  ".com": "AU",
};

const PRODUCTION_DOMAINS: Record<string, string> = {
  "anzglobal.com.au": "AU",
  "anzglobal.com.bd": "BD",
};

export function geoRedirectMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (req.path.startsWith("/api/") || req.path.startsWith("/assets/") || req.path.startsWith("/favicon")) {
      return next();
    }

    const cookies = req.cookies as Record<string, string> | undefined;
    if (cookies?.[GEO_REDIRECT_OPTOUT_COOKIE]) {
      return next();
    }

    const hostname = (req.hostname || req.headers.host?.split(":")[0] || "").toLowerCase();

    const currentDomainRegion = PRODUCTION_DOMAINS[hostname];
    if (!currentDomainRegion) {
      return next();
    }

    const visitorCountry = (req.headers["cf-ipcountry"] as string || "").toUpperCase();
    if (!visitorCountry || visitorCountry === "XX" || visitorCountry === "T1") {
      return next();
    }

    const targetDomainRegion = COUNTRY_TO_DOMAIN[visitorCountry];
    if (!targetDomainRegion || targetDomainRegion === currentDomainRegion) {
      return next();
    }

    const targetDomain = DOMAIN_MAP[targetDomainRegion];
    if (!targetDomain) {
      return next();
    }

    const redirectUrl = `https://${targetDomain}${req.originalUrl}`;
    return res.redirect(302, redirectUrl);
  } catch (error) {
    console.error("Geo-redirect middleware error:", error);
    next();
  }
}

function extractRegionFromDomain(hostname: string): string | null {
  const host = hostname.toLowerCase();
  
  for (const [pattern, regionCode] of Object.entries(TLD_PATTERNS)) {
    if (host.endsWith(pattern)) {
      return regionCode;
    }
  }
  
  return null;
}

function extractRegionFromSubdomain(hostname: string): string | null {
  const parts = hostname.toLowerCase().split(".");
  if (parts.length >= 3) {
    const subdomain = parts[0];
    const regionCodes = ["au", "bd", "uk", "nz", "my", "sg", "ph", "vn", "in", "pk", "lk", "np"];
    if (regionCodes.includes(subdomain)) {
      return subdomain.toUpperCase();
    }
  }
  return null;
}

export async function regionDetectionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    let regionCode: string | null = null;
    let pathwayCode: string | null = null;
    let locale: string | null = null;
    let detectedFromDomain = false;

    const hostname = req.hostname || req.headers.host?.split(":")[0] || "localhost";
    regionCode = extractRegionFromSubdomain(hostname);
    if (!regionCode) {
      regionCode = extractRegionFromDomain(hostname);
    }
    
    if (regionCode) {
      detectedFromDomain = true;
    }

    const queryRegion = req.query.region as string | undefined;
    const queryPathway = req.query.pathway as string | undefined;
    const queryLocale = req.query.locale as string | undefined;
    
    if (queryRegion) {
      regionCode = queryRegion.toUpperCase();
      detectedFromDomain = false;
    }
    if (queryPathway) {
      pathwayCode = queryPathway.toLowerCase();
    }
    if (queryLocale) {
      locale = queryLocale;
    }

    const headerRegion = req.headers["x-anz-region"] as string | undefined;
    const headerPathway = req.headers["x-anz-pathway"] as string | undefined;
    const headerLocale = req.headers["x-anz-locale"] as string | undefined;
    
    if (headerRegion) {
      regionCode = headerRegion.toUpperCase();
      detectedFromDomain = false;
    }
    if (headerPathway) {
      pathwayCode = headerPathway.toLowerCase();
    }
    if (headerLocale) {
      locale = headerLocale;
    }

    const cookieRegion = (req.cookies as Record<string, string>)?.[REGION_COOKIE_NAME];
    const cookiePathway = (req.cookies as Record<string, string>)?.[PATHWAY_COOKIE_NAME];
    const cookieLocale = (req.cookies as Record<string, string>)?.[LOCALE_COOKIE_NAME];
    
    if (!regionCode && cookieRegion) {
      regionCode = cookieRegion.toUpperCase();
    }
    if (!pathwayCode && cookiePathway) {
      pathwayCode = cookiePathway.toLowerCase();
    }
    if (!locale && cookieLocale) {
      locale = cookieLocale;
    }

    let region: Region | null = null;
    let pathway: StudentPathway | null = null;

    if (regionCode) {
      region = await storage.getRegionByCode(regionCode) || null;
    }

    if (!region) {
      region = await storage.getDefaultRegion() || null;
    }

    if (pathwayCode) {
      pathway = await storage.getPathwayByCode(pathwayCode) || null;
    }

    const finalLocale = locale || region?.defaultLocale || "en";
    const finalCurrency = region?.defaultCurrency || "AUD";

    req.regionContext = {
      region,
      pathway,
      locale: finalLocale,
      currency: finalCurrency,
      detectedFromDomain,
    };

    if (region) {
      res.setHeader("X-ANZ-Region", region.code);
      res.setHeader("X-ANZ-Currency", finalCurrency);
      res.setHeader("X-ANZ-Locale", finalLocale);
    }

    next();
  } catch (error) {
    console.error("Region detection middleware error:", error);
    req.regionContext = {
      region: null,
      pathway: null,
      locale: "en",
      currency: "AUD",
      detectedFromDomain: false,
    };
    next();
  }
}

export function getRegionContext(req: Request): RegionContext {
  return req.regionContext || {
    region: null,
    pathway: null,
    locale: "en",
    currency: "AUD",
    detectedFromDomain: false,
  };
}

export function requireRegion(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const context = getRegionContext(req);
  
  if (!context.region) {
    return res.status(400).json({
      message: "Region context required. Please specify a region via domain, query parameter, or header.",
      hint: "Use ?region=AU or X-ANZ-Region header",
    });
  }
  
  next();
}
