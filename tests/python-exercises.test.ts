import { describe, expect, it } from "vitest";
import { runPython } from "../src/lib/pythonRunner";
import { evaluateCheck } from "../src/lib/runner";
import { tracks, findLesson } from "../src/data";

/*
 * Fix 1's acceptance test, mirroring `tests/debug-challenges.test.ts` for the
 * JS library: a Python exercise is only real if its starter fails its own
 * check AND a reference fix passes it. Pyodide is heavy (~2.3 s to boot), so
 * the reference solutions run against one loaded runtime.
 *
 * The third invariant is the one that makes the LLM lesson gradable at all:
 * the fixture must fail a *deterministic* number of times. If it drifted, the
 * same learner code would pass or fail on run order.
 */

const python = tracks.find((t) => t.id === "python")!;
const executed = python.lessons.filter((l) => l.starter && l.lang === "python");

/** The fixes a learner is expected to write, applied to each live starter. */
const REFERENCE_FIXES: Record<string, string> = {
  "python-syntax": `def add_tag(tag, tags=None):
    if tags is None:
        tags = []
    tags.append(tag)
    return tags

print("first:", add_tag("py"))
print("second:", add_tag("data"))
print("defaults independent:", add_tag("x") == ["x"])`,
  "python-oop": `class MissingFieldError(Exception):
    pass

def parse_age(record):
    if "age" not in record:
        raise MissingFieldError("age")
    return int(record["age"])

def read_age(record):
    try:
        return ("ok", parse_age(record))
    except ValueError:
        return ("invalid", None)
    except MissingFieldError:
        return ("missing", None)

print("valid:", read_age({"age": "36"}))
print("bad value:", read_age({"age": "thirty"}))
print("missing field:", read_age({}))`,
  "python-llm-api": `from client import call_model, RateLimitError, BadRequestError, validate

def ask(prompt, max_attempts=4):
    retries = 0
    while True:
        try:
            return call_model(prompt)["text"][0]["content"], retries
        except RateLimitError:
            retries += 1
            print("handled: RateLimitError")
            if retries >= max_attempts:
                raise
            continue

text, retries = ask("summarise: refund policy")
print("answer:", text)
print("retries:", retries)

try:
    validate({"prompt": ""})
except BadRequestError:
    print("400 -> raised, not retried")`,
};

describe("Python track executes for real", () => {
  it("ships three executed lessons and one honest reading", () => {
    expect(executed.map((l) => l.id)).toEqual([
      "python-syntax",
      "python-oop",
      "python-llm-api",
    ]);
    // pandas/numpy stay a reading — the wheels are out of scope for the
    // browser runtime, and the lesson says so in its body.
    const pandas = findLesson("python", "pandas-numpy")!;
    expect(pandas.reading).toBe(true);
    expect(pandas.starter).toBeUndefined();
  });

  it("keeps every executed lesson's starter failing its own check", async () => {
    for (const lesson of executed) {
      const r = await runPython(lesson.starter!, { prelude: lesson.pythonPrelude });
      const ok = !r.error && evaluateCheck(lesson.check!.expr, r.logs.join("\n"));
      expect(
        ok,
        `python/${lesson.id} is pre-solved — the starter already passes its check`
      ).toBe(false);
    }
  }, 120_000);

  it("accepts a reference fix for every executed lesson", async () => {
    for (const lesson of executed) {
      const fix = REFERENCE_FIXES[lesson.id];
      expect(fix, `no reference fix recorded for python/${lesson.id}`).toBeTruthy();
      const r = await runPython(fix, { prelude: lesson.pythonPrelude });
      expect(r.error, `python/${lesson.id} fix threw: ${r.error}`).toBe(null);
      expect(
        evaluateCheck(lesson.check!.expr, r.logs.join("\n")),
        `python/${lesson.id} fix does not satisfy its own check`
      ).toBe(true);
    }
  }, 120_000);

  it("gives every executed lesson a full hint ladder", () => {
    for (const lesson of executed) {
      const hints = lesson.check?.hints ?? [];
      expect(hints.length, `python/${lesson.id} hints`).toBeGreaterThanOrEqual(3);
      const tiers = hints.map((h) => h.tier);
      expect(tiers).toEqual([...tiers].sort((a, b) => a - b));
    }
  });
});

describe("the LLM fixture is deterministic", () => {
  it("rate-limits exactly twice, then answers — on every run", async () => {
    const lesson = findLesson("python", "python-llm-api")!;
    // Three fresh runs of the same probing program must agree, or the lesson
    // would grade on luck.
    const probe = `from client import call_model, RateLimitError
attempts = 0
while True:
    try:
        text = call_model("x")["text"][0]["content"]
        break
    except RateLimitError:
        attempts += 1
print("attempts:", attempts)
print("text:", text)`;

    for (let i = 0; i < 3; i++) {
      const r = await runPython(probe, { prelude: lesson.pythonPrelude });
      expect(r.error, `run ${i}: ${r.error}`).toBe(null);
      expect(r.logs).toEqual([
        "attempts: 2",
        "text: Refunds are processed in 5 business days.",
      ]);
    }
  }, 120_000);

  it("surfaces a Python error rather than a bare crash", async () => {
    const r = await runPython("def f():\n    return 1 / 0\nf()");
    expect(r.error).toContain("ZeroDivisionError");
    expect(r.logs).toEqual([]);
  }, 120_000);
});