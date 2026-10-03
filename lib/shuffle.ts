/* ═══════════════════════════════════════════════════════════════
   Shuffling with the learner in mind.

   Exercises that shuffle their own answer — the code-assembly card,
   the drag-to-sequence challenge — must never open already solved.
   A pre-solved puzzle teaches nothing and makes "Check order" a free
   pass, so the guarantee is made exact here rather than left to the
   dice: plain Fisher–Yates lands back on the input order often enough
   to notice (1 in 6 for three lines, 1 in 24 for four), and re-rolling
   on a hit only shrinks the odds (1 in n! each attempt) instead of
   removing them.
   ═══════════════════════════════════════════════════════════════ */

/**
 * A shuffled copy of `items` that is guaranteed to differ from `items`
 * whenever any other arrangement exists. Elements that are equal can't be
 * told apart, so an empty list, a single element, or an all-equal list is
 * returned as-is — there is no other order to offer.
 */
export function shuffled<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  if (out.some((value, at) => value !== items[at])) return out;

  // Fisher–Yates landed on the original order: swap the first position with
  // the first one holding a different value — the smallest change that
  // breaks the order, and one no further draw can undo.
  const other = out.findIndex((value) => value !== out[0]);
  if (other === -1) return out;
  [out[0], out[other]] = [out[other], out[0]];
  return out;
}
