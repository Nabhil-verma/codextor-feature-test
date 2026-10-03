import { useEffect, useMemo, useRef, useState } from "react";
import {
  motion,
  useAnimationControls,
  useReducedMotion,
} from "framer-motion";
import type { PreviewSpec } from "../data/types";

/* ═══════════════════════════════════════════════════════════════
   A live rendering sandbox. The learner's HTML/CSS/JS is compiled
   into a real document and rendered in an isolated iframe, so the
   result on screen is the browser's own layout engine — not a
   mock-up. Tailwind's Play CDN is injected for frontend lessons.

   Grading is structural: an in-frame probe reports which required
   selectors are missing. That keeps verification correct even when
   the sandbox has no network and the utility classes can't load.
   ═══════════════════════════════════════════════════════════════ */

type Tab = "html" | "css" | "js";

type Probe = {
  missing: string[];
  tailwind: boolean;
  error: string | null;
};

/** Builds the document that actually renders inside the frame. */
function buildDoc(
  spec: PreviewSpec,
  html: string,
  css: string,
  js: string
): string {
  const tailwind =
    spec.framework === "none"
      ? ""
      : '<script src="https://cdn.tailwindcss.com"><\/script>';

  // Probing runs immediately (the markup above is already parsed) and again
  // after the CDN settles, so an unreachable CDN can never block grading.
  const probe = `
    (function () {
      var selectors = ${JSON.stringify(spec.requires ?? [])};
      function report() {
        var missing = selectors.filter(function (s) {
          try { return !document.querySelector(s); } catch (e) { return true; }
        });
        parent.postMessage({
          __preview: "probe",
          missing: missing,
          tailwind: typeof window.tailwind !== "undefined"
        }, "*");
      }
      report();
      setTimeout(report, 600);
      window.addEventListener("load", report);
    })();
  `;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
${tailwind}
<style>
  html { color-scheme: light; }
  body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; }
  /* Visible without the CDN, so layout still reads if Tailwind can't load. */
  h1, h2, h3 { margin: 0 0 8px; line-height: 1.3; }
  p { margin: 0 0 8px; line-height: 1.6; }
  button { font: inherit; }
  ${css}
</style>
</head>
<body>
${html}
<script>
  try {
    ${js}
  } catch (err) {
    parent.postMessage({
      __preview: "error",
      message: (err && err.message) ? err.message : String(err)
    }, "*");
  }
