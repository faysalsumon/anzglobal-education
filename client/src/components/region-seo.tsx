import { Helmet } from "react-helmet";
import { useRegion } from "@/context/RegionContext";

interface RegionSEOProps {
  title: string;
  description: string;
  path?: string;
  ogImage?: string;
  noIndex?: boolean;
}

const REGION_DOMAINS: Record<string, string> = {
  AU: "anzglobal.com.au",
  BD: "anzglobal.com.bd",
  IN: "anzglobal.co.in",
  PK: "anzglobal.com.pk",
};

const REGION_LOCALES: Record<string, string[]> = {
  AU: ["en-AU"],
  BD: ["bn-BD", "en-BD"],
  IN: ["en-IN", "hi-IN"],
  PK: ["en-PK", "ur-PK"],
};

export function RegionSEO({
  title,
  description,
  path = "",
  ogImage,
  noIndex = false,
}: RegionSEOProps) {
  const { region, locale, availableRegions } = useRegion();

  const currentDomain = region?.code
    ? REGION_DOMAINS[region.code] || "anzglobal.com.au"
    : "anzglobal.com.au";

  const canonicalUrl = `https://${currentDomain}${path}`;

  const hreflangTags = availableRegions.flatMap((r) => {
    const domain = REGION_DOMAINS[r.code] || currentDomain;
    const locales = REGION_LOCALES[r.code] || ["en"];
    
    return locales.map((loc) => ({
      hrefLang: loc,
      href: `https://${domain}${path}`,
    }));
  });

  hreflangTags.push({
    hrefLang: "x-default",
    href: `https://anzglobal.com.au${path}`,
  });

  const siteTitle = region?.code === "BD" 
    ? "CampQ বাংলাদেশ" 
    : "CampQ";

  const fullTitle = `${title} | ${siteTitle}`;

  return (
    <Helmet>
      <html lang={locale || "en"} />
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      
      <link rel="canonical" href={canonicalUrl} />
      
      {hreflangTags.map((tag, index) => (
        <link
          key={`hreflang-${index}`}
          rel="alternate"
          hrefLang={tag.hrefLang}
          href={tag.href}
        />
      ))}
      
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={siteTitle} />
      {ogImage && <meta property="og:image" content={ogImage} />}
      
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}
      
      {region && (
        <>
          <meta name="geo.region" content={region.code} />
          <meta name="geo.placename" content={region.name} />
        </>
      )}
      
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
    </Helmet>
  );
}

export function generateRegionMeta(regionCode: string, locale: string) {
  const regionNames: Record<string, Record<string, string>> = {
    AU: { en: "Australia", bn: "অস্ট্রেলিয়া" },
    BD: { en: "Bangladesh", bn: "বাংলাদেশ" },
    IN: { en: "India", bn: "ভারত" },
    PK: { en: "Pakistan", bn: "পাকিস্তান" },
  };

  const siteName: Record<string, Record<string, string>> = {
    AU: { en: "CampQ Australia" },
    BD: { en: "CampQ Bangladesh", bn: "এএনজেড গ্লোবাল এডুকেশন বাংলাদেश" },
    IN: { en: "CampQ India" },
    PK: { en: "CampQ Pakistan" },
  };

  return {
    regionName: regionNames[regionCode]?.[locale] || regionNames[regionCode]?.en || regionCode,
    siteName: siteName[regionCode]?.[locale] || siteName[regionCode]?.en || "CampQ",
  };
}
