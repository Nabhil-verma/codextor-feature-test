import { useState } from "react";
import { runUserCode } from "../lib/runner";
import type { PredictStep } from "../data/types";

/**
 * Predict-the-output challenges. The learner picks what a snippet prints,
 * then can verify by executing the real code in the sandbox and comparing
 * the captured console output.
 */
export default function PredictOutput({ steps }: { steps: PredictStep[] }) {
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [ranOut, setRanOut] = useState<Record<number, string[]>>({});
  const [busy, setBusy] = useState<Record<number, boolean>>({});

  const solved = steps.reduce((n, s, i) => n + (picked[i] === s.answer ? 1 : 0), 0);

  async function runIt(i: number, code: string) {
    setBusy((b) => ({ ...b, [i]: true }));
    const res = await runUserCode(code);
    setBusy((b) => ({ ...b, [i]: false }));
    setRanOut((prev) => ({
      ...prev,
      [i]: res.error ? ["Error: " + res.error] : res.logs.length ? res.logs : ["(no output)"],
    }));
  }

  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between">
        <p className="eyebrow">Predict the output</p>
        <span className="font-mono text-xs text-ink-600">
          <span className="text-gold-600">{solved}</span>/{steps.length} correct
        </span>
      </div>

      <div className="mt-4 space-y-8">
        {steps.map((step, i) => {
          const choice = picked[i];
          const isRight = choice === step.answer;
          const answered = choice !== undefined;
          return (
            <div key={i} className="card p-6">
              <p className="font-medium text-ink-950">
                <span className="mr-2 font-mono text-xs text-gold-600">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {step.prompt}
              </p>

              <div className="code-window mt-4">
                <div className="border-b border-ink-800 px-4 py-2 font-mono text-xs text-ink-600">
                  predict-{String(i + 1).padStart(2, "0")}.js
                </div>
                <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-paper-100">
                  <code>{step.code}</code>
                </pre>
              </div>

              <div className="mt-4 grid gap-2">
                {step.options.map((opt, oi) => {
                  const chosenHere = choice === oi;
                  const revealRight = answered && oi === step.answer;
                  const revealWrong = chosenHere && !isRight;
                  return (
                    <button
                      key={oi}
                      type="button"
                      onClick={() => setPicked((p) => ({ ...p, [i]: oi }))}
                      className={
                        "flex items-center gap-3 rounded-xl border px-4 py-2.5 text-left font-mono text-[13px] transition " +
                        (revealRight
                          ? "border-gold-400 bg-gold-400/10 text-ink-950"
                          : revealWrong
                            ? "border-red-300 bg-red-50 text-ink-700"
                            : "border-paper-200 text-ink-700 hover:border-gold-400/60 hover:bg-paper-100")
                      }
                    >
                      <span
                        className={
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border font-mono text-[10px] " +
                          (revealRight
                            ? "border-gold-400 bg-gold-400 text-ink-950"
                            : "border-paper-300 text-ink-600")
                        }
                      >
                        {revealRight ? "✓" : revealWrong ? "✗" : String.fromCharCode(65 + oi)}
                      </span>
                      <span className="min-w-0 break-all">{opt}</span>
                    </button>
                  );
                })}
              </div>

              {answered && (
                <div
                  className={
                    "mt-4 rounded-xl border px-4 py-3 text-sm leading-relaxed " +
                    (isRight
                      ? "border-gold-400/50 bg-gold-400/5 text-ink-700"
                      : "border-paper-200 bg-paper-100 text-ink-600")
                  }
                >
                  <span className={"font-semibold " + (isRight ? "text-gold-600" : "text-ink-950")}>
                    {isRight ? "Correct. " : "Not quite. "}
                  </span>
                  {step.explanation}
                </div>
              )}

              {step.lang && step.lang !== "js" ? (
                <p className="mt-4 font-mono text-xs text-ink-600">
                  {step.lang === "bash"
                    ? "bash snippet — mental execution only (the sandbox runs JavaScript)"
                    : step.lang + " snippet — mental execution only (the sandbox runs JavaScript)"}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => runIt(i, step.code)}
                  disabled={busy[i]}
                  className="mt-4 font-mono text-xs text-gold-600 transition hover:text-gold-500 disabled:opacity-50"
                >
                  {busy[i] ? "running…" : "▶ verify by running it"}
                </button>
              )}

              {ranOut[i] && (
                <pre className="mt-2 overflow-x-auto rounded-lg bg-ink-950 p-4 font-mono text-xs leading-relaxed text-paper-100">
                  {ranOut[i].join("\n")}
                </pre>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
