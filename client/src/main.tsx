import "./instrument"; // Sentry must initialize before any other code

import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "flag-icons/css/flag-icons.min.css";

createRoot(document.getElementById("root")!).render(
  <Sentry.ErrorBoundary fallback={<p>Something went wrong. Please refresh the page.</p>} showDialog>
    <App />
  </Sentry.ErrorBoundary>
);
