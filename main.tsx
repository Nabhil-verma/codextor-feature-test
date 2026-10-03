import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AccountProvider } from "./AccountProvider";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";

// Register service worker for PWA offline support (prod only).
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // SW registration failed — non-critical, app still works
    });
  });
}

// Surface async crashes in the hosted preview console instead of dying silently.
window.addEventListener("unhandledrejection", (e) => {
  // eslint-disable-next-line no-console
  console.error("[unhandledrejection]", e.reason);
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AccountProvider>
        <App />
      </AccountProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
