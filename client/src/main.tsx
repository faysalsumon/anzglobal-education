import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "flag-icons/css/flag-icons.min.css";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
    environment: import.meta.env.MODE,
    ignoreErrors: [
      // Ad blocker noise
      "fbevents.js",
      "Failed to load fbevents",
      // Vite HMR (dev only)
      "Failed to fetch dynamically imported module",
      // User-facing navigation cancellations
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed",
    ],
    denyUrls: [
      // Browser extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
    ],
  });
}

createRoot(document.getElementById("root")!).render(<App />);
