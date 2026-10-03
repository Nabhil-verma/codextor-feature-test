/* ═══════════════════════════════════════════════════════════════
   The shared bug taxonomy.

   One vocabulary for every "spot what the AI got wrong" exercise,
   whether the defect lives in an executed program (DebugLab) or in
   a multi-file review surface (DiffLab / RepoLab).

   V2's six codes are the blocker set for executed code. Review adds
   four that only exist in a diff: scope creep, a missing or vacuous
   test, name/comment drift, and leftover debug code.
   ═══════════════════════════════════════════════════════════════ */

export type TaxonomyCode =
  | "RC"
  | "EC"
  | "HA"
  | "ID"
  | "SL"
  | "CX"
  | "SC"
  | "TG"
  | "NM"
  | "DL";

export type TaxonomyEntry = {
  code: TaxonomyCode;
  label: string;
  blurb: string;
  /** Review-only codes appear in diff surfaces, not in executed code. */
  reviewOnly?: boolean;
};

export const BUG_TAXONOMY: TaxonomyEntry[] = [
  {
    code: "RC",
    label: "Race condition / concurrency",
    blurb:
      "Timing decides the outcome — stale responses overwrite fresh ones, or two writes interleave.",
  },
  {
    code: "EC",
    label: "Missing or mishandled edge case",
    blurb:
      "The happy path works; empty input, zero, or a missing field does not.",
  },
  {
    code: "HA",
    label: "Invented / hallucinated API",
    blurb:
      "The method or option does not exist — it fails the moment the line runs.",
  },
  {
    code: "ID",
    label: "Insecure default",
    blurb:
      "Permissive CORS, a disabled certificate check, weak crypto, secrets reaching a bundle.",
  },
  {
    code: "SL",
    label: "Silently wrong logic",
    blurb:
      "It runs cleanly and looks plausible, but the behaviour is wrong on real input.",
  },
  {
    code: "CX",
    label: "Bad complexity",
    blurb:
      "Correct results, accidentally quadratic — the cost grows faster than the input.",
  },
  {
    code: "SC",
    label: "Scope creep / unrelated change",
    blurb:
      "The diff quietly touches files or behaviour the task never mentioned.",
    reviewOnly: true,
  },
  {
    code: "TG",
    label: "Missing or vacuous test",
    blurb:
      "The change ships without a test — or with a \"test\" that asserts nothing.",
    reviewOnly: true,
  },
  {
    code: "NM",
    label: "Misleading name / comment drift",
    blurb:
      "The identifier or comment now says something false about behaviour.",
    reviewOnly: true,
  },
  {
    code: "DL",
    label: "Leftover debug / dead code",
    blurb:
      "A stray log, commented-out block, or dead flag. Blocks only when it leaks data or bypasses a guard.",
    reviewOnly: true,
  },
];

const BY_CODE = new Map(BUG_TAXONOMY.map((e) => [e.code, e]));

/** Lookup that throws on an unknown code rather than rendering a blank chip. */
export function taxonomyEntry(code: TaxonomyCode): TaxonomyEntry {
  const found = BY_CODE.get(code);
  if (!found) {
    throw new Error(
      `Unknown taxonomy code "${code}" — add it to src/data/bug-taxonomy.ts`
    );
  }
  return found;
}

/** Codes that can block executed code (DebugLab's set). */
export const EXECUTED_CODES = BUG_TAXONOMY.filter(
  (e) => !e.reviewOnly
).map((e) => e.code);

/** Codes a diff reviewer may pick, including the four review-only ones. */
export const REVIEW_CODES = BUG_TAXONOMY.map((e) => e.code);