<\/script>
<script>${probe}<\/script>
</body>
</html>`;
}

const TABS: { id: Tab; label: string }[] = [
  { id: "html", label: "index.html" },
  { id: "css", label: "styles.css" },
  { id: "js", label: "app.js" },
];

export default function LivePreview({
  spec,
  onPass,
}: {
  spec: PreviewSpec;
  /** Fired the first time every required selector is present. */
  onPass?: () => void;
}) {
  const [html, setHtml] = useState(spec.html);
  const [css, setCss] = useState(spec.css ?? "");
  const [js, setJs] = useState(spec.js ?? "");
  const [tab, setTab] = useState<Tab>("html");
  const [doc, setDoc] = useState(() => buildDoc(spec, spec.html, spec.css ?? "", spec.js ?? ""));
  const [runId, setRunId] = useState(0);
  const [probe, setProbe] = useState<Probe | null>(null);
  const [frameError, setFrameError] = useState<string | null>(null);
  const [passed, setPassed] = useState(false);

  const frameRef = useRef<HTMLIFrameElement>(null);
  const pop = useAnimationControls();
  const reduceMotion = useReducedMotion();
  const passedOnce = useRef(false);

  const requires = spec.requires ?? [];

  /* Rebuild the frame on a debounce so typing stays smooth. */
  useEffect(() => {
    const t = window.setTimeout(() => {
      setDoc(buildDoc(spec, html, css, js));
      setRunId((r) => r + 1);
      setFrameError(null);
    }, 500);
    return () => window.clearTimeout(t);
  }, [spec, html, css, js]);

  /* Listen for probes from *our* frame only. */
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frameRef.current?.contentWindow) return;
      const data = e.data as Partial<Probe> & {
        __preview?: string;
        message?: string;
      };
      if (data?.__preview === "probe") {
        setProbe({
          missing: data.missing ?? [],
          tailwind: Boolean(data.tailwind),
          error: null,
        });
      } else if (data?.__preview === "error") {
        setFrameError(data.message ?? "Script error");
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  /* Grade on structure, once per successful build. */
  const solved = Boolean(probe) && requires.length > 0 && probe!.missing.length === 0;

  useEffect(() => {
    if (!solved) {
      passedOnce.current = false;
      setPassed(false);
      return;
    }
    setPassed(true);
    if (!passedOnce.current) {
      passedOnce.current = true;
      if (!reduceMotion) {
        void pop.start({
          scale: [1, 1.012, 1],
          transition: { duration: 0.35, ease: "easeOut" },
        });
      }
      onPass?.();
    }
  }, [solved, reduceMotion, pop, onPass]);

  const current = tab === "html" ? html : tab === "css" ? css : js;
  const setCurrent = (v: string) =>
    tab === "html" ? setHtml(v) : tab === "css" ? setCss(v) : setJs(v);

  const tailwindMissing = probe !== null && spec.framework !== "none" && !probe.tailwind;

  const srcDoc = useMemo(() => doc, [doc]);

  return (
    <motion.div
      animate={pop}
      className={
        "glass glass-edge overflow-hidden rounded-2xl border transition-colors duration-300 " +
        (passed ? "border-gold-400/70" : "border-paper-200/60")
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-paper-200/60 px-5 py-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-sky-600">
            ▷ live preview
          </p>
          <p className="mt-1 max-w-lg text-sm text-ink-600">{spec.brief}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setDoc(buildDoc(spec, html, css, js));
              setRunId((r) => r + 1);
              setFrameError(null);
            }}
            className="rounded-full border border-paper-200 px-3 py-1 font-mono text-xs text-ink-600 transition hover:border-gold-400 hover:text-gold-600"
          >
            ↻ re-render
          </button>
          <button
            type="button"
            onClick={() => {
              setHtml(spec.html);
              setCss(spec.css ?? "");
              setJs(spec.js ?? "");
            }}
            className="rounded-full px-3 py-1 font-mono text-xs text-ink-600 transition hover:bg-paper-100 hover:text-ink-950"
          >
            reset
          </button>
        </div>
      </div>

      <div className="grid gap-4 p-5 lg:grid-cols-2">
        {/* Editor */}
        <div className="code-window">
          <div className="flex items-center gap-1 border-b border-ink-800 px-3 py-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={
                  "relative rounded-md px-2.5 py-1 font-mono text-[11px] transition " +
                  (tab === t.id
                    ? "bg-ink-800 text-gold-300"
                    : "text-ink-600 hover:text-paper-200")
                }
              >
                {t.label}
              </button>
            ))}
          </div>
          <textarea
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            spellCheck={false}
            rows={16}
            aria-label={`${tab} source`}
            className="block w-full resize-y bg-ink-950 p-4 font-mono text-[13px] leading-relaxed text-paper-100 outline-none"
          />
        </div>

        {/* Render */}
        <div className="overflow-hidden rounded-xl border border-paper-200 bg-white">
          <div className="flex items-center justify-between border-b border-paper-200 px-3 py-2">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-paper-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-paper-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-paper-300" />
            </div>
            <span className="font-mono text-[11px] text-ink-500">localhost</span>
          </div>
          <iframe
            key={runId}
            ref={frameRef}
            title="Live preview"
            srcDoc={srcDoc}
            sandbox="allow-scripts allow-modals"
            className="block h-[380px] w-full border-0 bg-white"
          />
        </div>
      </div>

      {frameError && (
        <div className="mx-5 mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 font-mono text-xs text-red-700">
          ✗ script error · {frameError}
        </div>
      )}

      {tailwindMissing && (
        <div className="mx-5 mb-4 rounded-xl border border-paper-200 bg-paper-50 px-4 py-2.5 text-xs text-ink-600">
          Tailwind's CDN didn't load, so utility classes can't style the preview.
          Your markup is still checked — reconnect to see the styles.
        </div>
      )}

      {requires.length > 0 && (
        <div
          className={
            "mx-5 mb-5 rounded-2xl border px-5 py-4 text-sm " +
            (passed
              ? "border-gold-400/60 bg-gold-400/10 text-ink-800"
              : "border-paper-200 bg-paper-50 text-ink-600")
          }
        >
          {passed ? (
            <span>
              <span className="mr-2 text-gold-600">✓</span>
              <strong className="font-semibold text-ink-950">
                Structure verified.
              </strong>{" "}
              Every required element is in the rendered document.
            </span>
          ) : (
            <>
              <strong className="font-semibold text-ink-950">Goal</strong>
              <span className="mx-1 text-gold-500">·</span>
              {spec.goal ?? "Build the markup described in the brief."}
              <ul className="mt-2 space-y-1">
                {requires.map((sel) => {
                  const missing = probe?.missing.includes(sel) ?? true;
                  return (
                    <li
                      key={sel}
                      className={
                        "font-mono text-xs " +
                        (missing ? "text-ink-500" : "text-gold-700 line-through")
                      }
                    >
                      {missing ? "○" : "✓"} {sel}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}
