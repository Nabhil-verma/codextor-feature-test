import type { DebugChallenge, Hint } from "./types";

/* ═══════════════════════════════════════════════════════════════
   Taxonomy coverage — the codes the library never planted.

   V2 §2 names six codes that can block *executed* code, but the
   shipped library only ever planted three of them (SL, EC, RC):
   HA, ID and CX had zero graded exercises, so the "one test per
   category" claim had no mechanism behind it. These three challenges
   plant the missing codes, one per lesson whose subject they belong
   to (see the wiring table in `src/data/index.ts`).

   This module also carries the taxonomy diagnoses for the legacy
   library entries, which predate the `diagnosis` field. Diagnoses are
   what make partial credit on the *judgment* possible — 0.5 recorded
   when the category is right and the repair is not.

   Same authoring contract as `debug-challenges.ts`: the broken program
   runs cleanly or fails with a runtime error (never a parse error), a
   reference fix ships beside it, and the check is an output expression
   in the existing grammar.
   ═══════════════════════════════════════════════════════════════ */

const h = (tier: 1 | 2 | 3, text: string): Hint => ({ tier, text });

type Diagnosis = NonNullable<DebugChallenge["diagnosis"]>;

/**
 * The seven legacy challenges, diagnosed. Answers stay inside the executed
 * code set — a review-only code (SC/TG/NM/DL) can never block a program that
 * runs, and the test suite enforces that split.
 */
export const LEGACY_DIAGNOSES: Record<string, Diagnosis> = {
  "off-by-one": {
    prompt: "What kind of defect is this?",
    codes: ["EC", "SL", "RC", "CX"],
    answer: "EC",
  },
  "silent-mutator": {
    prompt: "What kind of defect is this?",
    codes: ["SL", "EC", "RC", "CX"],
    answer: "SL",
  },
  "closure-trap": {
    prompt: "What kind of defect is this?",
    codes: ["SL", "EC", "RC", "CX"],
    answer: "SL",
  },
  "lost-this": {
    prompt: "What kind of defect is this?",
    codes: ["SL", "EC", "HA", "CX"],
    answer: "SL",
  },
  "missing-await": {
    prompt: "What kind of defect is this?",
    codes: ["RC", "SL", "EC", "CX"],
    answer: "RC",
  },
  "shallow-copy": {
    prompt: "What kind of defect is this?",
    codes: ["SL", "EC", "RC", "CX"],
    answer: "SL",
  },
  "sort-and-mutate": {
    prompt: "What kind of defect is this?",
    codes: ["SL", "EC", "CX", "HA"],
    answer: "SL",
  },
};

