import { useRegion } from "@/context/RegionContext";
import { isPageVisibleForRegion, type RegionPageVisibility } from "@/lib/region-config";
import { Redirect } from "wouter";

interface RegionRouteProps {
  page: keyof RegionPageVisibility;
  children: React.ReactNode;
  fallbackPath?: string;
}

export function RegionRoute({ page, children, fallbackPath = "/" }: RegionRouteProps) {
  const { region, regionCode } = useRegion();
  const effectiveRegionCode = region?.code || regionCode;

  const isVisible = isPageVisibleForRegion(page, effectiveRegionCode);

  if (!isVisible) {
    return <Redirect to={fallbackPath} />;
  }

  return <>{children}</>;
}
