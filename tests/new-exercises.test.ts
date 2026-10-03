import { describe, expect, it } from "vitest";
import { tracks, findLesson } from "../src/data";
import { evaluateCheck, runUserCode } from "../src/lib/runner";
import { runTs } from "../src/lib/tsRunner";

/*
 * Two failure modes make an exercise worthless, and neither is caught by the
 * generic curriculum checks:
 *
 *  1. The starter already passes its own check — the learner gets nothing.
 *  2. The check is unsatisfiable — no correct answer can pass it.
 *
 * Both are content bugs, so they get content tests. The reference solutions
 * below are written independently of the lesson hints; their only job is to
 * prove each check can actually be met.
 */

const NEW_TRACKS = ["tailwind", "state", "api", "typescript", "performance"];

const SOLUTIONS: Record<string, string> = {
  "state/usereducer": `const initial = { count: 0, total: 0 };

function reducer(state, action) {
  switch (action.type) {
    case "add":
      return { count: state.count + 1, total: state.total + action.price };
    case "remove":
      return { count: state.count - 1, total: state.total - action.price };
    case "clear":
      return initial;
    default:
      return state;
  }
}

function play(actions) {
  return actions.reduce(reducer, initial);
}

const one = play([{ type: "add", price: 25 }]);
console.log("after add(25):", one.count, one.total);

const two = play([{ type: "add", price: 25 }, { type: "add", price: 10 }]);
console.log("after two adds:", two.count, two.total);

const cleared = play([{ type: "add", price: 25 }, { type: "clear" }]);
console.log("after clear:", cleared.count, cleared.total);

const removed = play([
  { type: "add", price: 25 },
  { type: "add", price: 10 },
  { type: "remove", price: 10 },
]);
console.log("after remove:", removed.count, removed.total);`,

  "state/external-stores": `function createStore(initial) {
  let state = initial;
  const listeners = new Set();

  return {
    getState: () => state,

    setState(partial) {
      const next = { ...state, ...partial };
      if (next.count === state.count && next.theme === state.theme) return;
      state = next;
      for (const fn of listeners) fn();
    },

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

const store = createStore({ count: 0, theme: "light" });
const notified = [];
const unsubscribe = store.subscribe(() => notified.push(store.getState().count));

store.setState({ count: 1 });
store.setState({ count: 2 });
store.setState({ count: 2 });
unsubscribe();
store.setState({ count: 3 });

console.log("state:", JSON.stringify(store.getState()));
console.log("notified with:", notified.join(","));`,

  "api/http-verbs": `async function main() {
  const res = await fetch("/api/users");
  const users = await res.json();

  console.log("status:", res.status);
  console.log("count:", users.length);
  console.log("first:", users[0] && users[0].name);
  console.log("roles:", users.map((u) => u.role).join(","));
}

main();`,

  "api/abort-races": `const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let latest = 0;
const rendered = [];

async function load(query, delay) {
  const id = ++latest;
  await sleep(delay);
  if (id !== latest) return;
  rendered.push(query);
}

async function main() {
  await Promise.all([load("a", 60), load("b", 10), load("c", 30)]);
  console.log("rendered:", rendered.join(","));
}

main();`,

  "state/capstone-state-machine": `const TRANSITIONS = {
  cart: ["address"],
  address: ["payment", "cart"],
  payment: ["done", "address"],
  done: [],
};

const PREVIOUS = { address: "cart", payment: "address", done: "payment" };

function reducer(state, event) {
  if (event === "next") {
    const forward = TRANSITIONS[state];
    return forward.length ? forward[0] : state;
  }
  if (event === "back") {
    return PREVIOUS[state] ?? state;
  }
  return state;
}

function run(events) {
  return events.reduce(reducer, "cart");
}

console.log("happy path:", run(["next", "next", "next"]));
console.log("illegal skip:", run(["next", "next", "next", "next"]));
console.log("one step back:", run(["next", "next", "back"]));
console.log("no back from cart:", run(["back"]));`,

  "api/capstone-api-client": `const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function makeTransport(failuresBeforeSuccess) {
  let calls = 0;
  return async (path) => {
    calls += 1;
    if (calls <= failuresBeforeSuccess) {
      return { ok: false, status: 503, json: async () => ({ error: "unavailable" }) };
    }
    return { ok: true, status: 200, json: async () => ({ path, calls }) };
  };
}

async function request(transport, path, { retries = 3, baseDelay = 5 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await transport(path);
    if (res.ok) return res;
    if (res.status < 500) throw new Error("Request failed: " + res.status);
    if (attempt < retries) await sleep(baseDelay * 2 ** attempt);
  }
  throw new Error("Gave up after " + (retries + 1) + " attempts");
}

async function main() {
  const flaky = makeTransport(2);
  const res = await request(flaky, "/api/users", { retries: 3, baseDelay: 5 });
  const body = await res.json();
  console.log("recovered after retries:", res.status, body.calls);

  const dead = makeTransport(9);
  try {
    await request(dead, "/api/users", { retries: 3, baseDelay: 5 });
    console.log("should not reach here");
  } catch (err) {
    console.log("gave up after 4 attempts:", err.message);
  }
}

main();`,

  /* TypeScript solutions are written the way the lesson asks for them: with
   * real annotations, not `any`. The `ts` runner is the grade gate, so each
   * one has to compile clean *and* print the right thing. */

  "typescript/annotations": `function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function average(nums: number[]): number {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

function repeat(text: string, times: number): string {
  return times <= 0 ? "" : text.repeat(times);
}

console.log("clamp:", clamp(12, 0, 10), clamp(-3, 0, 10), clamp(5, 0, 10));
console.log("average:", average([2, 4, 9]));
console.log("average empty:", average([]));
console.log("repeat:", JSON.stringify(repeat("ab", 3)));`,

  "typescript/narrowing": `type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: string[] };

function describe(state: FetchState): string {
  if (state.status === "idle") return "waiting";
  if (state.status === "loading") return "loading...";
  if (state.status === "error") return "error: " + state.message;
  return state.data.length + " items";
}

console.log(describe({ status: "idle" }));
console.log(describe({ status: "loading" }));
console.log(describe({ status: "error", message: "offline" }));
console.log(describe({ status: "ready", data: ["a", "b"] }));`,

  "typescript/generics": `function first<T>(items: T[], fallback: T): T {
  return items.length ? items[0] : fallback;
}

function countBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) {
    const k = key(item);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

console.log("first:", first(["ada", "lin"], "none"));
console.log("empty:", first([] as string[], "none"));
console.log("colors:", JSON.stringify(countBy(["red", "blue", "red"], (c) => c)));
console.log(
  "widths:",
  JSON.stringify(
    countBy(["a", "bb", "ccc"], (w) => (w.length > 2 ? "long" : "short"))
  )
);`,

  "typescript/unknown-errors": `type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

function safeParse<T>(text: string, required: (v: unknown) => v is T): Parsed<T> {
  try {
    const value: unknown = JSON.parse(text);
    if (!required(value)) return { ok: false, error: "invalid shape" };
    return { ok: true, value };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "bad JSON" };
  }
}

const isUser = (v: unknown): v is { id: number; name: string } => {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === "number" && typeof o.name === "string";
};

console.log("good:", JSON.stringify(safeParse('{"id":1,"name":"ada"}', isUser)));
console.log("broken:", JSON.stringify(safeParse("{oops", isUser)));
console.log("wrong shape:", JSON.stringify(safeParse('{"id":"1"}', isUser)));`,

  "typescript/capstone-type-layer": `type Todo = { id: number; text: string; done: boolean };
type Filter = "all" | "active" | "done";
type State = { todos: Todo[]; filter: Filter };

type Action =
  | { type: "add"; text: string }
  | { type: "toggle"; id: number }
  | { type: "setFilter"; filter: Filter };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "add":
      return {
        ...state,
        todos: [
          ...state.todos,
          { id: state.todos.length + 1, text: action.text, done: false },
        ],
      };
    case "toggle":
      return {
        ...state,
        todos: state.todos.map((t) =>
          t.id === action.id ? { ...t, done: !t.done } : t
        ),
      };
    case "setFilter":
      return { ...state, filter: action.filter };
  }
}

function visible(state: State): Todo[] {
  if (state.filter === "active") return state.todos.filter((t) => !t.done);
  if (state.filter === "done") return state.todos.filter((t) => t.done);
  return state.todos;
}

let s: State = { todos: [], filter: "all" };
s = reducer(s, { type: "add", text: "write types" });
s = reducer(s, { type: "add", text: "ship" });
s = reducer(s, { type: "toggle", id: 1 });

console.log("count:", s.todos.length);
console.log("first done:", s.todos[0] && s.todos[0].done);

s = reducer(s, { type: "setFilter", filter: "active" });
console.log("active:", visible(s).map((t) => t.text).join(","));

s = reducer(s, { type: "setFilter", filter: "done" });
console.log("done filter:", visible(s).map((t) => t.text).join(","));

const before = JSON.stringify(s);
const after = reducer(s, { type: "toggle", id: 2 });
console.log("immutable:", JSON.stringify(s) === before);
console.log("toggle landed:", after.todos[1] && after.todos[1].done);`,
};

