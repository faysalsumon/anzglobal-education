export interface RegionNavItem {
  title: string;
  href: string;
  icon?: string;
}

export interface RegionFooterSection {
  title: string;
  links: { label: string; href: string }[];
}

export interface RegionPageVisibility {
  studyInAustralia: boolean;
  studyAbroad: boolean;
  compareCourses: boolean;
  partnerWithUs: boolean;
  affiliate: boolean;
}

export interface AdminFeatureVisibility {
  webScraping: boolean;
  dataImport: boolean;
  aiSettings: boolean;
  partnerApi: boolean;
  qualificationTypes: boolean;
  entryRequirements: boolean;
  seoManagement: boolean;
  tagManager: boolean;
  regions: boolean;
  branches: boolean;
}

export interface RegionConfig {
  code: string;
  name: string;
  publicNavItems: RegionNavItem[];
  footerSections: RegionFooterSection[];
  pageVisibility: RegionPageVisibility;
  adminFeatureVisibility: AdminFeatureVisibility;
  heroTagline: string;
  supportEmail: string;
  supportPhone: string;
}

const AU_CONFIG: RegionConfig = {
  code: "AU",
  name: "Australia",
  publicNavItems: [
    { title: "Home", href: "/" },
    { title: "Courses", href: "/courses" },
    { title: "Institutions", href: "/institutions" },
    { title: "Study in Australia", href: "/study-in-australia" },
    { title: "Blog", href: "/blog" },
    { title: "About", href: "/our-story" },
  ],
  footerSections: [
    {
      title: "Explore",
      links: [
        { label: "Courses", href: "/courses" },
        { label: "Institutions", href: "/institutions" },
        { label: "Study in Australia", href: "/study-in-australia" },
        { label: "Compare Courses", href: "/compare-courses" },
        { label: "Blog", href: "/blog" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "Our Story", href: "/our-story" },
        { label: "Student Reviews", href: "/student-reviews" },
        { label: "Contact Us", href: "/contact" },
        { label: "Partner with Us", href: "/partner-with-us" },
        { label: "Affiliate Program", href: "/affiliate" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Terms of Use", href: "/terms" },
      ],
    },
  ],
  pageVisibility: {
    studyInAustralia: true,
    studyAbroad: false,
    compareCourses: true,
    partnerWithUs: true,
    affiliate: true,
  },
  adminFeatureVisibility: {
    webScraping: true,
    dataImport: true,
    aiSettings: true,
    partnerApi: true,
    qualificationTypes: true,
    entryRequirements: true,
    seoManagement: true,
    tagManager: true,
    regions: true,
    branches: true,
  },
  heroTagline: "Your gateway to Australian education",
  supportEmail: "info@anzglobal.com.au",
  supportPhone: "+61 2 1234 5678",
};

const BD_CONFIG: RegionConfig = {
  code: "BD",
  name: "Bangladesh",
  publicNavItems: [
    { title: "Home", href: "/" },
    { title: "Courses", href: "/courses" },
    { title: "Institutions", href: "/institutions" },
    { title: "Study Abroad", href: "/study-abroad" },
    { title: "Blog", href: "/blog" },
    { title: "About", href: "/our-story" },
  ],
  footerSections: [
    {
      title: "Explore",
      links: [
        { label: "Courses", href: "/courses" },
        { label: "Institutions", href: "/institutions" },
        { label: "Study Abroad", href: "/study-abroad" },
        { label: "Blog", href: "/blog" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "Our Story", href: "/our-story" },
        { label: "Student Reviews", href: "/student-reviews" },
        { label: "Contact Us", href: "/contact" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Terms of Use", href: "/terms" },
      ],
    },
  ],
  pageVisibility: {
    studyInAustralia: false,
    studyAbroad: true,
    compareCourses: true,
    partnerWithUs: false,
    affiliate: false,
  },
  adminFeatureVisibility: {
    webScraping: false,
    dataImport: true,
    aiSettings: false,
    partnerApi: false,
    qualificationTypes: true,
    entryRequirements: true,
    seoManagement: true,
    tagManager: true,
    regions: false,
    branches: true,
  },
  heroTagline: "Your gateway to global education",
  supportEmail: "info@anzglobal.com.bd",
  supportPhone: "+880 1234 567890",
};

const DEFAULT_CONFIG: RegionConfig = AU_CONFIG;

const REGION_CONFIGS: Record<string, RegionConfig> = {
  AU: AU_CONFIG,
  BD: BD_CONFIG,
};

export function getRegionConfig(regionCode: string | null | undefined): RegionConfig {
  if (!regionCode) return DEFAULT_CONFIG;
  return REGION_CONFIGS[regionCode.toUpperCase()] || DEFAULT_CONFIG;
}

export function getAdminRegionConfig(adminRegionCode: string | null | undefined, isGlobalScope: boolean): RegionConfig {
  if (isGlobalScope || !adminRegionCode) return AU_CONFIG;
  return REGION_CONFIGS[adminRegionCode.toUpperCase()] || AU_CONFIG;
}

export function isPageVisibleForRegion(
  page: keyof RegionPageVisibility,
  regionCode: string | null | undefined
): boolean {
  const config = getRegionConfig(regionCode);
  return config.pageVisibility[page];
}

export function isAdminFeatureVisible(
  feature: keyof AdminFeatureVisibility,
  adminRegionCode: string | null | undefined,
  isGlobalScope: boolean
): boolean {
  if (isGlobalScope) return true;
  const config = getAdminRegionConfig(adminRegionCode, isGlobalScope);
  return config.adminFeatureVisibility[feature];
}
