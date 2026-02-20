declare global {
  interface Window {
    fbq: (...args: any[]) => void;
    _fbq: (...args: any[]) => void;
  }
}

let pixelInitialized = false;
let currentPixelId: string | null = null;

export function initMetaPixel(pixelId: string): void {
  if (pixelInitialized && currentPixelId === pixelId) return;

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
    (n as any).loaded = true;
    (n as any).version = "2.0";
    (n as any).queue = [];

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    const firstScript = document.getElementsByTagName("script")[0];
    if (firstScript?.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    }
  }

  window.fbq("init", pixelId);
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

export function trackLead(contentName?: string, contentCategory?: string): void {
  trackEvent("Lead", {
    ...(contentName && { content_name: contentName }),
    ...(contentCategory && { content_category: contentCategory }),
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
  contentId?: string
): void {
  trackEvent("ViewContent", {
    content_name: contentName,
    ...(contentCategory && { content_category: contentCategory }),
    ...(contentId && { content_ids: [contentId], content_type: "product" }),
  });
}

export function trackContact(): void {
  trackEvent("Contact");
}

export function trackInitiateApplication(
  contentName?: string,
  contentId?: string
): void {
  trackEvent("InitiateCheckout", {
    ...(contentName && { content_name: contentName }),
    ...(contentId && { content_ids: [contentId], content_type: "product" }),
  });
}
