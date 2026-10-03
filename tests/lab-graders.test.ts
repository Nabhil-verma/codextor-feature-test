import { describe, expect, it } from "vitest";
import { DIFF_CHALLENGES, diffChallenge } from "../src/data/diff-challenges";
import { REPO_SNAPSHOTS } from "../src/data/repo-snapshots";
import { BUG_TAXONOMY, EXECUTED_CODES, REVIEW_CODES } from "../src/data/bug-taxonomy";
import { scoreDiffAttempt, scoreLocate, scoreSelect, evaluateRubric } from "../src/lib/labGrade";
import { tracks, findLesson } from "../src/data";
import { checkExpressionSupported } from "../src/lib/checkExpr";
import { DEBUG_CHALLENGES } from "../src/data/debug-challenges";

/* ═══════════════════════════════════════════════════════════════
   The V2.1 lab graders are deterministic content, which makes them
   testable — and they must be tested, because a diff exercise whose
   planted line doesn't exist, or a rubric whose checks can never be
   met, is a lesson the learner cannot finish.
   ═══════════════════════════════════════════════════════════════ */

describe("bug taxonomy", () => {
  it("has no duplicate codes and a non-empty label for each", () => {
    const codes = BUG_TAXONOMY.map((t) => t.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const t of BUG_TAXONOMY) {
      expect(t.label.length).toBeGreaterThan(3);
      expect(t.blurb.length).toBeGreaterThan(10);
    }
  });

  it("keeps the six executed codes and adds exactly four review codes", () => {
    expect(EXECUTED_CODES).toEqual(["RC", "EC", "HA", "ID", "SL", "CX"]);
    expect(REVIEW_CODES).toHaveLength(10);
    expect(REVIEW_CODES).toEqual([...EXECUTED_CODES, "SC", "TG", "NM", "DL"]);
  });
});

describe("diff challenge library", () => {
  it("has no duplicate ids and resolves by id", () => {
    const ids = DIFF_CHALLENGES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(diffChallenge(ids[0]).id).toBe(ids[0]);
    expect(() => diffChallenge("nope")).toThrow();
  });

  it("plants a defect that exists inside the after side of the named file", () => {
    for (const c of DIFF_CHALLENGES) {
      const file = c.files.find((f) => f.path === c.planted.file);
      expect(file, `${c.id}: planted file "${c.planted.file}" is not in the PR`).toBeTruthy();
      const lines = file!.after.split("\n");
      expect(
        c.planted.line,
        `${c.id}: planted line ${c.planted.line} is out of bounds (${lines.length} lines)`
      ).toBeGreaterThanOrEqual(1);
      expect(c.planted.line).toBeLessThanOrEqual(lines.length);
      expect(lines[c.planted.line - 1].trim().length, `${c.id}: planted line is blank`).toBeGreaterThan(0);
    }
  });

  it("uses a valid taxonomy code and ships reference reasoning", () => {
    for (const c of DIFF_CHALLENGES) {
      expect(REVIEW_CODES, `${c.id}: unknown category`).toContain(c.planted.category);
      expect(c.planted.why.length, `${c.id}: no why`).toBeGreaterThan(80);
    }
  });

  it("ships at least two distractors, with one in the planted file", () => {
    for (const c of DIFF_CHALLENGES) {
      expect(c.distractors.length, `${c.id}: needs ≥2 distractors`).toBeGreaterThanOrEqual(2);
      // A distractor in the same file stops "blame the file" from winning.
      const plantedDir = c.planted.file.split("/").slice(0, -1).join("/");
      const sameFile = c.distractors.filter((d) => d.includes(c.planted.file));
      const sameDir = c.distractors.filter((d) => d.includes(plantedDir));
      expect(
        sameFile.length + (sameDir.length > 0 ? 1 : 0),
        `${c.id}: no distractor near the blocker — file heuristics can win`
      ).toBeGreaterThan(0);
    }
  });

  it("has a three-tier hint ladder", () => {
    for (const c of DIFF_CHALLENGES) {
      expect(c.hints.length, `${c.id}: hints`).toBeGreaterThanOrEqual(3);
      const tiers = c.hints.map((h) => h.tier);
      expect(tiers).toEqual([...tiers].sort((a, b) => a - b));
    }
  });
});