const newTracks = tracks.filter((t) => NEW_TRACKS.includes(t.id));
const interactive = newTracks.flatMap((t) =>
  t.lessons
    .filter((l) => l.starter && l.check)
    .map((l) => ({ track: t.id, lesson: l, key: t.id + "/" + l.id }))
);

describe("new interactive exercises", () => {
  // The Tailwind track is interactive through live preview sandboxes rather
  // than the code playground, so "interactive" spans both mechanisms.
  it("makes every new track interactive", () => {
    for (const id of NEW_TRACKS) {
      const track = tracks.find((t) => t.id === id)!;
      const count = track.lessons.filter(
        (l) => l.preview || (l.starter && l.check) || l.debug || l.predict
      ).length;
      expect(count, `track "${id}" has no interactive lessons`).toBeGreaterThan(0);
    }
  });

  it("is not already solved by the starter", async () => {
    for (const { key, lesson } of interactive) {
      // TypeScript starters execute through the compiler, so the "not solved"
      // claim is checked against the same program the learner's Run uses.
      const r =
        lesson.lang === "ts"
          ? await runTs(lesson.starter!)
          : await runUserCode(lesson.starter!);
      expect(r.error, `${key} starter threw: ${r.error}`).toBe(null);
      expect(
        evaluateCheck(lesson.check!.expr, r.logs.join("\n")),
        `${key} is pre-solved — the starter already passes its own check`
      ).toBe(false);
    }
  }, 30_000);

  it("accepts an independently written solution", async () => {
    for (const { key, lesson } of interactive) {
      const solution = SOLUTIONS[key];
      expect(solution, `no reference solution for ${key}`).toBeTruthy();
      if (lesson.lang === "ts") {
        const r = await runTs(solution);
        expect(r.error, `${key} reference solution threw: ${r.error}`).toBe(null);
        // The TypeScript track's extra gate: a solution that prints the right
        // thing but lies to the compiler is not finished.
        expect(
          r.typeErrors,
          `${key} reference solution has type errors`
        ).toEqual([]);
        expect(
          evaluateCheck(lesson.check!.expr, r.logs.join("\n")),
          `${key} check is unsatisfiable — the reference solution fails it`
        ).toBe(true);
        continue;
      }
      const r = await runUserCode(solution);
      expect(r.error, `${key} reference solution threw: ${r.error}`).toBe(null);
      expect(
        evaluateCheck(lesson.check!.expr, r.logs.join("\n")),
        `${key} check is unsatisfiable — the reference solution fails it`
      ).toBe(true);
    }
  }, 30_000);

  it("gives every interactive exercise a full three-tier hint ladder", () => {
    for (const { key, lesson } of interactive) {
      const hints = lesson.check!.hints ?? [];
      expect(hints.length, `${key} needs a 3-tier hint ladder`).toBe(3);
      expect(hints.map((h) => h.tier)).toEqual([1, 2, 3]);
    }
  });
});

describe("new tracks reference real content", () => {
  it("attaches a real debug challenge to at least one lesson per applicable track", () => {
    expect(findLesson("state", "state-shapes")?.debug?.id).toBe("shallow-copy");
    expect(findLesson("api", "fetch-async")?.debug?.id).toBe("missing-await");
  });

  it("gives every preview sandbox an acceptance test", () => {
    const previews = newTracks.flatMap((t) =>
      t.lessons
        .filter((l) => l.preview)
        .map((l) => ({ key: t.id + "/" + l.id, spec: l.preview! }))
    );
    expect(previews.length).toBeGreaterThanOrEqual(3);
    for (const { key, spec } of previews) {
      expect(spec.requires?.length, `${key} preview has nothing to verify`).toBeGreaterThan(0);
      expect(spec.brief.length, `${key} preview has no brief`).toBeGreaterThan(20);
      expect(spec.html.length, `${key} preview has no starter markup`).toBeGreaterThan(20);
    }
  });
});
