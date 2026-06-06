/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    fbq: (...args: any[]) => void;
    _fbq: (...args: any[]) => void;
  }
}

let pixelInitialized = false;
let currentPixelId: string | null = null;

export function initMetaPixel(pixelId: string): void {
  if (!pixelId) {
    console.warn("[Meta Pixel] No pixel ID provided, skipping initialization");
    return;
  }

  if (pixelInitialized && currentPixelId === pixelId) {
    console.log(`[Meta Pixel] Already initialized with pixel ID ${pixelId}`);
    return;
  }

  if (!window.fbq) {
    const n = (window.fbq = function (...args: any[]) {
      if ((n as any).callMethod) {
        (n as any).callMethod.apply(n, args);
      } else {
        (n as any).queue.push(args);
      }
    } as any);
    if (!window._fbq) window._fbq = n as any;
    (n as any).push = n;
    (n as any).loaded = !0;
    (n as any).version = "2.0";
    (n as any).queue = [];

    const existingScript = document.querySelector(
      'script[src*="connect.facebook.net"]'
    );
    if (!existingScript) {
      const script = document.createElement("script");
      script.async = true;
      script.src = "https://connect.facebook.net/en_US/fbevents.js";

      script.onload = () => {
        console.log("[Meta Pixel] fbevents.js script loaded successfully");
      };
      script.onerror = () => {
        console.error("[Meta Pixel] Failed to load fbevents.js - may be blocked by ad blocker");
      };

      document.head.appendChild(script);
      console.log("[Meta Pixel] Injected fbevents.js script into document head");
    }
  }

  const existingNoscript = document.querySelector(
    'noscript[data-meta-pixel]'
  );
  if (!existingNoscript && document.body) {
    const noscript = document.createElement("noscript");
    noscript.setAttribute("data-meta-pixel", "true");
    const img = document.createElement("img");
    img.height = 1;
    img.width = 1;
    img.style.display = "none";
    img.src = `https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`;
    img.alt = "";
    noscript.appendChild(img);
    document.body.appendChild(noscript);
  }

  window.fbq("init", pixelId);
  window.fbq("track", "PageView");
  console.log(`[Meta Pixel] Initialized with pixel ID: ${pixelId}, PageView fired`);

  pixelInitialized = true;
  currentPixelId = pixelId;
}

export function trackPageView(): void {
  if (!pixelInitialized || !window.fbq) return;
  window.fbq("track", "PageView");
}

export function trackEvent(
  eventName: string,
  params?: Record<string, any>
): void {
  if (!pixelInitialized || !window.fbq) return;
  if (params) {
    window.fbq("track", eventName, params);
  } else {
    window.fbq("track", eventName);
  }
}

export function trackCustomEvent(
  eventName: string,
  params?: Record<string, any>
): void {
  if (!pixelInitialized || !window.fbq) return;
  if (params) {
    window.fbq("trackCustom", eventName, params);
  } else {
    window.fbq("trackCustom", eventName);
  }
}

export function trackSearch(searchString: string, contentCategory?: string): void {
  trackEvent("Search", {
    search_string: searchString,
    ...(contentCategory && { content_category: contentCategory }),
  });
}

export function trackLead(
  contentName?: string,
  contentCategory?: string,
  value?: number,
  currency = "AUD"
): void {
  trackEvent("Lead", {
    ...(contentName && { content_name: contentName }),
    ...(contentCategory && { content_category: contentCategory }),
    ...(value && value > 0 ? { value, currency } : {}),
  });
}

export function trackCompleteRegistration(status?: string): void {
  trackEvent("CompleteRegistration", {
    ...(status && { status }),
  });
}

export function trackViewContent(
  contentName: string,
  contentCategory?: string,
  contentId?: string,
  extraParams?: Record<string, any>
): void {
  trackEvent("ViewContent", {
    content_name: contentName,
    ...(contentCategory && { content_category: contentCategory }),
    ...(contentId && { content_ids: [contentId], content_type: "product" }),
    ...extraParams,
  });
}

export function trackContact(): void {
  trackEvent("Contact");
}

export function trackInitiateApplication(
  contentName?: string,
  contentId?: string,
  value?: number,
  currency = "AUD"
): void {
  trackEvent("InitiateCheckout", {
    ...(contentName && { content_name: contentName }),
    ...(contentId && { content_ids: [contentId], content_type: "course" }),
    ...(value && value > 0 ? { value, currency } : {}),
  });
}