describe("diff scoring ladder", () => {
  const ex = DIFF_CHALLENGES[0];
  const good = { file: ex.planted.file, line: ex.planted.line, category: ex.planted.category };

  it("scores wrong file 0, file 0.4, file+line 0.7, file+line+category 1.0", () => {
    expect(scoreDiffAttempt(ex, { file: "package.json", line: 1, category: "SL" })).toBe(0);
    expect(scoreDiffAttempt(ex, { file: good.file, line: 1, category: "SL" })).toBe(0.4);
    expect(scoreDiffAttempt(ex, { ...good, category: "EC" })).toBe(0.7);
    expect(scoreDiffAttempt(ex, good)).toBe(1);
  });

  it("requires an explicit category for full credit", () => {
    expect(scoreDiffAttempt(ex, { ...good, category: null })).toBe(0.7);
  });
});

describe("repo trace grading", () => {
  const repo = REPO_SNAPSHOTS[0];

  it("ships locate and select questions with declared answers", () => {
    expect(repo.questions.length).toBeGreaterThanOrEqual(3);
    expect(repo.questions.some((q) => q.kind === "locate")).toBe(true);
    expect(repo.questions.filter((q) => q.kind === "select").length).toBeGreaterThanOrEqual(1);
    for (const q of repo.questions) {
      if (q.kind === "locate") {
        // The answer must be one of the offered choices — otherwise it is
        // unreachable and the question cannot be completed.
        expect(
          q.choices.some((c) => c.file === q.answer.file && c.symbol === q.answer.symbol),
          `${repo.id}: locate answer not among choices`
        ).toBe(true);
      } else {
        expect(q.options.filter((o) => o.correct).length).toBeGreaterThan(0);
        expect(q.options.some((o) => !o.correct), `${repo.id}: no wrong options`).toBe(true);
      }
      expect(q.why.length).toBeGreaterThan(60);
    }
  });

  it("every referenced file exists in the snapshot", () => {
    const paths = new Set(repo.files.map((f) => f.path));
    for (const q of repo.questions) {
      if (q.kind === "locate") {
        for (const c of q.choices) {
          expect(paths, `${repo.id}: choice file missing: ${c.file}`).toContain(c.file);
        }
      } else {
        for (const o of q.options) {
          const file = o.label.split(" ")[0].split("→")[0].trim();
          if (file.includes("/") || file.endsWith(".ts")) {
            expect(paths, `${repo.id}: option file missing: ${file}`).toContain(file);
          }
        }
      }
    }
  });

  it("scores locate as 0 / 0.4 / 1.0 and select with cancel-per-item", () => {
    const locate = repo.questions.find((q) => q.kind === "locate")!;
    if (locate.kind !== "locate") throw new Error("expected locate");
    expect(scoreLocate(locate, null)).toBe(0);
    expect(scoreLocate(locate, { file: locate.answer.file, symbol: "wrong" })).toBe(0.4);
    expect(scoreLocate(locate, locate.answer)).toBe(1);

    const select = repo.questions.find((q) => q.kind === "select")!;
    if (select.kind !== "select") throw new Error("expected select");
    const correct = select.options.map((o, i) => (o.correct ? i : -1)).filter((i) => i >= 0);
    expect(scoreSelect(select, correct)).toBe(1);
    // Ticking everything cannot win: false positives cancel hits.
    const everything = select.options.map((_, i) => i);
    expect(scoreSelect(select, everything)).toBeLessThan(1);
    expect(scoreSelect(select, [])).toBe(0);
  });
});

