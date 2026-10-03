import { describe, it, expect } from "vitest";
import { traceCode, instrument } from "../src/lib/stepper";

describe("instrument", () => {
  it("does not rewrite code inside strings or comments", () => {
    const src = [
      'const msg = "let x = 5;";',
      "// const trap = 1;",
      "/* let alsoTrap = 2; */",
    ].join("\n");
    const out = instrument(src);
    expect(out).toContain('__declare__("msg"');
    expect(out).not.toContain('__declare__("trap"');
    expect(out).not.toContain('__declare__("alsoTrap"');
  });
});

describe("traceCode", () => {
  it("traces lines, variables, and logs in order", async () => {
    const r = await traceCode(
      ["const a = 2;", "const b = a + 1;", 'console.log("sum", b);'].join("\n")
    );
    expect(r.error).toBeNull();
    // First step is line 1 before `a` exists; later steps show a & b.
    const afterA = r.steps.find((s) => s.vars.a === "2");
    expect(afterA).toBeTruthy();
    const afterB = r.steps.find((s) => s.vars.b === "3");
    expect(afterB).toBeTruthy();
    expect(r.steps.some((s) => s.logs.includes("sum 3"))).toBe(true);
    // Every step's line is within the source (line -1 is the final snapshot sentinel).
    for (const s of r.steps) {
      if (s.line === -1) continue; // final snapshot, not a source line
      expect(s.line).toBeGreaterThanOrEqual(1);
    }
  });

  it("shows the call stack and arguments entering functions", async () => {
    const code = [
      "function add(x, y) {",
      "  return x + y;",
      "}",
      "const total = add(2, 3);",
    ].join("\n");
    const r = await traceCode(code);
    expect(r.error).toBeNull();
    const inside = r.steps.find((s) => s.stack.includes("add"));
    expect(inside).toBeTruthy();
    expect(inside!.vars.x).toBe("2");
    expect(inside!.vars.y).toBe("3");
  });

  it("updates variables on reassignment", async () => {
    const code = ["let n = 1;", "n = n + 9;", "n = n * 10;"].join("\n");
    const r = await traceCode(code);
    const last = r.steps[r.steps.length - 1];
    expect(last.vars.n).toBe("100");
  });

  it("reports runtime errors but keeps the steps up to the crash", async () => {
    const r = await traceCode(["const ok = 1;", "null.foo;"].join("\n"));
    expect(r.error).toBeTruthy();
    expect(r.steps.length).toBeGreaterThanOrEqual(1);
  });

  it("aborts infinite loops via the tick guard", async () => {
    const r = await traceCode(["let i = 0;", "while (true) {", "  i = i + 1;", "}"].join("\n"), 800);
    expect(r.error).toMatch(/took too long/i);
  });

  it("truncates very long traces", async () => {
    const code = ["let s = 0;", "for (let i = 0; i < 5000; i++) {", "  s = s + i;", "}"].join("\n");
    const r = await traceCode(code, 4000);
    expect(r.steps.length).toBeLessThanOrEqual(2000);
  });
});
