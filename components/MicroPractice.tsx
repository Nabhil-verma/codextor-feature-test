import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { shuffled } from "../lib/shuffle";

/* ═══════════════════════════════════════════════════════════════
   Quick practice: six short exercises (rebuild code, match
   vocabulary, hunt a real bug) that sit beside the curriculum.

   Feedback rules learned from the first cohort:
   · a wrong answer says WHICH line is out of place and why, instead
     of repeating the prompt as an error message;
   · a Hint button hands out the reasoning before you guess;
   · every question can be revisited (previous / next / dots);
   · clearing all six is its own reward screen.
   ═══════════════════════════════════════════════════════════════ */

type BaseQ = {
  id: string;
  prompt: string;
  /** the reasoning, offered up front via the Hint button */
  hint: string;
  /** the full explanation, shown once the question is solved */
  why: string;
};

/** Sort shuffled lines back into a runnable order. */
type AssemblyQ = BaseQ & { type: "assembly"; lines: string[] };
/** Pair each term with its meaning. */
type MatchingQ = BaseQ & { type: "matching"; pairs: [string, string][] };
/** Click the one line that's actually broken. */
type SpotQ = BaseQ & {
  type: "spot";
  lines: string[];
  /** index of the buggy line */
  buggy: number;
  /** one line per entry: why the OTHER lines are innocent */
  notes: string[];
  /** the corrected program */
  fixed: string[];
};

type PracticeQ = AssemblyQ | MatchingQ | SpotQ;

const QUESTIONS: PracticeQ[] = [
  {
    id: "assembly-loop",
    type: "assembly",
    prompt: "Arrange these lines to print the numbers 1 through 5:",
    // NOTE: this array IS the answer — it must read in runnable order. It used
    // to list the closing brace before the loop body, so the exercise could
    // never be solved no matter how the lines were arranged.
    lines: ["for (let i = 1; i <= 5; i++) {", "  console.log(i);", "}"],
    hint:
      "JavaScript reads top to bottom, and a block only closes once the work inside it is done. Which line opens the block, which one is the work, and which one ends it?",
    why:
      "The for header sets up the counter, the body logs each value, and the closing brace ends the block. A } placed above the line it closes would end the loop before anything ran.",
  },
  {
    id: "match-declarations",
    type: "matching",
    prompt: "Match each keyword to its purpose:",
    pairs: [
      ["const", "Declares a value that can't be reassigned"],
      ["let", "Declares a value that can change"],
      ["var", "Old-style declaration (function-scoped)"],
    ],
    hint:
      "Only one of the three promises the binding never changes. The other modern one allows reassignment, and the third predates both.",
    why:
      "const locks the binding (the value inside can still be mutated), let is the normal choice when the value changes, and var is the pre-ES6 form whose scoping surprises people.",
  },
  {
    id: "spot-string-math",
    type: "spot",
    prompt: "This should print 13. Exactly one line is wrong — click it:",
    lines: ["const a = 6;", "const b = 7;", 'console.log("a + b");'],
    buggy: 2,
    notes: [
      "Numbers can be stored anywhere — this line is a plain binding.",
      "Also fine: it stores a number, not a string.",
      "This is the one. Look closely at what's inside the parentheses.",
    ],
    fixed: ["const a = 6;", "const b = 7;", "console.log(a + b);"],
    hint:
      "Numbers add; strings join. If the maths ever lands inside quotes, the quotes win and you get text back.",
    why:
      'The quotes make "a + b" a string literal, so the console prints the characters a + b instead of adding the two variables. Remove them and the expression is evaluated: 13.',
  },
  {
    id: "assembly-function",
    type: "assembly",
    prompt: "Arrange these lines to define a function and call it:",
    lines: ["function double(n) {", "  return n * 2;", "}", "double(5)"],
    hint:
      "A declaration opens, its body sits inside the braces, and the closing brace has to come before anything tries to call it.",
    why:
      "Declaration → body with the return → closing brace → call. You can only call a function after the block it lives in has been closed.",
  },
  {
    id: "spot-off-by-one",
    type: "spot",
    prompt: 'This should log "Ada" and "Lin" and stop. Exactly one line is wrong — click it:',
    lines: [
      'const names = ["Ada", "Lin"];',
      "for (let i = 0; i <= names.length; i++) {",
      "  console.log(names[i]);",
      "}",
    ],
    buggy: 1,
    notes: [
      "The array itself is fine — two entries, indexes 0 and 1.",
      "This is the one. Compare the comparison with the last valid index.",
      "Logging the value at i is exactly right.",
      "Closing the loop correctly isn't the problem here.",
    ],
    fixed: [
      'const names = ["Ada", "Lin"];',
      "for (let i = 0; i < names.length; i++) {",
      "  console.log(names[i]);",
      "}",
    ],
    hint:
      "Indexes start at 0. For a 2-item array the last valid index is 1, so what does the loop condition do on i = 2?",
    why:
      "`i <= names.length` allows i to reach 2, but this array only has indexes 0 and 1 — so the last pass reads past the end and logs undefined. Using `<` stops at the last valid index.",
  },
  {
    id: "match-array-methods",
    type: "matching",
    prompt: "Match the array method to what it does:",
    pairs: [
      [".map()", "Transforms each element"],
      [".filter()", "Keeps elements that pass a test"],
      [".reduce()", "Accumulates into a single value"],
    ],
    hint:
      "One method always returns an array of the same length, one returns a shorter (or equal) array, and one returns whatever you decide.",
    why:
      "map transforms 1:1, filter keeps or drops each element, and reduce folds the whole array down to a single value.",
  },
];