describe("rubric grading", () => {
  const lessons = tracks.flatMap((t) =>
    t.lessons.filter((l) => l.rubric).map((l) => ({ track: t.id, lesson: l }))
  );

  it("ships rubric lessons in the agents track", () => {
    expect(lessons.length).toBeGreaterThanOrEqual(4);
  });

  it("every auto-checkable criterion is expressible in the check grammar", () => {
    for (const { track, lesson } of lessons) {
      for (const c of lesson.rubric!.criteria) {
        if (!c.check) continue;
        expect(
          checkExpressionSupported(c.check),
          `${track}/${lesson.id}: criterion "${c.id}" check not supported: ${c.check}`
        ).toBe(true);
      }
    }
  });

  it("every rubric is satisfiable by its own exemplar", () => {
    for (const { track, lesson } of lessons) {
      const ex = lesson.rubric!;
      // Self-attested criteria are claimed; auto criteria must pass on the
      // exemplar, or no learner can ever reach full credit.
      const claims = Object.fromEntries(ex.criteria.map((c) => [c.id, true]));
      const { score, results } = evaluateRubric(ex, ex.exemplar, claims);
      const failed = results.filter((r) => !r.met).map((r) => r.id);
      expect(
        failed,
        `${track}/${lesson.id}: exemplar fails its own criteria: ${failed.join(", ")}`
      ).toEqual([]);
      expect(score).toBe(1);
    }
  });

  it("scores partial credit and requires every criterion for 1.0", () => {
    const ex = lessons[0].lesson.rubric!;
    const empty = evaluateRubric(ex, "", {});
    expect(empty.score).toBeLessThan(1);
    const full = evaluateRubric(
      ex,
      ex.exemplar,
      Object.fromEntries(ex.criteria.map((c) => [c.id, true]))
    );
    expect(full.score).toBe(1);
  });
});

describe("Track XVI — the pilot track", () => {
  const track = tracks.find((t) => t.id === "agents")!;

  it("ships nine lessons in the planned order", () => {
    expect(track.lessons.map((l) => l.id)).toEqual([
      "specs-and-prompts",
      "codebase-archaeology",
      "managing-context",
      "instruction-files",
      "plan-before-code",
      "permissions-and-sandbox",
      "verifying-agent-output",
      "when-not-to-use-agents",
      "capstone-agent-loop",
    ]);
  });

  it("every lesson is gradable by at least one real grader", () => {
    for (const l of track.lessons) {
      const gradable =
        l.quiz.length >= 2 ||
        l.rubric !== undefined ||
        l.diff !== undefined ||
        l.repo !== undefined ||
        l.debug !== undefined;
      expect(gradable, `agents/${l.id} has no grader`).toBe(true);
      // Every lesson carries a quiz as its base proof.
      expect(l.quiz.length, `agents/${l.id} quiz`).toBeGreaterThanOrEqual(2);
    }
  });

  it("uses every new grader the pilot exists to validate", () => {
    expect(findLesson("agents", "codebase-archaeology")?.repo).toBeTruthy();
    expect(findLesson("agents", "verifying-agent-output")?.diff).toBeTruthy();
    expect(findLesson("agents", "verifying-agent-output")?.debug).toBeTruthy();
    expect(findLesson("agents", "capstone-agent-loop")?.rubric).toBeTruthy();
    expect(
      track.lessons.filter((l) => l.rubric).length,
      "the pilot needs multiple written deliverables"
    ).toBeGreaterThanOrEqual(4);
  });

  it("routes every debug id to a real challenge, with the two new ones present", () => {
    const ids = DEBUG_CHALLENGES.map((c) => c.id);
    expect(ids).toContain("csv-quoted-fields");
    expect(ids).toContain("debounced-search-queue");
  });

  it("only uses executed taxonomy codes for DebugLab diagnoses", () => {
    for (const c of DEBUG_CHALLENGES) {
      if (!c.diagnosis) continue;
      expect(EXECUTED_CODES, `${c.id}: review-only code in an executed lab`).toContain(
        c.diagnosis.answer
      );
      expect(c.diagnosis.codes).toContain(c.diagnosis.answer);
      expect(c.diagnosis.codes.length).toBeGreaterThanOrEqual(2);
    }
  });
});
