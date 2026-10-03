import { describe, it, expect } from "vitest";
import { runUserCode, evaluateCheck } from "../src/lib/runner";

describe("runUserCode", () => {
  it("captures console.log output", async () => {
    const r = await runUserCode(`console.log("hello", "world");`);
    expect(r.error).toBeNull();
    expect(r.logs).toEqual(["hello world"]);
  });

  it("serializes objects as JSON", async () => {
    const r = await runUserCode(`console.log({ a: 1 });`);
    expect(r.error).toBeNull();
    expect(r.logs[0]).toContain('"a": 1');
  });

  it("reports syntax/runtime errors", async () => {
    const r = await runUserCode(`null.foo;`);
    expect(r.error).toBeTruthy();
  });

  it("does not leak user variables into later runs", async () => {
    await runUserCode(`const secret = 42;`);
    const r2 = await runUserCode(`console.log(typeof secret);`);
    expect(r2.logs[0]).toBe("undefined");
  });

  it("stops infinite loops with the loop guard", async () => {
    const r = await runUserCode(
      `while (true) { /* spins forever without a guard */ }`,
      300
    );
    expect(r.error).toMatch(/took too long|infinite loop/i);
  });

  it("stops brace-less infinite while loops", async () => {
    const r = await runUserCode(
      `let x = 0; while (true) x = x + 1;`,
      300
    );
    expect(r.error).toMatch(/took too long|infinite loop/i);
  });

  it("runs normal loops to completion", async () => {
    const r = await runUserCode(`
      let sum = 0;
      for (let i = 1; i <= 100; i++) { sum += i; }
      console.log(sum);
    `);
    expect(r.error).toBeNull();
    expect(r.logs[0]).toBe("5050");
  });

  it("awaits promises before returning", async () => {
    const r = await runUserCode(`
      const p = Promise.resolve().then(() => console.log("async ran"));
      p;
    `);
    expect(r.error).toBeNull();
    expect(r.logs).toContain("async ran");
  });

  it("supports setTimeout with tracked timers", async () => {
    const r = await runUserCode(
      `setTimeout(() => console.log("timer fired"), 10);`,
      2000
    );
    expect(r.error).toBeNull();
    expect(r.logs).toContain("timer fired");
  });

  it("mock server: GET /api/users returns seeded users", async () => {
    const r = await runUserCode(`
      const res = await fetch("/api/users");
      const users = await res.json();
      console.log(users.map((u) => u.name).join(","));
    `);
    expect(r.error).toBeNull();
    expect(r.logs[0]).toBe("Ada,Lin,Sam");
  });

  it("mock server: POST /api/users creates with 201", async () => {
    const r = await runUserCode(`
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Grace" }),
      });
      console.log(res.status);
    `);
    expect(r.error).toBeNull();
    expect(r.logs[0]).toBe("201");
  });

  it("mock server: 404 for missing users", async () => {
    const r = await runUserCode(`
      const res = await fetch("/api/users/999");
      console.log(res.status);
    `);
    expect(r.error).toBeNull();
    expect(r.logs[0]).toBe("404");
  });
});

describe("evaluateCheck", () => {
  it("evaluates output expressions", () => {
    expect(evaluateCheck("output.includes('hi')", "line1\nhi there")).toBe(true);
    expect(evaluateCheck("output.includes('bye')", "line1\nhi there")).toBe(false);
  });

  it("returns false on invalid expressions instead of throwing", () => {
    expect(evaluateCheck("output.includes(", "x")).toBe(false);
  });
});
