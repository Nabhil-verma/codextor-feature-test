import { describe, expect, it } from "vitest";
import { DEBUG_CHALLENGES } from "../src/data/debug-challenges";
import { EXTRA_CHALLENGES, LEGACY_DIAGNOSES } from "../src/data/taxonomy-extras";
import { EXECUTED_CODES } from "../src/data/bug-taxonomy";
import { tracks } from "../src/data";
import { evaluateCheck, runUserCode } from "../src/lib/runner";

/*
 * The taxonomy is only as real as its exercises. Before this suite the
 * library planted three of the six executable codes (SL, EC, RC) and only two
 * of nine challenges carried a diagnosis, so a learner could finish every
 * judgment exercise without ever meeting a hallucinated API, an insecure
 * default, or an accidental O(n²) — and could never earn partial credit on
 * the diagnosis, only on the repair.
 *
 * Two invariants now hold and are enforced here:
 *   1. every code that can block executed code has at least one wired
 *      challenge (the registry's wiring table is the mechanism);
 *   2. every challenge a lesson actually renders carries a valid diagnosis,
 *      with executed-only codes.
 */

const WIRED = tracks.flatMap((t) =>
  t.lessons
    .filter((l) => l.debug)
    .map((l) => ({ key: `${t.id}/${l.id}`, challenge: l.debug! }))
);

describe("executable taxonomy coverage", () => {
  it("plants every executed code in at least one wired challenge", () => {
    const wiredAnswers = new Set(
      WIRED.map(({ challenge }) => challenge.diagnosis?.answer)
    );
    for (const code of EXECUTED_CODES) {
      expect(
        wiredAnswers.has(code),
        `no challenge plants ${code} — the taxonomy claims it can block code the learner writes`
      ).toBe(true);
    }
  });

  it("gives every rendered challenge a diagnosis with an executed answer", () => {
    for (const { key, challenge } of WIRED) {
      const diagnosis = challenge.diagnosis;
      expect(diagnosis, `${key}: challenge "${challenge.id}" has no diagnosis`).toBeTruthy();
      expect(
        EXECUTED_CODES,
        `${key}: diagnosis answer "${diagnosis!.answer}" is not an executed code`
      ).toContain(diagnosis!.answer);
      expect(diagnosis!.codes, `${key}: answer missing from its own options`).toContain(
        diagnosis!.answer
      );
      expect(diagnosis!.codes.length, `${key}: needs real alternatives`).toBeGreaterThanOrEqual(2);
      for (const code of diagnosis!.codes) {
        expect(EXECUTED_CODES, `${key}: review-only code "${code}" in an executed lab`).toContain(code);
      }
    }
  });

  it("resolves every wired challenge id and wires the three new codes", () => {
    const library = new Set([
      ...DEBUG_CHALLENGES.map((c) => c.id),
      ...EXTRA_CHALLENGES.map((c) => c.id),
    ]);
    const wiredIds = WIRED.map(({ challenge }) => challenge.id);
    for (const id of wiredIds) {
      expect(library, `wired id "${id}" is not in any challenge library`).toContain(id);
    }
    expect(wiredIds).toContain("quadratic-dedupe");
    expect(wiredIds).toContain("invented-helpers");
    expect(wiredIds).toContain("trusted-role-header");
  });

  it("diagnoses every legacy challenge that predates the field", () => {
    for (const c of DEBUG_CHALLENGES) {
      if (c.diagnosis) continue;
      expect(
        LEGACY_DIAGNOSES[c.id],
        `legacy challenge "${c.id}" has no diagnosis and no legacy entry`
      ).toBeTruthy();
    }
  });
});

describe("the three new challenges are real exercises", () => {
  it("fails each broken program on its own check", async () => {
    for (const c of EXTRA_CHALLENGES) {
      const broken = await runUserCode(c.broken);
      const ok = !broken.error && evaluateCheck(c.fixCheck, broken.logs.join("\n"));
      expect(ok, `"${c.id}" should FAIL its fixCheck when broken`).toBe(false);
    }
  }, 30_000);

  it("accepts each reference fix", async () => {
    for (const c of EXTRA_CHALLENGES) {
      const fixed = await runUserCode(c.fix);
      expect(fixed.error, `"${c.id}" reference fix threw: ${fixed.error}`).toBe(null);
      expect(
        evaluateCheck(c.fixCheck, fixed.logs.join("\n")),
        `"${c.id}" reference fix does not satisfy its fixCheck`
      ).toBe(true);
    }
  }, 30_000);

  it("fails because of a bug, not a typo hunt", async () => {
    for (const c of EXTRA_CHALLENGES) {
      const r = await runUserCode(c.broken);
      expect(
        /Unexpected|SyntaxError|Invalid or unexpected token|missing \) /i.test(r.error ?? ""),
        `"${c.id}" broken code is a syntax error, not a bug: ${r.error}`
      ).toBe(false);
    }
  }, 30_000);

  it("ships a full hint ladder and a stated bug", () => {
    for (const c of EXTRA_CHALLENGES) {
      expect(c.hints.length, `"${c.id}" hints`).toBeGreaterThanOrEqual(3);
      const tiers = c.hints.map((h) => h.tier);
      expect(tiers).toEqual([...tiers].sort((a, b) => a - b));
      expect(c.solution.length, `"${c.id}" solution`).toBeGreaterThan(40);
    }
  });
});
