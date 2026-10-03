import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useAnimationControls,
  useReducedMotion,
} from "framer-motion";
import type { QuizQuestion } from "../../data/types";

/* ═══════════════════════════════════════════════════════════════
   Same questions as the standard quiz, played as a timed gauntlet:
   a shrinking clock, a combo counter, a satisfying snap when you're
   right, and a real screen shake when you're wrong. Reaction beats
   recognition beats reading.
   ═══════════════════════════════════════════════════════════════ */

const LABELS = ["A", "B", "C", "D", "E", "F"];
const REVEAL_MS = 950;

export default function RapidFire({
  questions,
  onScore,
  seconds = 10,
}: {
  questions: QuizQuestion[];
  onScore: (score: number) => void;
  /** Seconds allowed per question before it counts as a miss */
  seconds?: number;
}) {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [remaining, setRemaining] = useState(seconds);
  const [finished, setFinished] = useState(false);

  const shake = useAnimationControls();
  const pop = useAnimationControls();
  const reduceMotion = useReducedMotion();

  const idxRef = useRef(0);
  const scoredRef = useRef(false);
  const answerRef = useRef<(choice: number | null) => void>(() => {});

  const q = questions[Math.min(idx, questions.length - 1)];

  /* Latest-ref pattern: the countdown effect must call the *current* answer
     handler without re-subscribing on every keystroke of state. */
  answerRef.current = (choice: number | null) => {
    if (locked || finished) return;
    setLocked(true);
    setPicked(choice);

    if (choice === q.answer) {
      setCorrect((c) => c + 1);
      setCombo((c) => {
        const next = c + 1;
        setBestCombo((b) => Math.max(b, next));
        return next;
      });
      if (!reduceMotion) {
        void pop.start({
          scale: [1, 1.035, 1],
          transition: { duration: 0.32, ease: "easeOut" },
        });
      }
    } else {
      setCombo(0);
      if (!reduceMotion) {
        void shake.start({
          x: [0, -11, 11, -7, 7, -3, 0],
          transition: { duration: 0.42 },
        });
      }
    }

    window.setTimeout(() => {
      const next = idxRef.current + 1;
      setPicked(null);
      setLocked(false);
      setRemaining(seconds);
      if (next >= questions.length) {
        setFinished(true);
        return;
      }
      idxRef.current = next;
      setIdx(next);
    }, REVEAL_MS);
  };

  /* Countdown. Hitting zero locks the question as a miss. */
  useEffect(() => {
    if (locked || finished) return;
    if (remaining <= 0) {
      answerRef.current(null);
      return;
    }
    const t = window.setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => window.clearTimeout(t);
  }, [remaining, locked, finished]);

  /* Report the score exactly once per run. */
  useEffect(() => {
    if (finished && !scoredRef.current && questions.length > 0) {
      scoredRef.current = true;
      onScore(correct / questions.length);
    }
    if (!finished) scoredRef.current = false;
  }, [finished, correct, questions.length, onScore]);

  const restart = () => {
    idxRef.current = 0;
    scoredRef.current = false;
    setIdx(0);
    setPicked(null);
    setLocked(false);
    setCombo(0);
    setBestCombo(0);
    setCorrect(0);
    setRemaining(seconds);
    setFinished(false);
  };

  if (!questions.length) return null;

  if (finished) {
    const score = correct / questions.length;
    const perfect = score >= 1;
    return (
      <motion.div
        className="glass glass-edge rounded-2xl border border-paper-200/60 p-8 text-center"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.p
          className="text-5xl"
          aria-hidden
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 14 }}
        >
          {perfect ? "🏆" : score >= 0.6 ? "⚡" : "💀"}
        </motion.p>
        <p className="mt-4 font-display text-2xl font-semibold text-ink-950">
          {perfect
            ? "Flawless under pressure"
            : score >= 0.6
              ? "Solid reflexes"
              : "The clock won this round"}
        </p>
        <p className="mt-2 font-mono text-sm text-ink-600">
          {correct}/{questions.length} correct · best combo ×{bestCombo}
        </p>
        <p className="mx-auto mt-3 max-w-sm text-sm text-ink-600">
          {perfect
            ? "100% — this counts exactly like a perfect standard quiz, plus a flawless XP bonus."
            : "Rapid fire rewards speed, but only a perfect run completes the lesson."}
        </p>
        <button onClick={restart} className="btn-primary mt-6 !px-6 !py-2 text-sm">
          Run it again ↻
        </button>
      </motion.div>
    );
  }

  const isCorrectPick = locked && picked === q.answer;
  const isWrongPick = locked && picked !== null && picked !== q.answer;

  return (
    <motion.div
      animate={shake}
      className={
        "glass glass-edge relative overflow-hidden rounded-2xl border p-6 transition-colors duration-300 " +
        (isCorrectPick
          ? "border-gold-400/70"
          : isWrongPick
            ? "border-red-400/70"
            : "border-paper-200/60")
      }
    >
      {/* Correct-answer flash */}
      <AnimatePresence>
        {isCorrectPick && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gold-400/10"
            initial={{ opacity: 0.9 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          />
        )}
      </AnimatePresence>

      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="eyebrow">rapid fire</span>
          <span className="font-mono text-[11px] text-ink-500">
            {idx + 1}/{questions.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <AnimatePresence mode="popLayout">
            {combo >= 2 && (
              <motion.span
                key={combo}
                className="rounded-full border border-orange-400/60 bg-orange-400/10 px-3 py-1 font-mono text-[11px] font-bold text-orange-500"
                initial={{ scale: 0.5, opacity: 0, y: 6 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 20 }}
              >
                🔥 combo ×{combo}
              </motion.span>
            )}
          </AnimatePresence>
          <motion.span
            key={remaining}
            className={
              "flex h-9 w-9 items-center justify-center rounded-full border font-mono text-sm font-bold " +
              (remaining <= 3
                ? "border-red-400 text-red-500"
                : "border-paper-300 text-ink-700")
            }
            initial={{ scale: 1.25 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 18 }}
            aria-label={`${remaining} seconds left`}
          >
            {remaining}
          </motion.span>
        </div>
      </div>

      {/* Clock bar */}
      <div className="relative mt-3 h-1.5 w-full overflow-hidden rounded-full bg-paper-200">
        <motion.div
          className={
            "h-full rounded-full " +
            (remaining <= 3
              ? "bg-gradient-to-r from-red-500 to-orange-400"
              : "bg-gradient-to-r from-gold-500 to-gold-300")
          }
          animate={{ width: (remaining / seconds) * 100 + "%" }}
          transition={{ duration: 0.9, ease: "linear" }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -28 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="relative mt-5"
        >
          <p className="font-display text-lg font-medium text-ink-950">{q.q}</p>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {q.options.map((opt, oi) => {
              const chosen = picked === oi;
              const correctOpt = locked && oi === q.answer;
              const wrongOpt = locked && chosen && oi !== q.answer;
              return (
                <motion.button
                  key={oi}
                  type="button"
                  disabled={locked}
                  onClick={() => answerRef.current(oi)}
                  className={
                    "flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition " +
                    (correctOpt
                      ? "border-gold-400 bg-gold-400/15 text-ink-950"
                      : wrongOpt
                        ? "border-red-400 bg-red-50 text-red-700"
                        : locked
                          ? "border-paper-200 text-ink-400"
                          : "border-paper-200 text-ink-800 hover:-translate-y-0.5 hover:border-gold-400/70 hover:bg-paper-100 hover:shadow-lift")
                  }
                  animate={
                    correctOpt
                      ? { scale: [1, 1.03, 1] }
                      : wrongOpt
                        ? { x: [0, -5, 5, 0] }
                        : { scale: 1, x: 0 }
                  }
                  transition={{ duration: 0.35 }}
                  whileTap={locked ? undefined : { scale: 0.98 }}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-ink-950 font-mono text-[10px] font-bold text-gold-300">
                    {LABELS[oi]}
                  </span>
                  {opt}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {locked && (
          <motion.p
            className={
              "relative mt-4 text-sm leading-relaxed " +
              (isCorrectPick ? "text-gold-700" : "text-red-600")
            }
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {isCorrectPick ? "✓ Snapped. " : picked === null ? "⏱ Too slow. " : "✗ "}
            <span className="text-ink-600">{q.explanation}</span>
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
