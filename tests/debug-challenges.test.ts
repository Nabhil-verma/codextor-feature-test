import { describe, expect, it } from "vitest";
import { DEBUG_CHALLENGES, debugChallenge } from "../src/data/debug-challenges";
import { evaluateCheck, runUserCode } from "../src/lib/runner";
import { tracks } from "../src/data";

/*
 * The break-and-fix library is content, but it is *executable* content: the
 * grader is a predicate over real program output. That makes it testable, and
 * it must be tested — a challenge whose "fix" doesn't actually satisfy its own
 * check is worse than no challenge at all, because it teaches the learner to
 * distrust a correct answer.
 */

const ids = DEBUG_CHALLENGES.map((c) => c.id);

describe("debug challenge library", () => {
  it("has no duplicate ids", () => {
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("grades a fix only when the program actually behaves", async () => {
    for (const c of DEBUG_CHALLENGES) {
      const broken = await runUserCode(c.broken);
      const ok = !broken.error && evaluateCheck(c.fixCheck, broken.logs.join("\n"));
      expect(ok, `"${c.id}" should FAIL its own fixCheck when broken`).toBe(false);
    }
  });

  it("accepts the reference fix for every challenge", async () => {
    for (const c of DEBUG_CHALLENGES) {
      const fixed = await runUserCode(c.fix);
      expect(fixed.error, `"${c.id}" reference fix threw: ${fixed.error}`).toBe(null);
      expect(
        evaluateCheck(c.fixCheck, fixed.logs.join("\n")),
        `"${c.id}" reference fix does not satisfy its fixCheck`
      ).toBe(true);
    }
  });

  it("fails because of a bug, not because it doesn't parse", async () => {
    // A syntax error would make the challenge a typo hunt, not a debugging
    // exercise. Runtime throws (lost `this`) are intended and allowed.
    for (const c of DEBUG_CHALLENGES) {
      const r = await runUserCode(c.broken);
      expect(
        /Unexpected|SyntaxError|Invalid or unexpected token|missing \) /i.test(
          r.error ?? ""
        ),
        `"${c.id}" broken code is a syntax error, not a bug: ${r.error}`
      ).toBe(false);
    }
  });

  it("gives every challenge real hints and a stated bug", () => {
    for (const c of DEBUG_CHALLENGES) {
      expect(c.hints.length, `"${c.id}" has no hints`).toBeGreaterThanOrEqual(3);
      expect(c.solution.length, `"${c.id}" has no solution text`).toBeGreaterThan(40);
      expect(c.brief.length, `"${c.id}" has no brief`).toBeGreaterThan(20);
      expect(c.win.length, `"${c.id}" has no success message`).toBeGreaterThan(10);
      // Hint tiers must climb, so \"reveal\" always adds information.
      const tiers = c.hints.map((h) => h.tier);
      expect(tiers).toEqual([...tiers].sort((a, b) => a - b));
    }
  });
});

describe("challenges referenced by lessons", () => {
  it("every lesson debug id resolves to a real challenge", () => {
    for (const track of tracks) {
      for (const lesson of track.lessons) {
        if (!lesson.debug) continue;
        expect(
          () => debugChallenge(lesson.debug!.id),
          `${track.id}/${lesson.id} references unknown challenge "${lesson.debug!.id}"`
        ).not.toThrow();
      }
    }
  });
});
