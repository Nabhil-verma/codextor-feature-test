import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkExpressionSupported, evaluateCheckExpression } from "../src/lib/checkExpr";
import { evaluateCheck } from "../src/lib/runner";
import { tracks } from "../src/data";
import { DEBUG_CHALLENGES } from "../src/data/debug-challenges";
import { MILESTONES } from "../src/lib/milestones";

/*
 * The grading primitive used to be `new Function("output", ...)`, which
 * evaluates in the page's own global scope. These tests pin the replacement:
 * the shipped vocabulary still grades correctly, everything else fails
 * closed, and no expression can execute code again.
 */

describe("the grading evaluator", () => {
  it("grades the shipped vocabulary", () => {
    expect(evaluateCheckExpression("output.includes('hi')", "line1\nhi there")).toBe(true);
    expect(evaluateCheckExpression("output.includes('bye')", "line1\nhi there")).toBe(false);
    expect(evaluateCheckExpression("output.indexOf('a') > output.lastIndexOf('b')", "b-a")).toBe(true);
    expect(evaluateCheckExpression("output.indexOf('a') < output.lastIndexOf('b')", "b-a")).toBe(false);
    expect(evaluateCheck("output.includes('delegated')", "it is delegated")).toBe(true);
  });

  it("honours && / || precedence and parentheses", () => {
    expect(evaluateCheckExpression("output.includes('a') || output.includes('b') && output.includes('c')", "a")).toBe(true);
    expect(
      evaluateCheckExpression("(output.includes('a') || output.includes('b')) && output.includes('c')", "a")
    ).toBe(false);
    expect(evaluateCheckExpression("!output.includes('nope')", "yes")).toBe(true);
  });

  it("supports split()[i].trim() equality — the debug-lab form", () => {
    const output = "sorted: 8,15,42,99\noriginal: 42,8,99,15";
    const expr =
      'output.includes("sorted: 8,15,42,99") && output.split("\\n")[1].trim() === "original: 42,8,99,15"';
    expect(evaluateCheckExpression(expr, output)).toBe(true);
    expect(evaluateCheckExpression(expr, "sorted: 8,15,42,99\noriginal: 1,2")).toBe(false);
    expect(evaluateCheckExpression(expr, "original: 42,8,99,15")).toBe(false);
  });

  it("fails closed on anything outside the grammar", () => {
    expect(evaluateCheckExpression("output.includes(", "x")).toBe(false);
    expect(evaluateCheckExpression("output.match('x')", "x")).toBe(false);
    expect(evaluateCheckExpression("localStorage.getItem('key')", "x")).toBe(false);
    expect(evaluateCheckExpression("fetch('/api/users')", "x")).toBe(false);
    expect(checkExpressionSupported("output.match('x')")).toBe(false);
    expect(checkExpressionSupported("output.split('\\n')[0].trim() === 'a'")).toBe(true);
  });

  it("cannot be used to execute code (the old constructor escape is gone)", () => {
    const marker = "__gradingEvaluatorEscape";
    const expr = `output.constructor.constructor("globalThis.${marker} = true")()`;
    expect(evaluateCheckExpression(expr, "x")).toBe(false);
    expect((globalThis as Record<string, unknown>)[marker]).toBeUndefined();
  });

  it("recognises every expression the curriculum ships", () => {
    const unrecognised: string[] = [];
    const check = (expr: string, where: string) => {
      if (!checkExpressionSupported(expr)) unrecognised.push(`${where}: ${expr}`);
    };

    for (const track of tracks) {
      for (const lesson of track.lessons) {
        if (lesson.check) check(lesson.check.expr, `${track.id}/${lesson.id}`);
      }
    }
    for (const challenge of DEBUG_CHALLENGES) check(challenge.fixCheck, `debug:${challenge.id}`);
    for (const milestone of MILESTONES) {
      if (milestone.proof?.kind === "code") check(milestone.proof.check.expr, `milestone:${milestone.id}`);
    }

    // A new expression outside the grammar would otherwise grade everything
    // as false at runtime — this test makes that a build failure instead.
    expect(unrecognised).toEqual([]);
  });

  it("keeps the evaluator itself free of eval and new Function", () => {
    const source = readFileSync(new URL("../src/lib/checkExpr.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/\beval\s*\(/);
    expect(source).not.toMatch(/\bnew\s+Function\s*\(/);
  });
});