/* Content is fixed, so the labels are too — no need to recompute per render. */
const LABELS: Record<PracticeQ["type"], string> = {
  assembly: "code assembly",
  matching: "matching",
  spot: "spot the bug",
};

/* ───────────────────────── chance to ask for help ───────────────────────── */

function HintRow({ hint, open, onToggle }: { hint: string; open: boolean; onToggle: () => void }) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="font-mono text-[11px] uppercase tracking-widest text-gold-600 transition hover:text-gold-500"
      >
        {open ? "hide hint" : "need a hint?"}
      </button>
      {open && (
        <p className="mt-2 rounded-xl border border-gold-400/30 bg-gold-400/[0.08] px-4 py-3 text-sm leading-relaxed text-ink-700">
          {hint}
        </p>
      )}
    </div>
  );
}

/** The shared "you got it" panel, so all three card types read the same. */
function Solved({ children }: { children: string }) {
  return (
    <div className="rounded-xl border border-green-300 bg-green-50 px-4 py-3">
      <p className="font-mono text-xs font-bold uppercase tracking-widest text-green-700">
        ✓ correct
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-700">{children}</p>
    </div>
  );
}

/* ───────────────────────────── assembly card ───────────────────────────── */

function AssemblyCard({ q, onSolved }: { q: AssemblyQ; onSolved: () => void }) {
  // `shuffled` guarantees the card never opens in the runnable order.
  const [order, setOrder] = useState(() => shuffled(q.lines));
  const [checked, setChecked] = useState(false);
  const correct = order.every((line, i) => line === q.lines[i]);
  const firstWrong = order.findIndex((line, i) => line !== q.lines[i]);

  const move = (from: number, dir: -1 | 1) => {
    const to = from + dir;
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    [next[from], next[to]] = [next[to], next[from]];
    setOrder(next);
    setChecked(false); // a new order deserves a fresh verdict
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-700">{q.prompt}</p>
      <div className="space-y-1">
        {order.map((line, i) => (
          <div
            key={line}
            className={
              "flex items-center gap-2 rounded-lg border px-3 py-2 font-mono text-[13px] " +
              (checked && i === firstWrong
                ? "border-red-300 bg-red-50 text-red-700"
                : "border-paper-200 bg-paper-50 text-ink-800")
            }
          >
            <button
              type="button"
              aria-label={"Move line " + (i + 1) + " up"}
              onClick={() => move(i, -1)}
              disabled={i === 0}
              className="text-ink-400 transition hover:text-gold-600 disabled:opacity-20"
            >
              {"\u25B2"}
            </button>
            <button
              type="button"
              aria-label={"Move line " + (i + 1) + " down"}
              onClick={() => move(i, 1)}
              disabled={i === order.length - 1}
              className="text-ink-400 transition hover:text-gold-600 disabled:opacity-20"
            >
              {"\u25BC"}
            </button>
            <span className="w-4 shrink-0 font-mono text-[10px] text-ink-400">{i + 1}</span>
            <span className="flex-1 whitespace-pre">{line}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setChecked(true);
            if (correct) onSolved();
          }}
          className="rounded-full bg-gold-400 px-5 py-1.5 font-mono text-xs font-bold text-ink-950 transition hover:bg-gold-300"
        >
          {checked && !correct ? "Check again" : "Check order"}
        </button>
        {checked && !correct && <span className="font-mono text-[11px] text-red-600">not yet</span>}
      </div>

      {checked &&
        (correct ? (
          <Solved>{q.why}</Solved>
        ) : (
          <div className="rounded-xl border border-red-200 bg-red-50/70 px-4 py-3">
            <p className="text-sm leading-relaxed text-red-700">
              Line {firstWrong + 1} is the first one out of place — “{order[firstWrong]}” isn't where
              it belongs yet.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink-700">{q.why}</p>
          </div>
        ))}
    </div>
  );
}

/* ───────────────────────────── matching card ───────────────────────────── */

function MatchingCard({ q, onSolved }: { q: MatchingQ; onSolved: () => void }) {
  const pairs = q.pairs;
  const [lefts] = useState(() => shuffled(pairs.map((p) => p[0])));
  const [rights] = useState(() => shuffled(pairs.map((p) => p[1])));
  const [selL, setSelL] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<string | null>(null);

  const allDone = matched.size === pairs.length;

  useEffect(() => {
    if (allDone) onSolved();
  }, [allDone, onSolved]);

  const tryMatch = (right: string) => {
    if (!selL) return;
    const correctPair = pairs.find((p) => p[0] === selL);
    if (correctPair && correctPair[1] === right) {
      setMatched((s) => new Set(s).add(selL));
      setSelL(null);
    } else {
      setWrong(selL + right);
      setTimeout(() => setWrong(null), 800);
      setSelL(null);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-700">{q.prompt}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          {lefts.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setSelL(matched.has(l) ? null : l)}
              className={`block w-full rounded-lg border px-3 py-2 text-left font-mono text-[13px] transition ${
                matched.has(l)
                  ? "border-green-400 bg-green-50 text-green-700"
                  : selL === l
                    ? "border-gold-400 bg-gold-400/10 text-gold-700 ring-2 ring-gold-400/30"
                    : wrong?.includes(l)
                      ? "border-red-300 bg-red-50 text-red-600"
                      : "border-paper-200 text-ink-800 hover:border-gold-300"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="space-y-1.5">
          {rights.map((r) => {
            const leftFor = pairs.find((p) => p[1] === r)?.[0];
            const isMatched = !!leftFor && matched.has(leftFor);
            return (
              <button
                key={r}
                type="button"
                onClick={() => tryMatch(r)}
                disabled={isMatched}
                className={`block w-full rounded-lg border px-3 py-2 text-left text-[13px] transition ${
                  isMatched
                    ? "border-green-400 bg-green-50 text-green-700"
                    : wrong?.includes(r)
                      ? "border-red-300 bg-red-50 text-red-600"
                      : "border-paper-200 text-ink-700 hover:border-gold-300"
                }`}
              >
                {r}
              </button>
            );
          })}
        </div>
      </div>
      {selL && (
        <p className="font-mono text-[11px] text-ink-500">
          “{selL}” selected — now pick the meaning on the right.
        </p>
      )}
      {allDone && <Solved>{q.why}</Solved>}
    </div>
  );
}

/* ──────────────────────────── spot-the-bug card ──────────────────────────── */

function SpotCard({ q, onSolved }: { q: SpotQ; onSolved: () => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const [found, setFound] = useState<number | null>(null);

  const pick = (i: number) => {
    if (found !== null) return;
    setPicked(i);
    if (i === q.buggy) {
      setFound(i);
      onSolved();
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-700">{q.prompt}</p>
      <div className="space-y-1 rounded-xl border border-paper-200 bg-paper-100/60 p-2">
        {q.lines.map((line, i) => {
          const isFound = found === i;
          const isWrongPick = found === null && picked === i && i !== q.buggy;
          return (
            <button
              key={i}
              type="button"
              onClick={() => pick(i)}
              disabled={found !== null}
              className={
                "flex w-full items-start gap-3 rounded-lg px-3 py-1.5 text-left font-mono text-[12.5px] transition " +
                (isFound
                  ? "bg-red-500/15 text-red-700 ring-1 ring-red-400"
                  : isWrongPick
                    ? "bg-paper-50 text-ink-500 ring-1 ring-paper-300"
                    : "text-ink-800 hover:bg-paper-50")
              }
            >
              <span className="w-4 shrink-0 text-right text-[10px] text-ink-400">{i + 1}</span>
              <span className="whitespace-pre">{line}</span>
            </button>
          );
        })}
      </div>

      {picked !== null && found === null && (
        <p className="rounded-xl border border-paper-300 bg-paper-50 px-4 py-3 text-sm leading-relaxed text-ink-700">
          Not that one — {q.notes[picked]} Keep looking.
        </p>
      )}

      {found !== null && (
        <div className="space-y-3">
          <Solved>{q.why}</Solved>
          <div className="rounded-xl border border-green-300 bg-green-50 p-4">
            <p className="font-mono text-[11px] uppercase tracking-widest text-green-700">
              the fix
            </p>
            <pre className="mt-2 overflow-x-auto font-mono text-[12px] leading-relaxed text-green-800">
              {q.fixed.join("\n")}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────── the board ─────────────────────────────── */

export default function MicroPractice() {
  const [idx, setIdx] = useState(0);
  const [solved, setSolved] = useState<boolean[]>(() => QUESTIONS.map(() => false));
  const [hintOpen, setHintOpen] = useState(false);

  const q = QUESTIONS[idx];
  const solvedCount = solved.filter(Boolean).length;
  const allSolved = solvedCount === QUESTIONS.length;

  useEffect(() => {
    setHintOpen(false);
  }, [idx]);

  const markSolved = (i: number) =>
    setSolved((s) => (s[i] ? s : s.map((v, j) => (j === i ? true : v))));

  const restart = () => {
    setSolved(QUESTIONS.map(() => false));
    setIdx(0);
    setHintOpen(false);
  };

  return (
    <div className="mx-auto max-w-lg space-y-5">
      {/* header: where you are, how far you've got */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-500">
          micro practice {"\u00B7"} {idx + 1}/{QUESTIONS.length} {"\u00B7"} {solvedCount} solved
        </p>
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Practice questions">
          {QUESTIONS.map((item, i) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={i === idx}
              aria-label={"Question " + (i + 1) + (solved[i] ? " (solved)" : "")}
              onClick={() => setIdx(i)}
              className={
                "h-2.5 w-2.5 rounded-full transition " +
                (i === idx
                  ? "w-6 bg-gold-400"
                  : solved[i]
                    ? "bg-green-400/80 hover:bg-green-400"
                    : "bg-paper-300 hover:bg-ink-300")
              }
            />
          ))}
        </div>
      </div>

      {allSolved && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl border border-gold-400/60 bg-gold-400/10 p-6 text-center"
        >
          <p className="text-3xl" aria-hidden>
            🏅
          </p>
          <p className="mt-2 font-display text-xl font-semibold text-ink-950">
            All six cleared
          </p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-ink-600">
            You rebuilt runnable code, matched the vocabulary and hunted two real bugs — off-by-one
            and string-vs-expression. Those two mistakes account for a startling share of all
            production incidents.
          </p>
          <button
            type="button"
            onClick={restart}
            className="btn-ghost mt-4 !px-5 !py-2 text-sm"
          >
            Run them again ↻
          </button>
        </motion.div>
      )}

      <div className="rounded-2xl border border-paper-200 bg-paper-50 p-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-gold-500">
            {LABELS[q.type]}
          </p>
          {solved[idx] && (
            <p className="font-mono text-[10px] uppercase tracking-widest text-green-600">
              ✓ solved
            </p>
          )}
        </div>

        {q.type === "assembly" && (
          <AssemblyCard key={q.id} q={q} onSolved={() => markSolved(idx)} />
        )}
        {q.type === "matching" && (
          <MatchingCard key={q.id} q={q} onSolved={() => markSolved(idx)} />
        )}
        {q.type === "spot" && <SpotCard key={q.id} q={q} onSolved={() => markSolved(idx)} />}

        <div className="mt-4">
          <HintRow hint={q.hint} open={hintOpen} onToggle={() => setHintOpen((v) => !v)} />
        </div>
      </div>

      {/* navigation — previous included, as the first cohort asked for */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
          className="rounded-full border border-paper-300 px-4 py-1.5 font-mono text-xs text-ink-700 transition hover:border-gold-400 hover:text-gold-600 disabled:opacity-40"
        >
          ← Previous
        </button>
        <button
          type="button"
          onClick={() => setIdx((i) => Math.min(QUESTIONS.length - 1, i + 1))}
          disabled={idx === QUESTIONS.length - 1}
          className="rounded-full border border-paper-300 px-4 py-1.5 font-mono text-xs text-ink-700 transition hover:border-gold-400 hover:text-gold-600 disabled:opacity-40"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
