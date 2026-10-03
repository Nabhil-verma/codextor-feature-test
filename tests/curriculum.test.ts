import { describe, it, expect } from "vitest";
import { tracks, findLesson, lessonKey, totalLessonCount } from "../src/data";
import { evaluateCheck, runUserCode } from "../src/lib/runner";
import { runTs, type TsRunResult } from "../src/lib/tsRunner";

const allLessons = tracks.flatMap((t) =>
  t.lessons.map((l) => ({ track: t, lesson: l }))
);

describe("curriculum integrity", () => {
  it("has seventeen tracks", () => {
    expect(tracks).toHaveLength(17);
  });

  it("covers all seventeen planned curriculum areas", () => {
    expect(tracks.map((t) => t.id)).toEqual([
      "web",
      "react",
      "backend",
      "dsa",
      "python",
      "git",
      "testing",
      "devops",
      "security",
      "architecture",
      "tailwind",
      "state",
      "api",
      "typescript",
      "performance",
      "agents",
      // V2.1 Fix 2 propagation: the first content authored against the
      // diff/click grader outside the pilot track.
      "workflow",
    ]);
  });

  it("gives every track its own numeral", () => {
    // The design renders the numeral as the track's identity, so a duplicate
    // would make two tracks indistinguishable in the catalog.
    const numerals = tracks.map((t) => t.numeral);
    expect(new Set(numerals).size).toBe(numerals.length);
    for (const n of numerals) expect(n.trim().length).toBeGreaterThan(0);
  });

  it("has unique track ids", () => {
    const ids = tracks.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has unique lesson ids per track", () => {
    for (const t of tracks) {
      const ids = t.lessons.map((l) => l.id);
      expect(new Set(ids).size, `track ${t.id}`).toBe(ids.length);
    }
  });

  it("every lesson has body, minutes, and a quiz", () => {
    for (const { track, lesson } of allLessons) {
      expect(lesson.body.length, `${track.id}/${lesson.id}`).toBeGreaterThan(40);
      expect(lesson.minutes, `${track.id}/${lesson.id}`).toBeGreaterThan(0);
      expect(lesson.quiz.length, `${track.id}/${lesson.id}`).toBeGreaterThanOrEqual(2);
    }
  });

  it("every quiz question has a valid answer index and ≥3 options", () => {
    for (const { track, lesson } of allLessons) {
      lesson.quiz.forEach((q, i) => {
        expect(
          q.options.length,
          `${track.id}/${lesson.id} q${i}`
        ).toBeGreaterThanOrEqual(3);
        expect(q.answer, `${track.id}/${lesson.id} q${i}`).toBeGreaterThanOrEqual(0);
        expect(q.answer, `${track.id}/${lesson.id} q${i}`).toBeLessThan(q.options.length);
        expect(q.explanation.length, `${track.id}/${lesson.id} q${i}`).toBeGreaterThan(5);
      });
    }
  });

  it("every sequence challenge has ≥3 unique, non-empty steps", () => {
    const withSort = allLessons.filter(({ lesson }) => lesson.sort);
    expect(withSort.length).toBeGreaterThanOrEqual(3);

    for (const { track, lesson } of withSort) {
      const s = lesson.sort!;
      const where = `${track.id}/${lesson.id}`;
      expect(s.prompt.length, where).toBeGreaterThan(10);
      expect(s.items.length, where).toBeGreaterThanOrEqual(3);
      // Duplicate steps would make the puzzle ambiguous: the learner could
      // produce a different-but-identical order and be marked wrong.
      expect(new Set(s.items).size, `${where} has duplicate steps`).toBe(
        s.items.length
      );
      for (const item of s.items) {
        expect(item.trim().length, where).toBeGreaterThan(0);
      }
    }
  });

  it("lesson lookups work", () => {
    expect(findLesson("web", "css-layout")?.sandbox).toBe(true);
    expect(findLesson("dsa", "graphs-bfs-dfs")).toBeTruthy();
    expect(findLesson("nope", "nope")).toBeUndefined();
    expect(lessonKey("web", "css-layout")).toBe("web/css-layout");
  });

  it("total count matches the sum of lessons", () => {
    expect(totalLessonCount).toBe(allLessons.length);
    expect(totalLessonCount).toBeGreaterThanOrEqual(50);
  });

  it("every track ends with a capstone-style build lesson", () => {
    for (const t of tracks) {
      const last = t.lessons[t.lessons.length - 1];
      const isCapstone =
        /capstone|build|project/i.test(last.title) || /capstone/i.test(last.id);
      // Tracks without a formal capstone still end in a substantial applied lesson.
      expect(
        isCapstone || last.body.length > 500,
        `track ${t.id} final lesson "${last.title}"`
      ).toBe(true);
    }
  });

  it("every predict challenge has a valid answer and runnable code", async () => {
    const withPredict = allLessons.filter(({ lesson }) => lesson.predict?.length);
    expect(withPredict.length).toBeGreaterThanOrEqual(5);

    for (const { track, lesson } of withPredict) {
      lesson.predict!.forEach((p, i) => {
        expect(
          p.options.length,
          `${track.id}/${lesson.id} predict ${i}`
        ).toBeGreaterThanOrEqual(3);
        expect(p.answer, `${track.id}/${lesson.id} predict ${i}`).toBeGreaterThanOrEqual(0);
        expect(p.answer, `${track.id}/${lesson.id} predict ${i}`).toBeLessThan(p.options.length);
        expect(p.explanation.length, `${track.id}/${lesson.id} predict ${i}`).toBeGreaterThan(5);
      });
      // JS predict snippets must execute cleanly so the "verify by running"
      // button works; non-JS snippets (bash/python/sql) are display-only.
      for (const [i, p] of (lesson.predict ?? []).entries()) {
        if (p.lang != null && p.lang !== "js") continue;
        // Heuristic (pre-dates the lang tag): shell/python-style snippets
        // aren't runnable in the JS sandbox — except tagged JS with console.log.
        const jsish = !/^\s*(#|def |print|\w+ =)/.test(p.code) || /console\.log/.test(p.code);
        if (jsish) {
          const r = await runUserCode(p.code);
          expect(
            r.error,
            `${track.id}/${lesson.id} predict ${i} failed to run: ${r.error}`
          ).toBeNull();
        }
      }
    }
  }, 30_000);

  it(
    "every interactive starter runs cleanly and every check expression compiles",
    async () => {
      // Python lessons execute in the Pyodide worker, not the JS sandbox, and
      // `tests/python-exercises.test.ts` runs them through their own runtime —
      // feeding Python source to `new Function` would only produce a parse
      // error about the first identifier.
      const runnable = allLessons.filter(
        ({ lesson }) => lesson.starter && lesson.check && lesson.lang !== "python"
      );
      expect(runnable.length).toBeGreaterThan(8);

      for (const { track, lesson } of runnable) {
        // TODO-style exercises intentionally leave the starter incomplete —
        // completing it is the student's task. The app guarantees are:
        // first Run shows output (no crash) and the check expression is
        // valid JS (evaluateCheck swallows syntax errors as `false`, so
        // nothing else would catch a typo).
        //
        // TypeScript lessons run through the real compiler rather than the JS
        // sandbox, so a starter has to type-check too — otherwise the learner's
        // very first Run opens with diagnostics they didn't write.
        const isTs = lesson.lang === "ts";
        const result = isTs
          ? await runTs(lesson.starter!)
          : await runUserCode(lesson.starter!);
        const out = result.logs.join("\n");
        expect(
          result.error,
          `${track.id}/${lesson.id} errored: ${result.error}`
        ).toBeNull();
        if (isTs) {
          expect(
            (result as TsRunResult).typeErrors,
            `${track.id}/${lesson.id} starter does not type-check`
          ).toEqual([]);
        }
        expect(
          out.length,
          `${track.id}/${lesson.id} starter produced no output`
        ).toBeGreaterThan(0);
        expect(() => {
          new Function("output", `return (${lesson.check!.expr});`);
        }, `${track.id}/${lesson.id} check.expr must compile`).not.toThrow();
      }
    },
    60_000
  );
});

/*
 * Satisfiability guard.
 *
 * Two content bugs make an exercise worthless, and the generic checks above
 * see neither: they only prove a starter runs cleanly and its check expression
 * compiles. The failures that matter are a starter that already passes its own
 * check (the learner gets credit for nothing) and a check no correct answer can
 * meet (the lesson cannot be finished at all).
 *
 * `new-exercises.test.ts` and `milestones.test.ts` prove both away for the
 * three new tracks and the milestone proofs, but the other ten tracks had no
 * such proof — which is how `dsa/graphs-bfs-dfs` shipped building its graph
 * with the comma operator, making its required `BFS from A: A B C D E`
 * unreachable no matter what the learner wrote.
 *
 * A starter can also be pre-solved without being broken: `web/es6-syntax`
 * graded a refactor whose output is identical either way, and
 * `testing/debugging-method`'s "string price" bug was neutralised by `*`
 * coercing the string for it. Both are listed for the same reason — the
 * starter must not pass its own check.
 *
 * Each entry is a fix a learner is expected to write, applied to the lesson's
 * live starter. Deriving it from the starter rather than freezing a copy keeps
 * the guard testing the lesson as it actually ships.
 */
const REFERENCE_FIXES: { key: string; fix: (starter: string) => string }[] = [
  {
    key: "dsa/graphs-bfs-dfs",
    fix: (starter) =>
      starter.replace(
        /function shortestDist\(graph, start, end\) \{[\s\S]*?\n\}/,
        `function shortestDist(graph, start, end) {
  const seen = new Set([start]);
  const queue = [[start, 0]];
  while (queue.length) {
    const [node, dist] = queue.shift();
    if (node === end) return dist;
    for (const nb of graph.get(node) ?? []) {
      if (!seen.has(nb)) { seen.add(nb); queue.push([nb, dist + 1]); }
    }
  }
  return -1;
}`
      ),
  },
  {
    key: "web/scope-context",
    // The fix the hint names: `var` shares one binding across iterations.
    fix: (starter) =>
      starter.replace(
        "for (var i = 0; i < 3; i++)",
        "for (let i = 0; i < 3; i++)"
      ),
  },
  {
    key: "dsa/sorting",
    fix: (starter) =>
      starter.replace(
        "// TODO: build a 1000-item array, sort with both, and print the first 5",
        `const big = Array.from({ length: 1000 }, () => Math.floor(Math.random() * 10000));
console.log("big merge ok:", JSON.stringify(mergeSort(big).slice(0, 5)));`
      ),
  },
  {
    key: "web/async-promises",
    // Parallelism is observable in the interleaving: both brews start before
    // either boils, so the second `1. kettle on` precedes the first `2.`.
    fix: (starter) =>
      starter.replace(
        /async function main\(\) \{[\s\S]*?\n\}/,
        `async function main() {
  const teas = await Promise.all([brewTea(), brewTea()]);
  console.log("batch done:", teas.join(" + "));
}`
      ),
  },
  {
    key: "web/es6-syntax",
    // Both TODOs the lesson sets: the arrow + destructuring logger, and an
    // independent copy — `boosted = state` only aliases, so the boost leaks
    // back into the object it was supposed to leave untouched.
    fix: (starter) =>
      starter
        .replace(
          /\/\/ TODO 1:[\s\S]*?winners\.forEach\(\.\.\.\)/,
          `winners.forEach(({ name, points }) => console.log(name + ": " + points));`
        )
        .replace("const boosted = state;", "const boosted = { ...state };"),
  },
  {
    key: "testing/debugging-method",
    // `sum` starts at 0, so `sum + "80"` concatenates into "0802525": the fix
    // is to coerce each price at the boundary — the lesson's whole point.
    fix: (starter) =>
      starter.replace("sum += item.price;", "sum += Number(item.price);"),
  },
];

describe("exercise checks are satisfiable", () => {
  it("keeps a reference fix for every lesson that had no satisfiability proof", () => {
    // The gap opened because nothing forced the older tracks to be covered.
    expect(REFERENCE_FIXES.length).toBeGreaterThanOrEqual(4);
  });

  it(
    "rejects the starter but accepts a reference fix",
    async () => {
      for (const { key, fix } of REFERENCE_FIXES) {
        const [trackId, lessonId] = key.split("/");
        const lesson = findLesson(trackId, lessonId);
        expect(lesson?.starter, `${key} has no starter`).toBeTruthy();
        expect(lesson?.check, `${key} has no check`).toBeTruthy();

        const starterRun = await runUserCode(lesson!.starter!);
        expect(
          starterRun.error,
          `${key} starter threw: ${starterRun.error}`
        ).toBeNull();
        expect(
          evaluateCheck(lesson!.check!.expr, starterRun.logs.join("\n")),
          `${key} is pre-solved — the starter already passes its own check`
        ).toBe(false);

        const solved = fix(lesson!.starter!);
        expect(
          solved,
          `${key} reference fix did not change the starter`
        ).not.toBe(lesson!.starter);
        const solvedRun = await runUserCode(solved);
        expect(
          solvedRun.error,
          `${key} reference fix threw: ${solvedRun.error}`
        ).toBeNull();
        expect(
          evaluateCheck(lesson!.check!.expr, solvedRun.logs.join("\n")),
          `${key} check is unsatisfiable — no correct answer passes it`
        ).toBe(true);
      }
    },
    60_000
  );
});
