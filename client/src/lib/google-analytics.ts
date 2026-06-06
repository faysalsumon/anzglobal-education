/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

export const GA_MEASUREMENT_ID = 'G-FR0SX6QEEZ';

export function pageview(url: string): void {
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', 'page_view', {
    page_path: url,
    send_to: GA_MEASUREMENT_ID,
  });
}

export function gaEvent(action: string, params?: Record<string, any>): void {
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', action, params);
}
