import { useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "framer-motion";
import MultiFile from "./MultiFile";
import { scoreDiffAttempt } from "../lib/labGrade";
import { BUG_TAXONOMY, type TaxonomyCode } from "../data/bug-taxonomy";
import type { DiffExercise } from "../data/types";

/* ═══════════════════════════════════════════════════════════════
   The multi-file review lab. The learner reads an agent's PR and
   clicks the line they would *block on*, then names the category.

   Grading is the partial-credit ladder: wrong file 0.0 · right file
   0.4 · file + line 0.7 · file + line + category 1.0. The category
   selection *is* the reasoning — deterministic, no free text.
   ═══════════════════════════════════════════════════════════════ */

type Props = {
  exercise: DiffExercise;
  /** Best score for this attempt, 0..1 — recorded by the lesson. */
  onScore?: (score: number) => void;
  /** Fired the first time the ladder reaches 1.0. */
  onPass?: () => void;
};

export default function DiffLab({ exercise, onScore, onPass }: Props) {
  const [activeFile, setActiveFile] = useState(0);
  const [picked, setPicked] = useState<{ file: string; line: number } | null>(null);
  const [category, setCategory] = useState<TaxonomyCode | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [revealed, setRevealed] = useState(0);

  const shake = useAnimationControls();
  const reduceMotion = useReducedMotion();
  const passedOnce = useRef(false);

  const solved = score === 1;

  const submit = () => {
    if (!picked || !category) return;
    const next = scoreDiffAttempt(exercise, {
      file: picked.file,
      line: picked.line,
      category,
    });
    setScore(next);
    setAttempts((a) => a + 1);
    onScore?.(next);
    if (next >= 1) {
      if (!reduceMotion) {
        void shake.start({
          scale: [1, 1.012, 1],
          transition: { duration: 0.35, ease: "easeOut" },
        });
      }
      if (!passedOnce.current) {
        passedOnce.current = true;
        onPass?.();
      }
    } else if (!reduceMotion) {
      void shake.start({
        x: [0, -8, 8, -5, 5, -2, 0],
        transition: { duration: 0.38 },
      });
    }
  };

  const reset = () => {
    setPicked(null);
    setCategory(null);
    setScore(null);
    setAttempts(0);
    setRevealed(0);
  };

  const verdict =
    score === null
      ? null
      : score >= 1
        ? {
            tone: "pass" as const,
            text: "Blocked correctly. " + exercise.planted.why,
          }
        : score >= 0.7
          ? {
              tone: "near" as const,
              text: "Right file, right line — now name the category. The reason is the category.",
            }
          : score >= 0.4
            ? {
                tone: "near" as const,
                text: "Right file — but this line isn't the defect. Pick the exact line you'd block on.",
              }
            : {
                tone: "fail" as const,
                text: "Not this file — the blocker lives elsewhere in the PR. Read the diff before clicking.",
              };

  return (
    <motion.div
      animate={shake}
      className={
        "glass glass-edge overflow-hidden rounded-2xl border transition-colors duration-300 " +
        (solved ? "border-gold-400/70" : "border-paper-200/60")
      }
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-paper-200/60 px-5 py-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-gold-600">
            ⑂ diff review
          </p>
          <h3 className="mt-1 font-display text-xl font-semibold text-ink-950">
            {exercise.title}
          </h3>
          <p className="mt-1 max-w-xl text-sm italic text-ink-600">
            “{exercise.brief}”
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-paper-200 px-2.5 py-1 font-mono text-[10px] text-ink-500">
            {attempts} {attempts === 1 ? "attempt" : "attempts"}
          </span>
          <button
            type="button"
            onClick={reset}
            className="rounded-full px-3 py-1 font-mono text-xs text-ink-600 transition hover:bg-paper-100 hover:text-ink-950"
          >
            reset
          </button>
        </div>
      </div>

      {/* Files */}
      <div className="px-5 pt-4">
        <MultiFile
          files={exercise.files.map((f) => ({
            path: f.path,
            content: f.after,
            before: f.before,
          }))}
          active={activeFile}
          onSelect={setActiveFile}
          onLineClick={(_, line) =>
            setPicked({ file: exercise.files[activeFile].path, line })
          }
          picked={picked}
          markAdded
          caption="after — click the line you would block on"
        />
      </div>

      {/* Category picker */}
      <div className="px-5 pt-5">
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-500">
          why does it block?
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {BUG_TAXONOMY.map((t) => {
            const on = category === t.code;
            return (
              <button
                key={t.code}
                type="button"
                aria-pressed={on}
                onClick={() => setCategory(t.code)}
                className={
                  "rounded-xl border px-4 py-2.5 text-left transition " +
                  (on
                    ? "border-gold-400 bg-gold-400/10"
                    : "border-paper-200 hover:border-gold-400/60 hover:bg-paper-100")
                }
              >
                <span className="font-mono text-xs font-bold text-gold-600">
                  {t.code}
                </span>
                <span className="ml-2 text-sm font-medium text-ink-950">
                  {t.label}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-ink-600">
                  {t.blurb}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={submit}
            disabled={!picked || !category}
            className="btn-primary !px-5 !py-2 text-sm disabled:opacity-50"
          >
            {attempts === 0 ? "Submit review" : "Submit again"}
          </button>
          {picked && (
            <span className="font-mono text-[11px] text-ink-500">
              picked: {picked.file}:{picked.line}
            </span>
          )}
          {!picked && (
            <span className="font-mono text-[11px] text-ink-500">
              click a line, then choose the category
            </span>
          )}
        </div>
      </div>

      {/* Verdict */}
      <AnimatePresence mode="wait">
        {verdict && (
          <motion.div
            key={verdict.tone + String(score)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className={
              "mx-5 mt-4 rounded-2xl border px-5 py-4 text-sm " +
              (verdict.tone === "pass"
                ? "border-gold-400/60 bg-gold-400/10 text-ink-800"
                : verdict.tone === "near"
                  ? "border-ink-300 bg-paper-100 text-ink-700"
                  : "border-red-300 bg-red-50 text-red-700")
            }
          >
            {verdict.tone === "pass" ? (
              <span>
                <span className="mr-2 text-gold-600">✓</span>
                <strong className="font-semibold text-ink-950">Correct.</strong>{" "}
                {verdict.text}
              </span>
            ) : (
              <span>{verdict.text}</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Distractors — revealed only after full credit, so they don't spoil the hunt */}
      {solved && (
        <div className="mx-5 mt-4 rounded-2xl border border-paper-200 bg-paper-50/70 px-5 py-4">
          <p className="font-mono text-[11px] uppercase tracking-widest text-ink-500">
            looked suspicious, wasn't a blocker
          </p>
          <ul className="mt-2 space-y-1.5">
            {exercise.distractors.map((d) => (
              <li key={d} className="text-sm leading-relaxed text-ink-600">
                · {d}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Hint ladder */}
      <div className="space-y-2 px-5 pb-5 pt-4">
        <AnimatePresence initial={false}>
          {exercise.hints.slice(0, revealed).map((h, i) => (
            <motion.div
              key={h.tier}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="rounded-xl border border-gold-400/30 bg-gold-400/5 px-4 py-2.5 text-sm text-ink-700">
                <span className="mr-2 font-mono text-xs text-gold-600">
                  hint {i + 1}
                </span>
                {h.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {!solved && revealed < exercise.hints.length && (
          <button
            type="button"
            onClick={() => setRevealed((r) => r + 1)}
            className="font-mono text-xs text-gold-600 hover:text-gold-500"
          >
            {revealed === 0 ? "stuck? take a hint →" : "reveal next hint →"}
          </button>
        )}
      </div>
    </motion.div>
  );
}
