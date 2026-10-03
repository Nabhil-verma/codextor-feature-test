/* ═══════════════════════════════════════════════════════════════
   Deterministic graders for the V2.1 lab elements.

   All of these are pure functions over authored content — no
   execution, no LLM, no free text to fudge. Keeping them in `lib`
   means the data invariants and the scoring ladders are testable
   without rendering a component.
   ═══════════════════════════════════════════════════════════════ */

import { evaluateCheck } from "./runner";
import type {
  DiffExercise,
  RepoQuestion,
  RubricExercise,
  RubricCriterion,
} from "../data/types";
import type { TaxonomyCode } from "../data/bug-taxonomy";

/* ------------------------- Diff review ladder ------------------------- */

export type DiffAttempt = {
  file: string | null;
  /** 1-based line on the after side */
  line: number | null;
  category: TaxonomyCode | null;
};

/**
 * The partial-credit ladder from the plan (§2.3):
 *   wrong file → 0 · correct file → 0.4 · file + line → 0.7 ·
 *   file + line + category → 1.0
 * The category *is* the reasoning, so full credit requires it.
 */
export function scoreDiffAttempt(
  ex: DiffExercise,
  attempt: DiffAttempt
): number {
  if (attempt.file !== ex.planted.file) return 0;
  if (attempt.line !== ex.planted.line) return 0.4;
  if (attempt.category !== ex.planted.category) return 0.7;
  return 1;
}

/* ------------------------- Repo trace questions ------------------------ */

export type LocateChoice = { file: string; symbol: string };

/** File right → 0.4; file + function right → 1.0 (locate mode has no category). */
export function scoreLocate(
  q: Extract<RepoQuestion, { kind: "locate" }>,
  choice: LocateChoice | null
): number {
  if (!choice || choice.file !== q.answer.file) return 0;
  return choice.symbol === q.answer.symbol ? 1 : 0.4;
}

/**
 * Multi-select scoring: one point per correct option selected, minus one per
 * wrong option selected, normalised by the number of correct options. Misses
 * and false positives cancel per item, so ticking everything cannot win.
 */
export function scoreSelect(
  q: Extract<RepoQuestion, { kind: "select" }>,
  selected: number[]
): number {
  const totalCorrect = q.options.filter((o) => o.correct).length;
  if (totalCorrect === 0) return 0;
  let hit = 0;
  let wrong = 0;
  q.options.forEach((o, i) => {
    const picked = selected.includes(i);
    if (picked && o.correct) hit += 1;
    if (picked && !o.correct) wrong += 1;
  });
  return Math.max(0, Math.min(1, (hit - wrong) / totalCorrect));
}

/* ----------------------------- Rubric grader --------------------------- */

export type RubricCriterionResult = {
  id: string;
  label: string;
  met: boolean;
  /** true when the criterion was machine-checked, false when self-attested */
  auto: boolean;
};

/**
 * Auto-checkable criteria evaluate the existing check grammar over the
 * **lower-cased** learner text bound as `output`, so authors write checks in
 * lower case and capitalisation never fails a learner. Criteria without a
 * `check` are judgment calls the learner attests to (`claims`).
 * Score is the weight of met criteria over the total weight.
 */
export function evaluateRubric(
  ex: RubricExercise,
  text: string,
  claims: Record<string, boolean>
): { score: number; results: RubricCriterionResult[] } {
  const lowered = text.toLowerCase();
  const results: RubricCriterionResult[] = ex.criteria.map(
    (c: RubricCriterion) => {
      if (c.check) {
        return {
          id: c.id,
          label: c.label,
          met: evaluateCheck(c.check, lowered),
          auto: true,
        };
      }
      return {
        id: c.id,
        label: c.label,
        met: claims[c.id] === true,
        auto: false,
      };
    }
  );
  const total = ex.criteria.reduce((sum, c) => sum + (c.weight ?? 1), 0);
  const met = results.reduce((sum, r, i) => {
    const weight = ex.criteria[i].weight ?? 1;
    return sum + (r.met ? weight : 0);
  }, 0);
  return { score: total === 0 ? 0 : met / total, results };
}