export const EXTRA_CHALLENGES: DebugChallenge[] = [
  {
    id: "semantics-refactor",
    title: "The Refactor That Changed What the Code Means",
    brief:
      "The agent's note says 'modernised to default parameters — no behaviour change'. Two of the four printed lines say otherwise: the count is wrong whenever a value is falsy.",
    broken: `function repeat(times, label) {
  // modernised: concise defaults instead of the explicit checks
  const count = times || 1;
  const name = label || "item";
  return Array.from({ length: count }, (_, i) => name + " #" + (i + 1));
}

console.log("default:", repeat().join(", "));
console.log("zero:", repeat(0).length);
console.log("empty label kept:", repeat(2, "")[0] === " #1");
console.log("three:", repeat(3, "row").length);`,
    fixCheck:
      'output.includes("zero: 0") && output.includes("empty label kept: true") && output.includes("three: 3")',
    win: "An explicit `=== undefined` check keeps 0 and the empty string, which are legitimate values — `||` silently replaced both.",
    hints: [
      h(
        1,
        "Run it. Three lines are right and one is wrong — compare the value each call passes with the value the function ends up using."
      ),
      h(
        2,
        "`||` replaces every falsy value, and `??` replaces only null/undefined. Which of the four calls passes a value that is falsy but legitimate?"
      ),
      h(
        3,
        "The `|| 1` on `times` is the defect: `0` is a legitimate count that `||` throws away. Test for the missing value explicitly — `times === undefined ? 1 : times` — and do the same for `label`."
      ),
    ],
    solution:
      "The refactor is not behaviour-preserving, and the note claims it is. `||` substitutes for *every* falsy value, so `repeat(0)` builds a one-item array instead of an empty one and `repeat(2, \"\")` replaces the deliberately empty label. The fix is to say what you mean: `times === undefined ? 1 : times` and `label === undefined ? \"item\" : label`. The lesson is the general one — a semantic change can hide inside a style change, and the agent's summary is a claim about its own work, not evidence.",
    fix: `function repeat(times, label) {
  const count = times === undefined ? 1 : times;
  const name = label === undefined ? "item" : label;
  return Array.from({ length: count }, (_, i) => name + " #" + (i + 1));
}

console.log("default:", repeat().join(", "));
console.log("zero:", repeat(0).length);
console.log("empty label kept:", repeat(2, "")[0] === " #1");
console.log("three:", repeat(3, "row").length);`,
    diagnosis: {
      prompt: "What kind of defect is this?",
      codes: ["EC", "SL", "RC", "CX"],
      answer: "EC",
    },
  },
  {
    id: "ai-sort-comparator",
    title: "The Sort That Only Works on Small Inputs",
    brief:
      "The comment says 'handles duplicates'. The unsorted case passes, the duplicate case passes, and the already-sorted case produces a different order on every run.",
    broken: `const ops = { compares: 0 };
const BUDGET = 100000;

function quickSort(items) {
  // handles duplicates
  if (items.length <= 1) return items;
  const pivot = items[0];
  const left = [];
  const right = [];
  for (const item of items.slice(1)) {
    ops.compares++;
    if (ops.compares > BUDGET) throw new Error("operation budget exceeded");
    if (item <= pivot) left.push(item);
    else right.push(item);
  }
  return [...quickSort(left), pivot, ...quickSort(right)];
}

const sorted = Array.from({ length: 400 }, (_, i) => i);
console.log("already sorted:", JSON.stringify(quickSort(sorted)) === JSON.stringify(sorted));
console.log("compares:", ops.compares);
console.log("duplicates:", quickSort([3, 1, 3, 2]).join(","));`,
    fixCheck:
      'output.includes("already sorted: true") && output.includes("duplicates: 1,2,3,3") && output.includes("compares: 2953")',
    win: "A pivot taken from the middle of the array keeps the recursion balanced: 400 items cost ~2,400 comparisons instead of tripping the budget on an already-sorted input.",
    hints: [
      h(
        1,
        "Run it and read the budget error. Which input shape is worst for a pivot chosen from the first element?"
      ),
      h(
        2,
        "Taking `items[0]` as the pivot means an already-sorted array puts *everything* on one side, every time — the recursion never divides. The comparison count is the proof."
      ),
      h(
        3,
        "Choose the pivot from the middle (`items[items.length >> 1]`) and skip it when partitioning. Keep the `<=` on the left partition so duplicates stay stable in count."
      ),
    ],
    solution:
      "Two defects in one function. (1) **Complexity:** the pivot is the first element, so an already-sorted array degenerates to O(n²) — 400 items means 79,800 comparisons, and a slightly larger input trips the budget outright. Choosing the middle element restores the balanced case: 2,953 comparisons, which is n·log₂(n) rounded. (2) **Silent logic:** the check asserts the printed count, so a fix that merely raised the budget still fails — the operation count is the evidence that the complexity actually changed, not the absence of an error. This is the shape of the AI-sort bug the DSA track exists to teach: correct on the sample, wrong on the input that matters.",
    fix: `const ops = { compares: 0 };
const BUDGET = 100000;

function quickSort(items) {
  if (items.length <= 1) return items;
  const pivot = items[items.length >> 1];
  const left = [];
  const right = [];
  let equal = 0;
  for (const item of items) {
    ops.compares++;
    if (ops.compares > BUDGET) throw new Error("operation budget exceeded");
    if (item < pivot) left.push(item);
    else if (item > pivot) right.push(item);
    else equal++;
  }
  return [
    ...quickSort(left),
    ...Array.from({ length: equal }, () => pivot),
    ...quickSort(right),
  ];
}

const sorted = Array.from({ length: 400 }, (_, i) => i);
console.log("already sorted:", JSON.stringify(quickSort(sorted)) === JSON.stringify(sorted));
console.log("compares:", ops.compares);
console.log("duplicates:", quickSort([3, 1, 3, 2]).join(","));`,
    diagnosis: {
      prompt: "What kind of defect is this?",
      codes: ["CX", "SL", "EC", "RC"],
      answer: "CX",
    },
  },
  {
    id: "quadratic-dedupe",
    title: "The Duplicate Check That Cost a Quarter Million Comparisons",
    brief:
      "The comment says this was 'verified against production data'. On a 600-item batch the budget counter trips before the answer arrives — while the same answer is one Set away.",
    broken: `const items = Array.from({ length: 600 }, (_, i) => i * 2);
const ops = { n: 0 };
const BUDGET = 20000;

function containsDuplicate(nums) {
  // verified against production data at scale
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      ops.n++;
      if (ops.n > BUDGET) throw new Error("operation budget exceeded");
      if (nums[i] === nums[j]) return true;
    }
  }
  return false;
}

console.log("first pass:", containsDuplicate(items));
const afterFirst = ops.n;
console.log("operations:", afterFirst);
console.log("duplicate case:", containsDuplicate([1, 2, 2]));`,
    fixCheck:
      'output.includes("first pass: false") && output.includes("operations: 600") && output.includes("duplicate case: true")',
    win: "One pass, one payment: the Set answers 'seen before?' in constant time, so 600 items cost 600 operations instead of a quarter of a million.",
    hints: [
      h(
        1,
        "Run it and read the error: the budget is a stand-in for real time. Where does the work grow fastest — with the number of items, or with the number of *pairs*?"
      ),
      h(
        2,
        "The inner loop exists only to compare each item against every item after it. A structure that can answer 'have I seen this value already?' removes the inner loop entirely."
      ),
      h(
        3,
        "Use a Set: one loop over nums, `ops.n++` once per item, `if (seen.has(x)) return true` else `seen.add(x)`. The reference fix prints `operations: 600` because it touches each item exactly once."
      ),
    ],
    solution:
      "A nested loop over all pairs is O(n²): 600 items means ~179,700 comparisons before it can conclude there is no duplicate, which the budget turns into a hard, deterministic failure (never wall-clock timing). The fix is the canonical dedupe: a Set answers membership in O(1), so one pass answers the same question — and the printed operation count is the proof the complexity actually changed, not just that the tests went green.",
    fix: `const items = Array.from({ length: 600 }, (_, i) => i * 2);
const ops = { n: 0 };

function containsDuplicate(nums) {
  const seen = new Set();
  for (const n of nums) {
    ops.n++;
    if (seen.has(n)) return true;
    seen.add(n);
  }
  return false;
}

console.log("first pass:", containsDuplicate(items));
const afterFirst = ops.n;
console.log("operations:", afterFirst);
console.log("duplicate case:", containsDuplicate([1, 2, 2]));`,
    diagnosis: {
      prompt: "What kind of defect is this?",
      codes: ["CX", "SL", "EC", "RC"],
      answer: "CX",
    },
  },
  {
    id: "invented-helpers",
    title: "The Helpers That Were Never Invented",
    brief:
      "The comments name two platform helpers. Neither exists, and the program dies on its first call — the model wrote plausible-looking API surface instead of code that runs.",
    broken: `function clampScore(n) {
  // the platform's built-in clamp
  return Math.clamp(n, 0, 100);
}

function ranked(scores) {
  // .sorted() returns a sorted copy
  return [...new Set(scores)].sorted((a, b) => a - b);
}

console.log("clamped:", clampScore(137), clampScore(-4));
console.log("ranked:", ranked([42, 7, 42, 19]).join(","));`,
    fixCheck:
      'output.includes("clamped: 100 0") && output.includes("ranked: 7,19,42")',
    win: "The real APIs do the same job: Math.min/Math.max for the clamp, and a copied .sort() — which also keeps the original array untouched.",
    hints: [
      h(
        1,
        "Run it. The error names the exact expression that does not exist — that is the hallucination, and it is only the first one."
      ),
      h(
        2,
        "There is no Array.prototype.sorted and no Math.clamp. Ask what each line is for: clamping a number into a range, and a sorted copy without mutating the input."
      ),
      h(
        3,
        "Use Math.min(100, Math.max(0, n)) for the clamp, and `[...new Set(scores)].sort((a, b) => a - b)` — the spread already gives you the copy that `.sorted()` was pretending to."
      ),
    ],
    solution:
      "Two invented APIs (HA). Math.clamp and Array.prototype.sorted are neither in the language nor in any of the bounded environments this app runs (the sandbox's ambient declarations are the same surface the TypeScript track compiles against). The honest fix uses the real methods: Math.min/Math.max for the range, and a copied .sort for ordering. Note the copy — sort() mutates in place, which is why the naive `.sort()` on the Set spread is correct here but on a caller's array would not be.",
    fix: `function clampScore(n) {
  return Math.min(100, Math.max(0, n));
}

function ranked(scores) {
  return [...new Set(scores)].sort((a, b) => a - b);
}

console.log("clamped:", clampScore(137), clampScore(-4));
console.log("ranked:", ranked([42, 7, 42, 19]).join(","));`,
    diagnosis: {
      prompt: "What kind of defect is this?",
      codes: ["HA", "SL", "EC", "CX"],
      answer: "HA",
    },
  },
  {
    id: "trusted-role-header",
    title: "The Role That Came From the Caller",
    brief:
      "The middleware reads the role out of a header the client controls. The audit lines show which branch ran — and the spoofed request is accepted as an admin.",
    broken: `const USERS = { u1: { id: "u1", role: "viewer" }, u2: { id: "u2", role: "admin" } };

function authorize(session) {
  // the gateway sets x-user-role before we ever see the request
  const role = session.headers["x-user-role"] ?? "viewer";
  if (role === "admin") {
    console.log("insecure: admin granted from a client-supplied header");
    return true;
  }
  console.log("secure: viewer denied");
  return false;
}

const spoofed = { userId: "u1", headers: { "x-user-role": "admin" } };
const realAdmin = { userId: "u2", headers: { "x-user-role": "admin" } };
console.log("spoofed admin accepted:", authorize(spoofed));
console.log("real admin accepted:", authorize(realAdmin));
console.log("unsigned request accepted:", authorize({ userId: "u1", headers: {} }));`,
    fixCheck:
      '!output.includes("insecure: admin granted") && output.includes("spoofed admin accepted: false") && output.includes("real admin accepted: true") && output.includes("ignored client-supplied role claim")',
    win: "The role now comes from the server-side store. The header is still noticed — and explicitly ignored, on the record — while the real admin still gets in.",
    hints: [
      h(
        1,
        "Read the three outcomes in order. One of them should never be possible: which request is claiming something about itself?"
      ),
      h(
        2,
        "A header is input, not identity. The role has to come from a source the caller cannot write — here, the USERS record keyed by the authenticated userId."
      ),
      h(
        3,
        "Look up the user by `session.userId`, read `user.role`, and ignore `x-user-role` entirely (log that you ignored it). Derive, never trust."
      ),
    ],
    solution:
      "An insecure default (ID): authorization derived from a client-supplied header. Any caller can set `x-user-role: admin`, and the instrumented fixture makes the decision observable — the `insecure:` line proves the unsafe branch ran, and the check fails while it does. The repair treats the header as untrusted input: the role is read from the server-side store, unknown users are denied, and the ignored claim is logged so the decision is auditable. The same discipline covers the other ID shapes — permissive CORS, string-concatenated SQL, disabled certificate checks — the fix is never 'hide it better', it is 'stop deriving authority from input'.",
    fix: `const USERS = { u1: { id: "u1", role: "viewer" }, u2: { id: "u2", role: "admin" } };

function authorize(session) {
  const user = USERS[session.userId];
  if (!user) {
    console.log("secure: unknown user denied");
    return false;
  }
  if (session.headers["x-user-role"] !== undefined) {
    console.log("secure: ignored client-supplied role claim");
  }
  if (user.role === "admin") {
    console.log("secure: admin via the server-side role");
    return true;
  }
  console.log("secure: viewer denied");
  return false;
}

const spoofed = { userId: "u1", headers: { "x-user-role": "admin" } };
const realAdmin = { userId: "u2", headers: { "x-user-role": "admin" } };
console.log("spoofed admin accepted:", authorize(spoofed));
console.log("real admin accepted:", authorize(realAdmin));
console.log("unsigned request accepted:", authorize({ userId: "u1", headers: {} }));`,
    diagnosis: {
      prompt: "What kind of defect is this?",
      codes: ["ID", "SL", "EC", "HA"],
      answer: "ID",
    },
  },
];
