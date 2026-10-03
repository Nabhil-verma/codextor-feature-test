import { useRef, useState } from "react";
import { motion } from "framer-motion";
import MultiFile from "./MultiFile";
import { scoreLocate, scoreSelect } from "../lib/labGrade";
import type { RepoExercise } from "../data/types";

/* ═══════════════════════════════════════════════════════════════
   Codebase archaeology. One repo snapshot, three gradable
   questions: locate a hop (file → symbol ladder), find the callers
   (exact-set multi-select), and compute a rename's blast radius.

   Same deterministic grader family as the diff lab, different
   answer key: selection against author-declared targets, no
   execution and no LLM in the loop.
   ═══════════════════════════════════════════════════════════════ */

type Props = {
  exercise: RepoExercise;
  onScore?: (score: number) => void;
  /** Fired once every question is answered and the average is 1.0. */
  onPass?: () => void;
};

type LocatePick = { file: string; symbol: string };

export default function RepoLab({ exercise, onScore, onPass }: Props) {
  const [activeFile, setActiveFile] = useState(0);
  const [locate, setLocate] = useState<Record<number, LocatePick>>({});
  const [selected, setSelected] = useState<Record<number, number[]>>({});
  const [scores, setScores] = useState<Record<number, number>>({});
  const passedOnce = useRef(false);

  const total = exercise.questions.length;

  const submit = (i: number) => {
    const q = exercise.questions[i];
    const score =
      q.kind === "locate"
        ? scoreLocate(q, locate[i] ?? null)
        : scoreSelect(q, selected[i] ?? []);
    const next = { ...scores, [i]: score };
    setScores(next);

    const answered = exercise.questions.reduce(
      (sum, _, qi) => sum + (next[qi] ?? 0),
      0
    );
    const overall = answered / total;
    onScore?.(overall);
    if (
      exercise.questions.every((_, qi) => next[qi] !== undefined) &&
      overall >= 1 &&
      !passedOnce.current
    ) {
      passedOnce.current = true;
      onPass?.();
    }
  };

  const toggleOption = (i: number, option: number) => {
    setSelected((s) => {
      const list = s[i] ?? [];
      return {
        ...s,
        [i]: list.includes(option)
          ? list.filter((o) => o !== option)
          : [...list, option],
      };
    });
  };

  return (
    <div className="glass glass-edge overflow-hidden rounded-2xl border border-paper-200/60">
      <div className="border-b border-paper-200/60 px-5 py-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-gold-600">
          ⌖ repo trace
        </p>
        <h3 className="mt-1 font-display text-xl font-semibold text-ink-950">
          {exercise.title}
        </h3>
        <p className="mt-1 max-w-xl text-sm text-ink-600">{exercise.brief}</p>
      </div>

      <div className="px-5 pt-4">
        <MultiFile
          files={exercise.files.map((f) => ({ path: f.path, content: f.content }))}
          active={activeFile}
          onSelect={setActiveFile}
          caption="read-only snapshot"
        />
      </div>

      <div className="space-y-5 px-5 pb-6 pt-5">
        {exercise.questions.map((q, i) => {
          const s = scores[i];
          const done = s !== undefined;
          const files = Array.from(new Set(q.kind === "locate" ? q.choices.map((c) => c.file) : []));
          const picked = locate[i];
          const symbols =
            q.kind === "locate" && picked
              ? q.choices.filter((c) => c.file === picked.file).map((c) => c.symbol)
              : [];

          return (
            <div
              key={i}
              className={
                "rounded-2xl border p-5 " +
                (done && s >= 1
                  ? "border-gold-400/60 bg-gold-400/5"
                  : "border-paper-200 bg-paper-50/50")
              }
            >
              <p className="font-mono text-[11px] uppercase tracking-widest text-ink-500">
                question {i + 1}
              </p>
              <p className="mt-1 text-sm font-medium text-ink-900">{q.prompt}</p>

              {q.kind === "locate" ? (
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <label className="text-xs text-ink-600">
                    file
                    <select
                      className="mt-1 block rounded-lg border border-paper-200 bg-paper-50 px-3 py-2 font-mono text-xs text-ink-900 outline-none focus:border-gold-400"
                      value={picked?.file ?? ""}
                      onChange={(e) =>
                        setLocate((l) => ({ ...l, [i]: { file: e.target.value, symbol: "" } }))
                      }
                    >
                      <option value="">choose a file…</option>
                      {files.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-ink-600">
                    function
                    <select
                      className="mt-1 block rounded-lg border border-paper-200 bg-paper-50 px-3 py-2 font-mono text-xs text-ink-900 outline-none focus:border-gold-400 disabled:opacity-50"
                      value={picked?.symbol ?? ""}
                      disabled={!picked}
                      onChange={(e) =>
                        setLocate((l) => ({
                          ...l,
                          [i]: { file: l[i]?.file ?? "", symbol: e.target.value },
                        }))
                      }
                    >
                      <option value="">choose a symbol…</option>
                      {symbols.map((sym) => (
                        <option key={sym} value={sym}>
                          {sym}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {q.options.map((o, oi) => {
                    const on = (selected[i] ?? []).includes(oi);
                    return (
                      <label
                        key={oi}
                        className={
                          "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-2.5 text-sm transition " +
                          (on
                            ? "border-gold-400 bg-gold-400/10"
                            : "border-paper-200 hover:border-gold-400/60 hover:bg-paper-100")
                        }
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => toggleOption(i, oi)}
                          className="mt-1 accent-gold-500"
                        />
                        <span className="font-mono text-xs text-ink-800">{o.label}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => submit(i)}
                  disabled={
                    q.kind === "locate"
                      ? !picked?.file || !picked?.symbol
                      : (selected[i] ?? []).length === 0
                  }
                  className="btn-primary !px-4 !py-1.5 text-xs disabled:opacity-50"
                >
                  {done ? "Submit again" : "Submit answer"}
                </button>
                {done && (
                  <motion.span
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={
                      "font-mono text-xs " +
                      (s >= 1 ? "text-gold-600" : s > 0 ? "text-ink-600" : "text-red-600")
                    }
                  >
                    {s >= 1
                      ? "✓ exact"
                      : s > 0
                        ? `partial credit: ${Math.round(s * 100)}%`
                        : "✗ not yet"}
                  </motion.span>
                )}
              </div>

              {done && (
                <p className="mt-3 rounded-xl border border-paper-200 bg-paper-50/70 px-4 py-3 text-sm leading-relaxed text-ink-600">
                  {q.why}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
