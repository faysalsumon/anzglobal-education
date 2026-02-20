import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useRegion } from "@/context/RegionContext";
import {
  initMetaPixel,
  trackPageView,
  trackSearch,
  trackLead,
  trackCompleteRegistration,
  trackViewContent,
  trackContact,
  trackInitiateApplication,
  trackEvent,
  trackCustomEvent,
} from "@/lib/meta-pixel";

export function useMetaPixel() {
  const { regionCode } = useRegion();
  const [location] = useLocation();
  const prevLocation = useRef(location);
  const pixelLoaded = useRef(false);

  useEffect(() => {
    if (!regionCode) return;

    fetch(`/api/public/meta-pixel?region=${regionCode}`, {
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.pixelId) {
          console.log(`[Meta Pixel] Initializing for region ${regionCode}`);
          initMetaPixel(data.pixelId);
          pixelLoaded.current = true;
          trackPageView();
        } else {
          console.log(`[Meta Pixel] No pixel configured for region ${regionCode}`);
        }
      })
      .catch((err) => {
        console.warn("[Meta Pixel] Failed to fetch pixel config:", err);
      });
  }, [regionCode]);

  useEffect(() => {
    if (prevLocation.current !== location && pixelLoaded.current) {
      trackPageView();
    }
    prevLocation.current = location;
  }, [location]);

  const fbTrackSearch = useCallback(
    (searchString: string, contentCategory?: string) => {
      trackSearch(searchString, contentCategory);
    },
    []
  );

  const fbTrackLead = useCallback(
    (contentName?: string, contentCategory?: string) => {
      trackLead(contentName, contentCategory);
    },
    []
  );

  const fbTrackRegistration = useCallback((status?: string) => {
    trackCompleteRegistration(status);
  }, []);

  const fbTrackViewContent = useCallback(
    (contentName: string, contentCategory?: string, contentId?: string) => {
      trackViewContent(contentName, contentCategory, contentId);
    },
    []
  );

  const fbTrackContact = useCallback(() => {
    trackContact();
  }, []);

  const fbTrackApplication = useCallback(
    (contentName?: string, contentId?: string) => {
      trackInitiateApplication(contentName, contentId);
    },
    []
  );

  const fbTrackEvent = useCallback(
    (eventName: string, params?: Record<string, any>) => {
      trackEvent(eventName, params);
    },
    []
  );

  const fbTrackCustom = useCallback(
    (eventName: string, params?: Record<string, any>) => {
      trackCustomEvent(eventName, params);
    },
    []
  );

  return {
    trackSearch: fbTrackSearch,
    trackLead: fbTrackLead,
    trackRegistration: fbTrackRegistration,
    trackViewContent: fbTrackViewContent,
    trackContact: fbTrackContact,
    trackApplication: fbTrackApplication,
    trackEvent: fbTrackEvent,
    trackCustom: fbTrackCustom,
  };
}
