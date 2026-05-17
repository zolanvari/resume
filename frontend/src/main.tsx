import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { reportClientError } from "./api";
import { initAnalyticsFromStoredConsent } from "./analytics";
import "./styles.css";

// Resume Google Analytics only if the visitor accepted on a previous visit.
initAnalyticsFromStoredConsent();

// Catch errors that escape React (async callbacks, event handlers, promises).
window.addEventListener("error", (e) => {
  reportClientError({
    kind: "error",
    message: e.message || "window error",
    stack:
      e.error instanceof Error ? e.error.stack : `${e.filename}:${e.lineno}:${e.colno}`,
  });
});
window.addEventListener("unhandledrejection", (e) => {
  const reason = e.reason;
  reportClientError({
    kind: "unhandledrejection",
    message: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
