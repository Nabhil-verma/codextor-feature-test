import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { evaluateRubric } from "../lib/labGrade";
import type { RubricExercise } from "../data/types";

/* ═══════════════════════════════════════════════════════════════
   Written deliverables, graded by rubric.

   Some criteria are machine-checked: the existing check grammar
   runs over the learner's lower-cased text bound as `output`
   (e.g. `output.includes("non-goal")`). The rest are judgment
   calls the learner attests to. Scores are weighted and partial;
   the lesson completes only when every criterion is met — which
   matches the honest limits the plan states: the note is
   self-authored, so it is portfolio evidence, not trustless proof.
   ═══════════════════════════════════════════════════════════════ */

type Props = {
  exercise: RubricExercise;
  onScore?: (score: number) => void;
  onPass?: () => void;
};

export default function Rubric({ exercise, onScore, onPass }: Props) {
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [lastSubmitted, setLastSubmitted] = useState("");
  const [claims, setClaims] = useState<Record<string, boolean>>({});
  const passedOnce = useRef(false);
  const [showExemplar, setShowExemplar] = useState(false);

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const minWords = exercise.minWords ?? 0;
  const enough = words >= minWords;
  const dirty = submitted && text !== lastSubmitted;

  const result = submitted ? evaluateRubric(exercise, text, claims) : null;

  const finish = (score: number) => {
    onScore?.(score);
    if (score >= 1 && !passedOnce.current) {
      passedOnce.current = true;
      onPass?.();
    }
  };

  const submit = () => {
    const r = evaluateRubric(exercise, text, claims);
    setSubmitted(true);
    setLastSubmitted(text);
    finish(r.score);
  };

  const toggleClaim = (id: string) => {
    const next = { ...claims, [id]: !claims[id] };
    setClaims(next);
    if (submitted) finish(evaluateRubric(exercise, text, next).score);
  };

  return (
    <div
      className={
        "glass glass-edge overflow-hidden rounded-2xl border transition-colors duration-300 " +
        (result && result.score >= 1 ? "border-gold-400/70" : "border-paper-200/60")
      }
    >
      <div className="border-b border-paper-200/60 px-5 py-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-gold-600">
          ✎ written deliverable
        </p>
        <h3 className="mt-1 font-display text-xl font-semibold text-ink-950">
          {exercise.title}
        </h3>
        <p className="mt-1 max-w-xl text-sm text-ink-600">
          <strong className="font-semibold text-ink-800">{exercise.prompt}</strong>{" "}
          {exercise.brief}
        </p>
      </div>

      <div className="px-5 pt-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck
          rows={9}
          aria-label={exercise.prompt}
          placeholder="Write your deliverable here…"
          className="block w-full resize-y rounded-2xl border border-paper-200 bg-paper-50/70 p-4 text-sm leading-relaxed text-ink-900 outline-none transition focus:border-gold-400"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-[11px] text-ink-500">
            {words} words{minWords ? ` · ${minWords} minimum` : ""}
          </span>
          <button
            type="button"
            onClick={submit}
            disabled={!enough || !text.trim()}
            className="btn-primary !px-5 !py-2 text-sm disabled:opacity-50"
          >
            {submitted ? "Check again" : "Submit draft"}
          </button>
        </div>
        {!enough && minWords > 0 && (
          <p className="mt-1 font-mono text-[11px] text-ink-500">
            keep going — a rubric can only grade an attempt that exists
          </p>
        )}
        {dirty && (
          <p className="mt-1 font-mono text-[11px] text-gold-600">
            edited since the last check — submit again to re-grade
          </p>
        )}
      </div>

      {/* Rubric results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="px-5 pt-5"
          >
            <p className="font-mono text-[11px] uppercase tracking-widest text-ink-500">
              criteria — {Math.round(result.score * 100)}%
            </p>
            <ul className="mt-3 space-y-2">
              {result.results.map((r) => (
                <li
                  key={r.id}
                  className={
                    "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm " +
                    (r.met
                      ? "border-gold-400/50 bg-gold-400/5"
                      : "border-paper-200 bg-paper-50/60")
                  }
                >
                  {r.auto ? (
                    <span
                      aria-hidden
                      className={
                        "mt-0.5 font-mono text-xs " +
                        (r.met ? "text-gold-600" : "text-red-500")
                      }
                    >
                      {r.met ? "✓" : "✗"}
                    </span>
                  ) : (
                    <input
                      type="checkbox"
                      checked={claims[r.id] === true}
                      onChange={() => toggleClaim(r.id)}
                      className="mt-1 accent-gold-500"
                      aria-label={r.label}
                    />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="text-ink-800">{r.label}</span>
                    <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-ink-400">
                      {r.auto ? "checked" : "self-attest"}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            {result.score >= 1 ? (
              <p className="mt-3 text-sm text-gold-700">
                ✓ Every criterion met. This deliverable is portfolio evidence —
                copy it into your repo.
              </p>
            ) : (
              <p className="mt-3 text-sm text-ink-600">
                Revise the draft and check again — the lesson completes when
                every criterion is met.
              </p>
            )}

            {!showExemplar ? (
              <button
                type="button"
                onClick={() => setShowExemplar(true)}
                className="mt-3 font-mono text-xs text-gold-600 hover:text-gold-500"
              >
                compare with the exemplar →
              </button>
            ) : (
              <div className="mt-3 rounded-xl border border-paper-200 bg-paper-50/70 p-4">
                <p className="font-mono text-[11px] uppercase tracking-widest text-ink-500">
                  exemplar
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-700">
                  {exercise.exemplar}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-5" />
    </div>
  );
}
