import * as Sentry from "@sentry/react";

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    tracesSampleRate: import.meta.env.MODE === "production" ? 0.1 : 1.0,
    tracePropagationTargets: [
      "localhost",
      /^\/api\//,
      /^https:\/\/anzglobal\.com\.au/,
    ],

    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,

    enableLogs: true,

    ignoreErrors: [
      "fbevents.js",
      "Failed to load fbevents",
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
    ],
    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
    ],
  });
}
