import { Component, type ReactNode } from "react";
import { panelMessage } from "../lib/friendlyError";

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Last-resort boundary around the whole app: if anything throws at render, the
 * user sees an actionable card instead of a blank page, and the error is
 * logged so the hosted console captures it.
 *
 * Page- and panel-level boundaries (see App.tsx and Pieces.tsx) handle almost
 * everything; this one only fires when even the shell can't render. Copy is
 * deliberately in plain language — the raw error stays available, but behind a
 * disclosure, because "Could not find public function for 'clans:mine'" means
 * nothing to a learner.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error("[app-crash]", error);
  }

  /** Clear cached assets (service worker + HTTP cache) then reload. */
  private reloadFromScratch = () => {
    try {
      const clears = "caches" in window ? caches.keys() : Promise.resolve([]);
      clears
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .catch(() => undefined)
        .finally(() => window.location.reload());
    } catch {
      window.location.reload();
    }
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const { title, body } = panelMessage(error);
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0b",
          color: "#fafafa",
          fontFamily: "system-ui, sans-serif",
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 560,
            width: "100%",
            background: "#141416",
            border: "1px solid #2a2a2e",
            borderRadius: 16,
            padding: 32,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 34, marginBottom: 10 }} aria-hidden>
            ⚠️
          </div>
          <h1 style={{ fontSize: 19, fontWeight: 650, margin: "0 0 8px" }}>{title}</h1>
          <p style={{ color: "#a1a1aa", fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>
            {body}
          </p>

          <div
            style={{
              marginTop: 20,
              display: "flex",
              gap: 10,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={this.reloadFromScratch}
              style={{
                background: "#f5c04e",
                color: "#131313",
                border: "none",
                borderRadius: 999,
                padding: "10px 22px",
                fontSize: 14,
                fontWeight: 650,
                cursor: "pointer",
              }}
            >
              Reload the app
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.hash = "#/learn";
                window.location.reload();
              }}
              style={{
                background: "transparent",
                color: "#fafafa",
                border: "1px solid #3f3f46",
                borderRadius: 999,
                padding: "10px 22px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Go to lessons
            </button>
          </div>

          <details style={{ marginTop: 20, textAlign: "left" }}>
            <summary
              style={{
                cursor: "pointer",
                fontFamily: "ui-monospace, monospace",
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#71717a",
              }}
            >
              technical details
            </summary>
            <pre
              style={{
                marginTop: 10,
                background: "#0a0a0b",
                border: "1px solid #2a2a2e",
                borderRadius: 10,
                padding: "12px 14px",
                fontSize: 12,
                color: "#fbbf24",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                maxHeight: 180,
                overflow: "auto",
              }}
            >
              {error.message}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}
