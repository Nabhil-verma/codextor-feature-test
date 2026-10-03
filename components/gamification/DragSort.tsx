import { useState } from "react";
import {
  AnimatePresence,
  Reorder,
  motion,
  useAnimationControls,
  useReducedMotion,
} from "framer-motion";
import { shuffled } from "../../lib/shuffle";

/* ═══════════════════════════════════════════════════════════════
   Drag-to-sequence challenges. Reading a correct answer teaches
   far less than reconstructing it, and dragging a line into place
   gives the lesson a tactile, physical feel.
   ═══════════════════════════════════════════════════════════════ */

/** Identity for a reorderable row — index-based so duplicates stay stable. */
type Row = { id: number; text: string };

export default function DragSort({
  prompt,
  items,
  explanation,
  onSolved,
}: {
  prompt: string;
  /** The correct order, top to bottom */
  items: string[];
  explanation?: string;
  onSolved?: () => void;
}) {
  // Never hand the learner a pre-solved puzzle: `shuffled` guarantees the
  // arrangement differs from `items`, which is the solved order.
  const [order, setOrder] = useState<Row[]>(() =>
    shuffled(items.map((text, id) => ({ id, text })))
  );
  const [checked, setChecked] = useState(false);
  const [solved, setSolved] = useState(false);
  const shake = useAnimationControls();
  const reduceMotion = useReducedMotion();

  const isCorrect = order.every((row, i) => row.text === items[i]);

  const check = () => {
    setChecked(true);
    if (isCorrect) {
      setSolved(true);
      onSolved?.();
    } else if (!reduceMotion) {
      void shake.start({
        x: [0, -9, 9, -6, 6, -2, 0],
        transition: { duration: 0.4 },
      });
    }
  };

  const retry = () => {
    setChecked(false);
    setSolved(false);
  };

  const reveal = () => {
    setOrder(items.map((text, id) => ({ id, text })));
    setChecked(true);
    setSolved(true);
  };

  return (
    <motion.div
      animate={shake}
      className={
        "glass glass-edge relative rounded-2xl border p-6 transition-colors duration-300 " +
        (solved
          ? "border-gold-400/70"
          : checked
            ? "border-red-400/60"
            : "border-paper-200/60")
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="eyebrow">sequence challenge</p>
        <p className="font-mono text-[11px] text-ink-500">
          drag to reorder · {order.length} steps
        </p>
      </div>

      <p className="mt-3 font-display text-lg font-medium text-ink-950">{prompt}</p>

      <Reorder.Group
        axis="y"
        values={order}
        onReorder={(next: Row[]) => {
          setOrder(next);
          if (checked && !solved) setChecked(false);
        }}
        className="mt-4 space-y-2"
      >
        {order.map((row, i) => {
          const correctHere = checked && row.text === items[i];
          const wrongHere = checked && !solved && row.text !== items[i];
          return (
            <Reorder.Item
              key={row.id}
              value={row}
              dragListener={!solved}
              className="relative"
              style={{ cursor: solved ? "default" : "grab" }}
              whileDrag={{ scale: 1.02, zIndex: 20 }}
            >
              <div
                className={
                  "flex items-center gap-3 rounded-xl border px-3.5 py-3 font-mono text-[13px] leading-snug transition-colors " +
                  (correctHere
                    ? "border-gold-400 bg-gold-400/15 text-ink-950"
                    : wrongHere
                      ? "border-red-300 bg-red-50/70 text-red-700"
                      : "border-ink-200 bg-paper-50 text-ink-800")
                }
              >
                <span
                  className={
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-[10px] font-bold " +
                    (correctHere || solved
                      ? "bg-gold-400 text-ink-950"
                      : "bg-ink-950 text-gold-300")
                  }
                  aria-hidden
                >
                  {solved || correctHere ? "✓" : i + 1}
                </span>
                <span className="min-w-0 flex-1 whitespace-pre-wrap">{row.text}</span>
                {!solved && (
                  <span
                    className="shrink-0 select-none text-ink-400"
                    title="Drag to reorder"
                    aria-hidden
                  >
                    ⠿
                  </span>
                )}
              </div>
            </Reorder.Item>
          );
        })}
      </Reorder.Group>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {!solved ? (
          <>
            <button onClick={check} className="btn-gold !px-6 !py-2 text-sm">
              Check order
            </button>
            {checked && (
              <>
                <motion.span
                  className="font-mono text-xs text-red-600"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  ✗ not yet — think about what must run first
                </motion.span>
                <button
                  onClick={retry}
                  className="font-mono text-xs text-ink-600 underline-offset-2 hover:text-gold-600 hover:underline"
                >
                  keep trying
                </button>
                <button
                  onClick={reveal}
                  className="ml-auto font-mono text-xs text-ink-500 underline-offset-2 hover:text-gold-600 hover:underline"
                >
                  reveal answer
                </button>
              </>
            )}
            {!checked && (
              <span className="font-mono text-[11px] text-ink-500">
                tip: the first line usually sets something up
              </span>
            )}
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="w-full"
          >
            <p className="font-mono text-xs font-bold text-gold-600">
              ✓ sequence locked in
            </p>
            <AnimatePresence>
              {explanation && (
                <motion.p
                  className="mt-2 text-sm leading-relaxed text-ink-600"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {explanation}
                </motion.p>
              )}
            </AnimatePresence>
            <button
              onClick={() => {
                setOrder(shuffled(items.map((text, id) => ({ id, text }))));
                retry();
              }}
              className="mt-3 font-mono text-xs text-ink-500 underline-offset-2 hover:text-gold-600 hover:underline"
            >
              shuffle and retry ↻
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
