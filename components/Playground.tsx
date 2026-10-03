import { useEffect, useRef, useState } from "react";
import { runUserCode, evaluateCheck, type RunResult } from "../lib/runner";
// Type-only: erased at compile time, so the TS compiler chunk stays lazy.
import type { TsDiagnostic } from "../lib/tsRunner";
import type { Check } from "../data/types";
import HintLadder from "./HintLadder";
import ErrorNote from "./ErrorNote";
import TraceVisualizer from "./TraceVisualizer";

type Props = {
  starter: string;
  check?: Check;
  onPass?: () => void;
  /**
   * Python source installed before the learner's code, in the same fresh
   * namespace — used for deterministic fixtures (e.g. a `client` module whose
   * first two calls raise, so retry lessons are reproducible).
   */
  pythonPrelude?: string;
  /** Fires on every code edit — used by the free playground to persist */
  onCodeChange?: (code: string) => void;
  /**
   * Which runtime grades this exercise. `ts` type-checks through the real
   * compiler before running; `python` executes in a Pyodide worker.
   */
  lang?: "ts" | "python";
};

type Outcome = RunResult & { typeErrors?: TsDiagnostic[] };

export default function Playground({
  starter,
  check,
  onPass,
  onCodeChange,
  lang,
  pythonPrelude,
}: Props) {
  const [code, setCode] = useState(starter);
  const [result, setResult] = useState<Outcome | null>(null);
  const [running, setRunning] = useState(false);
  const [passed, setPassed] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [showTrace, setShowTrace] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  /*
   * Pyodide's first load is ~10–14 MB, so it starts when the exercise mounts
   * rather than when the learner presses Run — otherwise the first click
   * looks like a hang. The chunk stays out of the app bundle entirely: the
   * import is dynamic, so JavaScript lessons never download it.
   */
  useEffect(() => {
    if (lang !== "python") return;
    void import("../lib/pythonRunner").then((m) => m.preloadPython());
  }, [lang]);

  const update = (next: string) => {
    setCode(next);
    onCodeChange?.(next);
  };

  const run = async () => {
    setRunning(true);
    const r: Outcome =
      lang === "ts"
        ? await (await import("../lib/tsRunner")).runTs(code)
        : lang === "python"
          ? await (await import("../lib/pythonRunner")).runPython(code, {
              prelude: pythonPrelude,
            })
          : await runUserCode(code);
    setResult(r);
    if (check) {
      const ok =
        !r.error &&
        (r.typeErrors?.length ?? 0) === 0 &&
        evaluateCheck(check.expr, r.logs.join("\n"));
      setPassed(ok);
      setAttempts((a) => a + 1);
      if (ok) onPass?.();
    }
    setRunning(false);
  };

  const reset = () => {
    setCode(starter);
    onCodeChange?.(starter);
    setResult(null);
    setPassed(false);
    setAttempts(0);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl+Enter runs the code
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void run();
      return;
    }
    // Tab inserts two spaces instead of leaving the textarea
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = taRef.current;
      if (!ta) return;
      const { selectionStart: s, selectionEnd: end } = ta;
      const next = code.slice(0, s) + "  " + code.slice(end);
      update(next);
      requestAnimationFrame(() => ta.setSelectionRange(s + 2, s + 2));
    }
  };

  // Hints appear after two failed runs — struggle a little first.
  const showHints = !passed && attempts >= 2;

  return (
    <div className="space-y-4">
      <div className="code-window shadow-lift">
        <div className="flex items-center justify-between border-b border-ink-800 px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-ink-700" />
            <span className="h-2.5 w-2.5 rounded-full bg-ink-700" />
            <span className="h-2.5 w-2.5 rounded-full bg-gold-400" />
            <span className="ml-2 font-mono text-xs text-ink-600">
              {lang === "ts"
                ? "editor.ts"
                : lang === "python"
                  ? "editor.py"
                  : "editor.js"}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={reset}
              className="rounded-full px-3 py-1 font-mono text-xs text-ink-600 transition hover:bg-ink-800 hover:text-paper-100"
            >
              reset
            </button>
            <button
              onClick={() => void run()}
              disabled={running}
              title="Cmd/Ctrl+Enter"
              className="rounded-full bg-gold-400 px-4 py-1 font-mono text-xs font-bold text-ink-950 transition hover:bg-gold-300 disabled:opacity-50"
            >
              {running ? "running…" : "▶ Run"}
            </button>
          </div>
        </div>
        <textarea
          ref={taRef}
          value={code}
          onChange={(e) => update(e.target.value)}
          onKeyDown={onKeyDown}
          spellCheck={false}
          rows={Math.max(8, Math.min(24, code.split("\n").length + 1))}
          className="block w-full resize-y bg-ink-950 p-5 font-mono text-[13px] leading-relaxed text-paper-100 outline-none placeholder:text-ink-600"
          placeholder={
            lang === "ts"
              ? "Write some TypeScript…"
              : lang === "python"
                ? "Write some Python…"
                : "Write some JavaScript…"
          }
        />
      </div>

      {/* Type errors get an editor-style problems panel of their own */}
      {lang === "python" && (
        <p className="-mt-2 font-mono text-[11px] text-ink-500">
          Python runs in a worker (Pyodide) — stdlib only, and a runaway loop is
          terminated, not hung.
        </p>
      )}

      {result?.typeErrors && result.typeErrors.length > 0 && (
        <div className="code-window shadow-lift border border-red-400/40">
          <div className="border-b border-ink-800 px-4 py-2.5 font-mono text-xs text-red-400">
            type errors · {result.typeErrors.length}
          </div>
          <div className="max-h-48 overflow-auto p-4 font-mono text-[12px] leading-relaxed">
            {result.typeErrors.map((d, i) => (
              <p key={i} className="whitespace-pre-wrap text-red-400">
                ✗ TS{d.code} · line {d.line}, col {d.col} — {d.message}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="code-window">
        <div className="border-b border-ink-800 px-4 py-2.5 font-mono text-xs text-ink-600">
          console
        </div>
        <div className="max-h-72 overflow-auto p-5 font-mono text-[13px] leading-relaxed">
          {!result && <p className="text-ink-600">// press Run to see output</p>}
          {result?.error && <ErrorNote raw={result.error} />}
          {result?.logs.map((line, i) => (
            <div key={i} className="whitespace-pre-wrap text-paper-300">
              <span className="mr-2 select-none text-gold-500">›</span>
              {line}
            </div>
          ))}
          {result?.error && (
            <div className="mt-2 whitespace-pre-wrap text-red-400">✗ {result.error}</div>
          )}
          {result && !result.error && result.logs.length === 0 && (
            <p className="text-ink-600">
              {lang === "python"
                ? "(no output — did you call print()?)"
                : "(no output — did you call console.log?)"}
            </p>
          )}
        </div>
      </div>

      {result && lang === "ts" && (result.typeErrors?.length ?? 0) === 0 && (
        <p className="-mt-2 font-mono text-xs text-green-600">
          ✓ type check passed
        </p>
      )}

      {check && (
        <div
          className={
            "rounded-2xl border px-5 py-4 text-sm " +
            (passed
              ? "border-gold-400/60 bg-gold-400/10 text-ink-800"
              : "border-paper-200 bg-paper-50 text-ink-600")
          }
        >
          {passed ? (
            <span>
              <span className="mr-2 text-gold-600">✓</span>
              <strong className="font-semibold text-ink-950">Exercise passed.</strong>{" "}
              Elegant work.
            </span>
          ) : (
            <span>
              <strong className="font-semibold text-ink-950">Goal</strong>{" "}
              <span className="mx-1 text-gold-500">·</span> {check.hint}
            </span>
          )}
        </div>
      )}

      {/* Visual execution toggle — the stepper instruments plain JS, so
          TypeScript and Python lessons rely on their own runtimes. */}
      {lang === undefined && (
        <button
          type="button"
          onClick={() => setShowTrace((v) => !v)}
          className="w-full rounded-xl border border-dashed border-ink-200 px-4 py-2 font-mono text-xs text-ink-500 transition hover:border-gold-400 hover:text-gold-600"
        >
          {showTrace ? "▾ hide" : "▸ show"} visual execution trace
        </button>
      )}

      {lang === undefined && showTrace && <TraceVisualizer code={code} />}

      {check?.hints?.length ? (
        showHints ? (
          <HintLadder hints={check.hints} />
        ) : (
          !passed && (
            <p className="text-center font-mono text-xs text-ink-600">
              stuck? tiered hints unlock after two runs — try something first
            </p>
          )
        )
      ) : null}
    </div>
  );
}
