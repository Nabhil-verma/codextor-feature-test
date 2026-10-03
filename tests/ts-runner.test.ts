import { describe, expect, it } from "vitest";
import { runTs, typecheckTs } from "../src/lib/tsRunner";

/*
 * The TypeScript track's whole premise: the browser runs the real compiler.
 * These tests prove the in-memory CompilerHost resolves the bundled ES libs,
 * that diagnostics carry editor positions, and that grading can distinguish
 * "runs but lies to the type system" from a genuinely finished exercise.
 */

describe("tsRunner", () => {
  it("type-checks clean code with zero diagnostics", () => {
    const diags = typecheckTs(
      `const total = (nums: number[]): number =>
  nums.reduce((a, b) => a + b, 0);
console.log("total:", total([1, 2, 3]));`
    );
    expect(diags).toEqual([]);
  });

  it("reports a real type error with line, column and TS code", () => {
    const diags = typecheckTs(`const n: number = "not a number";`);
    expect(diags).toHaveLength(1);
    expect(diags[0].code).toBe(2322);
    expect(diags[0].line).toBe(1);
    // TS2322 points at the declared symbol — `n` at column 7.
    expect(diags[0].col).toBe(7);
    expect(diags[0].message).toMatch(/not assignable/i);
  });

  it("declares the sandbox globals the runner injects — console, timers, fetch", () => {
    const diags = typecheckTs(
      `setTimeout(() => console.log("later"), 10);
const res = await fetch("/api/users", { method: "GET" });
console.log(res.status, res.ok);`
    );
    expect(diags).toEqual([]);
  });

  it("does not promise the DOM the sandbox doesn't provide", () => {
    const diags = typecheckTs(`console.log(document.title);`);
    expect(diags.some((d) => d.message.includes("document"))).toBe(true);
  });

  it("allows top-level await", () => {
    const diags = typecheckTs(
      `const values = await Promise.all([Promise.resolve(1), Promise.resolve(2)]);
console.log(values.join(","));`
    );
    expect(diags).toEqual([]);
  });

  it("transpiles and runs TypeScript, capturing output", async () => {
    const r = await runTs(
      `function greet(name: string): string {
  return "hi " + name;
}
console.log(greet("ada"));`
    );
    expect(r.error).toBeNull();
    expect(r.typeErrors).toEqual([]);
    expect(r.logs).toEqual(["hi ada"]);
  });

  it("still executes when the program lies to the type system — but reports it", async () => {
    const r = await runTs(
      `const n: number = "6";
console.log("value:", n);`
    );
    // Type erasure means the program runs — which is exactly why the
    // grading gate needs the compiler's answer too.
    expect(r.error).toBeNull();
    expect(r.logs).toEqual(["value: 6"]);
    expect(r.typeErrors).toHaveLength(1);
    expect(r.typeErrors[0].code).toBe(2322);
  });

  it("keeps runtime errors as runtime errors", async () => {
    const r = await runTs(`const obj: Record<string, number> = {};
console.log(obj.nothing.deep);`);
    expect(r.error).toMatch(/Cannot read/);
    expect(r.typeErrors.length).toBeGreaterThan(0);
  });

  it("does not deadlock on top-level await with timers", async () => {
    const r = await runTs(
      `const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
await wait(30);
console.log("after wait");`
    );
    expect(r.error).toBeNull();
    expect(r.logs).toEqual(["after wait"]);
  });
});
