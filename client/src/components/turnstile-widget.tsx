import { useEffect, useRef, useCallback } from "react";

interface TurnstileWidgetProps {
  onSuccess: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  className?: string;
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";

export function TurnstileWidget({ onSuccess, onExpire, onError, className }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile || !SITE_KEY) return;
    if (widgetIdRef.current) {
      try { window.turnstile.remove(widgetIdRef.current); } catch {}
      widgetIdRef.current = null;
    }
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      callback: onSuccess,
      "expired-callback": onExpire,
      "error-callback": onError,
      theme: "light",
    });
  }, [onSuccess, onExpire, onError]);

  useEffect(() => {
    if (!SITE_KEY) return;

    if (window.turnstile) {
      renderWidget();
      return;
    }

    window.onTurnstileLoad = renderWidget;

    if (!document.querySelector('script[src*="turnstile"]')) {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch {}
        widgetIdRef.current = null;
      }
    };
  }, [renderWidget]);

  if (!SITE_KEY) return null;

  return <div ref={containerRef} className={className} data-testid="turnstile-widget" />;
}
