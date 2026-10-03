import type { Track } from "./types";

export const typescriptTrack: Track = {
  id: "typescript",
  title: "TypeScript for Real Projects",
  blurb:
    "The real compiler runs in your editor: write types, watch diagnostics with line and column, and ship code the compiler has already argued with.",
  numeral: "XIV",
  lessons: [
    {
      id: "annotations",
      title: "Annotations, Inference & Structural Typing",
      minutes: 12,
      lang: "ts",
      starter: `// The signature is the contract — the body is your job.
function clamp(n: number, lo: number, hi: number): number {
  // TODO: return n limited to the [lo, hi] range
  return n;
}

function average(nums: number[]): number {
  // TODO: sum divided by length — 0 for an empty list
  return 0;
}

function repeat(text: string, times: number): string {
  // TODO: text repeated \`times\` times (empty string when times <= 0)
  return text;
}

console.log("clamp:", clamp(12, 0, 10), clamp(-3, 0, 10), clamp(5, 0, 10));
console.log("average:", average([2, 4, 9]));
console.log("average empty:", average([]));
console.log("repeat:", JSON.stringify(repeat("ab", 3)));`,
      check: {
        expr:
          'output.includes("clamp: 10 0 5") && output.includes("average: 5") && output.includes("average empty: 0") && output.includes(\'repeat: "ababab"\')',
        hint: "The signatures already tell you every return type. Bound the number on both sides, guard the empty array before dividing, and let String.repeat do the joining.",
        hints: [
          { tier: 1, text: "All three TODOs are one-liners — read the contract (the signature) and work inward from what it promises." },
          { tier: 2, text: "clamp → Math.max then Math.min (or the reverse with the bounds swapped). average → reduce the array, but only after checking nums.length. repeat → String.prototype.repeat, remembering that a negative count throws." },
          { tier: 3, text: "clamp → `Math.min(hi, Math.max(lo, n))`. average → `nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0`. repeat → `times <= 0 ? \"\" : text.repeat(times)`." },
        ],
      },
      body: `TypeScript's first gift is **inference** — most of the time you write no types at all and still get checking, because the compiler reads the initializer:

\`\`\`
let count = 0;        // number — can be reassigned to any number
const limit = 10;     // the literal 10 — cannot become 11
count = 5;            // ✓
limit = 11;           // ✗ Type '11' is not assignable to type '10'
\`\`\`

**Annotations are for the places inference has nothing to read.** Function parameters have no initializer, so the compiler can't guess — under \`strict\` an unannotated parameter is an error, not a free \`any\`:

\`\`\`
function total(nums) { … }        // ✗ Parameter implicitly has an 'any' type
function total(nums: number[]) { … }  // ✓ a contract you can rely on
\`\`\`

**The rule of thumb:** annotate the *boundary* — function signatures, exported declarations, values you intentionally widen — and let inference work everywhere in between. Annotating every local variable is noise that makes refactors harder, not easier.

\`\`\`
const names = users.map((u) => u.name);   // string[] — inference got this right
function names(users: User[]): string[] { … }  // the boundary says it out loud
\`\`\`

**Structural typing: TypeScript checks shape, not pedigree.** There are no nominal class names to match — if the structure fits, it fits:

\`\`\`
type User = { id: number; name: string };

const ada = { id: 1, name: "Ada", email: "ada@x.dev" };  // extra field
const u: User = ada;         // ✓ structural match — extra fields are fine

const assign: User = { id: 1, name: "Ada", email: "x" }; // ✗ fresh literal:
// excess property check — you promised a User and added a field the
// compiler can see you'll never read through that reference.
\`\`\`

That second case is the one that surprises people: the *freshness* of the literal triggers the excess-property check. The same object through a variable is perfectly assignable.

| Write | The compiler infers |
| --- | --- |
| \`let n = 0\` | \`number\` (widens — reassignment allowed) |
| \`const n = 0\` | \`0\` (literal — locked) |
| \`const xs = [1, 2]\` | \`number[]\` |
| \`function f(a: number)\` | return inferred from the body |
| \`function f(a)\` | error under \`strict\` — annotate it |

**Why this matters beyond red squiggles.** A type is a proof obligation the compiler discharges *before* anyone runs the code. The three functions in the exercise are trivial — the point is that their contracts travel: every future caller gets checked against the same promise, and a refactor that breaks one shows up at compile time instead of in a bug report.`,
      quiz: [
        {
          q: "Inference means TypeScript can usually figure out…",
          options: [
            "Types from initializers and return expressions, so locals need no annotation",
            "Types only inside class bodies",
            "The intent of your code and refactor it for you",
            "Nothing without a tsconfig",
          ],
          answer: 0,
          explanation:
            "The initializer is the evidence: `let n = 0` is a number. Parameters have no evidence, so they must be annotated.",
        },
        {
          q: "`const limit = 10; limit = 11;` under strict mode…",
          options: [
            "Compiles — 11 is a number",
            "Errors — the const was inferred as the literal 10",
            "Errors only if noUnusedLocals is on",
            "Widens limit to number automatically",
          ],
          answer: 1,
          explanation:
            "`const` locks the literal type. That's exactly why `const` also stops accidental reassignment — value and type move together.",
        },
        {
          q: "Structural typing means two types are compatible when…",
          options: [
            "They share a class name",
            "They were declared in the same file",
            "One's structure satisfies the other's — names are irrelevant",
            "Both use the `interface` keyword",
          ],
          answer: 2,
          explanation:
            "Shape decides: an object with id and name satisfies `User` whatever it was called or where it came from.",
        },
        {
          q: "This errors: `const u: User = { id: 1, name: \"Ada\", email: \"x\" }`. Why?",
          options: [
            "Structural typing is broken",
            "Fresh object literals get an excess-property check against the target",
            "`email` is a reserved field",
            "User must be an interface, not a type alias",
          ],
          answer: 1,
          explanation:
            "Freshness: writing the literal inline shows the compiler you're promising a User while adding a field — that's caught. The same value through a variable is fine.",
        },
        {
          q: "Where should you nearly always annotate?",
          options: [
            "Every `const` on every line",
            "Function signatures — parameters and intentional return types at the boundary",
            "Only things you're unsure about",
            "Nowhere — inference is always enough",
          ],
          answer: 1,
          explanation:
            "Signatures are contracts other code compiles against; locals are implementation detail the compiler can read for itself.",
        },
      ],
    },
    {
      id: "narrowing",
      title: "Discriminated Unions & Narrowing",
      minutes: 13,
      lang: "ts",
      starter: `type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: string[] };

// TODO: describe every branch of the union:
//   idle    → "waiting"
//   loading → "loading..."
//   error   → "error: " + message
//   ready   → data.length + " items"
// Once you switch on state.status, TypeScript narrows the union —
// a missing branch should feel impossible, not plausible.
function describe(state: FetchState): string {
  return "?";
}

console.log(describe({ status: "idle" }));
console.log(describe({ status: "loading" }));
console.log(describe({ status: "error", message: "offline" }));
console.log(describe({ status: "ready", data: ["a", "b"] }));`,
      check: {
        expr:
          'output.includes("waiting") && output.includes("loading...") && output.includes("error: offline") && output.includes("2 items")',
        hint: "Switch on the discriminant (status). Inside each case the compiler has already narrowed `state`, so `message` and `data` exist only where they should.",
        hints: [
          { tier: 1, text: "Four members, four branches. The `status` literal in each member is the key that tells them apart." },
          { tier: 2, text: "`switch (state.status)` with a `case` per literal. In the `error` case, `state` is narrowed to `{ status: \"error\"; message: string }`, so `state.message` type-checks — and `state.data` would not." },
          { tier: 3, text: "`case \"ready\": return state.data.length + \" items\";` — omit a case and the compiler tells you the function no longer returns `string` on every path." },
        ],
      },
      body: `A **discriminated union** packs several shapes into one type, tagged by a literal field — usually \`status\` or \`type\`. You already met the idea in plain JavaScript (a \`kind\` field deciding an animal's sound); TypeScript makes the compiler *enforce* the pattern:

\`\`\`
type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: string[] };
\`\`\`

Read that as: **exactly one of these four, and the tag says which.** Compare it with the boolean-pile:

\`\`\`
// ✗ four impossible combinations you must defend against yourself
{ isLoading: boolean; isError: boolean; data: string[] | null }

// ✓ exactly one state, always
type FetchState = …
\`\`\`

**Narrowing is what makes unions usable.** After you test the discriminant, the compiler shrinks the type to the member you proved — fields become available *only* on the branch where they exist:

\`\`\`
function describe(state: FetchState): string {
  switch (state.status) {
    case "idle":    return "waiting";
    case "loading": return "loading...";
    case "error":   return "error: " + state.message;  // message exists here
    case "ready":   return state.data.length + " items"; // data exists here
  }
}
\`\`\`

Inside \`case "error"\`, writing \`state.data\` is a **compile error** — that member has no \`data\`. This is the whole trick: the impossible states don't render wrong at runtime, they never compile.

**The other narrowing doors** work on any value, not just unions:

| Test | Narrows to |
| --- | --- |
| \`typeof x === "string"\` | string |
| \`"key" in obj\` | obj has key |
| \`x instanceof RangeError\` | RangeError |
| literal check on a discriminant | that union member |

**Exhaustiveness: make omission impossible.** Return a \`string\` from every case and TS checks the end of the function is unreachable — add a fifth state to the union later, and the compiler walks straight to every \`switch\` that forgot it. For if-chains, the \`never\` trick does the same job:

\`\`\`
default: {
  const _exhaustive: never = state;
  return _exhaustive;
}
\`\`\`

That single line converts "I think I covered everything" into a proof — and it's why this pattern powers every reducer, every event bus, and every render-state cascade you'll meet in React, Redux, and effect runners alike.`,
      quiz: [
        {
          q: "The discriminant of a discriminated union is…",
          options: [
            "A boolean flag you set by hand",
            "A literal field (like `status`) whose value names the member",
            "The index of the member in the union",
            "A class instance check",
          ],
          answer: 1,
          explanation:
            "The literal is the tag: checking `status === \"error\"` identifies exactly which member you're holding.",
        },
        {
          q: "Inside `case \"error\"`, writing `state.data`…",
          options: [
            "Returns undefined at runtime",
            "Is a compile error — that member has no `data` field",
            "Works if data has a default",
            "Only errors with strictNullChecks",
          ],
          answer: 1,
          explanation:
            "Narrowing cuts the other way too: fields exclusive to other members are invisible on this one.",
        },
        {
          q: "Four booleans (isLoading, isError, isEmpty, isStale) can encode…",
          options: [
            "Exactly four states",
            "Sixteen states, most of them nonsense you must defend against",
            "Only states your UI handles",
            "Whatever the compiler picks",
          ],
          answer: 1,
          explanation:
            "2⁴ = 16 combinations, like loading AND error AND empty. A union makes each nonsense state unrepresentable instead of merely unlikely.",
        },
        {
          q: "An exhaustive switch matters because…",
          options: [
            "It runs faster than if-chains",
            "Adding a union member later turns every missed branch into a compile error",
            "It's required syntax in TypeScript",
            "switch is the only narrowing form",
          ],
          answer: 1,
          explanation:
            "Coverage becomes a compile-time proof — the compiler finds the branches you forgot, not a QA run three weeks later.",
        },
        {
          q: "`typeof x === \"number\"` inside an if-block narrows x to…",
          options: [
            "any",
            "number — and every use inside the block is checked as a number",
            "string | number",
            "unknown",
          ],
          answer: 1,
          explanation:
            "Type guards narrow: the true-branch sees `number`, the false-branch sees whatever remains.",
        },
      ],
    },
    {
      id: "generics",
      title: "Generics That Pay Rent",
      minutes: 13,
      lang: "ts",
      starter: `// TODO: make \`first\` work for ANY array — return the first element,
// or \`fallback\` when the array is empty. No \`any\` allowed.
function first<T>(items: T[], fallback: T): T {
  return fallback;
}

// TODO: count occurrences — group items by the string key each one maps to.
function countBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
  return {};
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
      check: {
        expr:
          'output.includes("first: ada") && output.includes("empty: none") && output.includes(\'"red":2,"blue":1\') && output.includes(\'"short":2,"long":1\')',
        hint: "The signatures already carry the type — `first` only needs an empty check before indexing; `countBy` starts with an empty record and bumps one key per item (`?? 0` on first sighting).",
        hints: [
          { tier: 1, text: "`<T>` is a type variable the caller picks for you: call `first` with strings and T is string. Both TODOs are ordinary logic — the generics are already written." },
          { tier: 2, text: "`first` → guard on `items.length`, otherwise return `items[0]`. `countBy` → loop items, `const k = key(item)`, and `out[k] = (out[k] ?? 0) + 1`." },
          { tier: 3, text: "`return items.length ? items[0] : fallback;` and, inside the loop, `const k = key(item); out[k] = (out[k] ?? 0) + 1;` — JSON.stringify prints keys in insertion order, so red lands before blue." },
        ],
      },
      body: `Generics are **type functions with parameters**. \`<T>\` says: *I don't know the type yet — the caller decides, and everything stays consistent once they do.*

\`\`\`
function first<T>(items: T[], fallback: T): T { … }

const a = first(["ada", "lin"], "none");  // T = string → a: string
const b = first([1, 2], 0);               // T = number → b: number
first(["ada"], 0);                        // ✗ fallback must also be a string
\`\`\`

That last line is the point. The generic doesn't just pass a type through — it *relates* the arguments. One \`T\` links \`items\`, \`fallback\`, and the return, so a mixed call is caught before it runs.

**Inference happens at the call site.** You rarely write \`first<string>(…)\`; the arguments are the evidence, exactly like \`let n = 0\`.

**Constraints: \`extends\` gives a generic a floor.**

\`\`\`
function pluck<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
pluck({ id: 1, name: "Ada" }, "name");  // string — key must actually exist
pluck({ id: 1 }, "nope");               // ✗ not keyof the object
\`\`\`

\`K extends keyof T\` means \"a key of T\" — the compiler now checks keys *and* threads the value type through \`T[K]\`. Constraint + indexed access is how typed helpers stop being \`any\`-shaped holes.

**The stdlib is already generic** — reach for these before writing your own:

\`\`\`
Record<string, number>     // object keyed by string, valued by number
Partial<T>                 // every field optional
Readonly<T>                // every field readonly
ReturnType<typeof fn>      // the function's return type, derived
Promise<string>            // one promise of one kind
\`\`\`

**When NOT to generic.** If there's only one concrete type in sight, a generic is ceremony: \`function upper(s: string)\` beats \`function upper<T extends string>(s: T)\`. Generics earn their keep at *seams* — utilities, containers, API layers — where the same logic must serve many types without becoming \`any\`.

\`\`\`
// ✗ any: the lie that compiles everything
function first(items: any[], fallback: any): any

// ✓ generic: freedom with the proof still intact
function first<T>(items: T[], fallback: T): T
\`\`\`

The exercise's \`countBy\` is the shape of every group-by you'll ever write — a callback that extracts a key, a record that accumulates counts — and it stays fully typed for strings, numbers, objects, whatever the caller brings.`,
      quiz: [
        {
          q: "In `function first<T>(items: T[], fallback: T): T`, the single `T` guarantees…",
          options: [
            "items and fallback always hold the same type, and so does the result",
            "T is always `any`",
            "The function is slower",
            "Only arrays can be passed",
          ],
          answer: 0,
          explanation:
            "One type parameter shared across parameters and return — mixing a string array with a number fallback is a compile error.",
        },
        {
          q: "`K extends keyof T` reads as…",
          options: [
            "K extends the class named T",
            "K must be one of T's keys — a constraint, not a union",
            "K and T are interchangeable",
            "T is optional",
          ],
          answer: 1,
          explanation:
            "`extends` is the constraint floor: K can be any type up to and including keyof T — practically, a valid key.",
        },
        {
          q: "Generics are usually inferred…",
          options: [
            "From the arguments at the call site",
            "Only when you write `<string>` explicitly",
            "From the function name",
            "From tsconfig",
          ],
          answer: 0,
          explanation:
            "Same evidence-based story as everything else: the arguments you pass decide T — explicit type args are the escape hatch.",
        },
        {
          q: "`ReturnType<typeof fetchUser>` gives you…",
          options: [
            "the string \"fetchUser\"",
            "the type fetchUser returns, derived instead of duplicated",
            "an error — typeof only works on classes",
            "Promise<any>",
          ],
          answer: 1,
          explanation:
            "Utility types derive instead of duplicate — change the function and every derived type follows.",
        },
        {
          q: "When is a generic the wrong tool?",
          options: [
            "When only one concrete type ever exists in the call — annotate that type instead",
            "Never — generics are always better",
            "When the function is async",
            "Inside object literals",
          ],
          answer: 0,
          explanation:
            "Generics pay at seams where many types share logic. One known type is a signature, not a type function.",
        },
      ],
    },
    {
      id: "interfaces-types",
      title: "Interfaces, Aliases & Object Shapes",
      minutes: 11,
      reading: true,
      body: `Two keywords draw the same outline. Knowing when each shines keeps declarations readable:

\`\`\`
interface User { id: number; name: string }   // declaration merging, real interfaces
type User = { id: number; name: string };     // unions, intersections, mapped types
\`\`\`

**They overlap for object shapes.** Either works for \`{ id, name }\`; style guides pick one and stay consistent (most pick \`type\` for aliases, \`interface\` for contracts others implement).

**Where \`interface\` wins — merging.** Two declarations of the same interface combine:

\`\`\`
interface Window { analyticsId: string }   // augments the DOM's Window
\`\`\`

You can't redeclare a \`type\` — and augmentation is genuinely useful when extending code you don't own (React props, library config).

**Where \`type\` wins — it draws shapes interfaces can't:**

\`\`\`
type Status = "idle" | "loading" | "ready";     // union of literals
type Pair = [string, number];                    // tuple
type Aged = User & { age: number };              // intersection
type Callback = (err: Error | null, v?: User) => void;
type Keys = keyof User;                          // mapped/derived types
\`\`\`

A union of string literals is *the* workhorse of modern frontend: it turns a free-form string into a set you can switch over and exhaustively check — the foundation of the discriminated unions in the previous lesson.

**Optional, undefined, and the third state.** With \`strict\`, \`?\` folds \`undefined\` in:

\`\`\`
type S = { nickname?: string };
const a: S = { nickname: undefined };  // ✓ both absent and undefined fit
s.nickname?.toUpperCase();             // optional chaining survives the check
\`\`\`

If a field should be *present but possibly unknown*, model that honestly (\`string | undefined\`) rather than overloading \`null\` as a second undefined.

**Modifiers worth knowing:** \`readonly\` freezes a property (and \`Readonly<T>\` derives one); index signatures (\`[key: string]: number\`) type dynamic keys; \`declare\` binds an ambient name to something the runtime already provides.

**\`satisfies\` checks without widening** — the 5.0-era upgrade over \`as\`:

\`\`\`
const palette = {
  bg: "#0b0b0c",
  fg: "#faf8f4",
} satisfies Record<string, string>;

palette.fg.toUpperCase();   // ✓ still knows fg is string
palette.bg = 42;            // ✗ caught — \`as\` would have silenced this
\`\`\`

\`as\` *asserts* (silencing the compiler); \`satisfies\` *asks* (and keeps the precise inferred type). Reach for \`as\` only when you genuinely know more than the compiler — never to quiet it.

**Rules of thumb**

1. \`type\` for unions, tuples, aliases, anything derived.
2. \`interface\` for object contracts others implement or augment.
3. Model optionality with \`?\`, absence with \`undefined\` — don't invent a second void.
4. \`satisfies\` to validate a literal; \`as\` only when the compiler truly can't know.`,
      quiz: [
        {
          q: "The key structural difference between interface and type for object shapes is…",
          options: [
            "Interfaces can't be generic",
            "Interfaces merge with prior declarations of the same name; types can't",
            "Types are checked more strictly",
            "Interfaces are faster to compile",
          ],
          answer: 1,
          explanation:
            "Declaration merging is the real differentiator — everything else about plain object shapes is equivalent.",
        },
        {
          q: "Which shape can ONLY a `type` alias express?",
          options: [
            "{ id: number }",
            "A union of string literals like \"idle\" | \"ready\"",
            "A method-bearing contract",
            "A generic map",
          ],
          answer: 1,
          explanation:
            "Interfaces can't be unions — literals, tuples, intersections and conditional types are type-alias territory.",
        },
        {
          q: "Under strict mode, `nickname?: string` means the field may be…",
          options: [
            "absent, or present as string, or explicitly undefined",
            "only absent",
            "null",
            "an error unless checked",
          ],
          answer: 0,
          explanation:
            "`?` folds `undefined` into the type — three surface states, two of them indistinguishable, all handled by `?.`.",
        },
        {
          q: "`palette satisfies Record<string, string>` vs `… as Record<string, string>` — satisfies is better here because…",
          options: [
            "It's shorter",
            "It validates the literal against the constraint while keeping the precise property types (`as` would erase them)",
            "It compiles faster",
            "as is deprecated",
          ],
          answer: 1,
          explanation:
            "`as` silences the compiler and widens; `satisfies` checks and preserves — fg stays `\"#faf8f4\"`-ish string, not just any string.",
        },
        {
          q: "A field that exists but might be unknown is best typed as…",
          options: [
            "null",
            "any",
            "`string | undefined` (or `?`) — the states you actually allow",
            "string, with a comment",
          ],
          answer: 2,
          explanation:
            "Type the real state space: present-with-value vs absent. `any` deletes the check; `null` smuggles a second void.",
        },
      ],
    },
    {
      id: "unknown-errors",
      title: "unknown, Type Guards & Safe Boundaries",
      minutes: 13,
      lang: "ts",
      starter: `type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

// TODO: implement safeParse:
//   1. JSON.parse inside try/catch — a throw returns { ok: false, error }
//   2. on success, run the validator; a false result is also { ok: false }
//   3. only a passing validator returns { ok: true, value }
// \`required\` is a type guard: once it returns true, value is proven to be T.
function safeParse<T>(text: string, required: (v: unknown) => v is T): Parsed<T> {
  return { ok: false, error: "not implemented" };
}

const isUser = (v: unknown): v is { id: number; name: string } => {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === "number" && typeof o.name === "string";
};

console.log("good:", JSON.stringify(safeParse('{"id":1,"name":"ada"}', isUser)));
console.log("broken:", JSON.stringify(safeParse("{oops", isUser)));
console.log("wrong shape:", JSON.stringify(safeParse('{"id":"1"}', isUser)));`,
      check: {
        expr:
          'output.includes(\'"ok":true\') && output.includes(\'"name":"ada"\') && output.includes(\'"error":\')',
        hint: "Three outcomes, three returns: parse threw → error; validator refused → error; validator passed → the value as T. try/catch gives you the first branch for free.",
        hints: [
          { tier: 1, text: "The union return type already names your cases: ok:true carries the value, ok:false carries the reason. Map each of the three situations to exactly one of them." },
          { tier: 2, text: "Inside `try`: `const value = JSON.parse(text);` then `if (!required(value)) return { ok: false, error: \"wrong shape\" };` and finally `return { ok: true, value };`. The `catch` returns `{ ok: false, error: … }` built from the thrown value." },
          { tier: 3, text: "`catch (err)` — err is `unknown` under strict, so narrow it: `err instanceof Error ? err.message : String(err)`." },
        ],
      },
      body: `**\`any\` is a hole in the type system; \`unknown\` is a locked door.** Both refuse to be checked — but \`unknown\` refuses to be *used* until you've proven what it is:

\`\`\`
const data: any = JSON.parse(raw);
data.buried.deeply;          // compiles — and explodes at runtime

const data: unknown = JSON.parse(raw);
data.buried;                 // ✗ 'data' is of type 'unknown'
\`\`\`

**JSON.parse returns \`any\`** — the single largest source of untyped data in real apps. The fix is a boundary: parse into \`unknown\`, *prove* the shape, then let the inside of the program deal in real types.

**Type guards are the proof.** \`value is T\` is a promise the compiler takes at face value — which is why guards are written as small functions you can read and test:

\`\`\`
const isUser = (v: unknown): v is { id: number; name: string } => {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === "number" && typeof o.name === "string";
};

const value: unknown = JSON.parse(raw);
if (isUser(value)) {
  value.name.toUpperCase();   // ✓ narrowed to the user shape
}
\`\`\`

Inside the \`if\`, \`value\` is the proven type; outside, it's still \`unknown\`. That's narrowing again — the same door as \`typeof\`/\`in\`/\`instanceof\`, just expressed by your own predicate.

**Results instead of throws.** The \`Parsed<T>\` union in the exercise is the *result pattern* — errors as data:

\`\`\`
type Result<T> = { ok: true; value: T } | { ok: false; error: string };
// every caller must handle both branches — the compiler won't let you
// unwrap \`value\` without first excluding the failure case.
\`\`\`

Libraries from \`fp-ts\` to Rust-exports to every SDK's \`safeParse\` use this shape, because a thrown exception is invisible in a type signature while a union is the signature.

**Exceptions changed shape under strict, too.** \`catch (err)\` binds \`unknown\` (it always was, at runtime — now the compiler admits it):

\`\`\`
try { … } catch (err) {
  if (err instanceof Error) throw new Error("parse failed: " + err.message);
  throw new Error("parse failed: " + String(err));   // never lose the cause
}
\`\`\`

**The discipline, in one line:** *keep \`unknown\` at the boundary, prove it once, and deal in real types inside.* Every network response, every config file, every \`localStorage\` read is a boundary — the exercise is that boundary, written three ways.`,
      quiz: [
        {
          q: "The core difference between `any` and `unknown`…",
          options: [
            "any is slower",
            "unknown can't be used until narrowed — any skips all checking",
            "unknown only exists in strict mode",
            "They're synonyms with different names",
          ],
          answer: 1,
          explanation:
            "Both disable checking of the value itself, but unknown blocks property access and calls until a guard proves the shape — any waves it through.",
        },
        {
          q: "JSON.parse returns…",
          options: [
            "unknown",
            "the type you annotate it with",
            "any — which is why it needs a boundary treatment",
            "Record<string, unknown>",
          ],
          answer: 2,
          explanation:
            "The parser can't know your schema, so it punts with any. Capture it as unknown and validate before trusting it.",
        },
        {
          q: "A type guard `v is User` means…",
          options: [
            "v is definitely a User forever",
            "the compiler may treat v as User inside branches where the guard returned true",
            "v implements an interface named User",
            "A cast with extra steps",
          ],
          answer: 1,
          explanation:
            "Narrowing is branch-scoped: outside the if, v remains unknown. The guard's truth is asserted, which is why guards stay small and tested.",
        },
        {
          q: "Under strict mode, what does `catch (err)` bind?",
          options: [
            "any",
            "Error",
            "unknown — you must narrow before using it",
            "string",
          ],
          answer: 2,
          explanation:
            "Anything can be thrown, so the honest type is unknown: instanceof-check it or String() it before it touches a message.",
        },
        {
          q: "The Result pattern ({ ok: true, value } | { ok: false, error }) wins because…",
          options: [
            "It's faster than throwing",
            "Failures become part of the type — callers must handle them and can't unwrap blind",
            "It works only in Rust",
            "Exceptions are banned in TypeScript",
          ],
          answer: 1,
          explanation:
            "A throw is invisible in a signature; a union forces every caller to confront both branches at compile time.",
        },
      ],
    },
    {
      id: "capstone-type-layer",
      title: "Capstone: A Type-Safe Data Layer",
      minutes: 20,
      lang: "ts",
      starter: `type Todo = { id: number; text: string; done: boolean };
type Filter = "all" | "active" | "done";
type State = { todos: Todo[]; filter: Filter };

type Action =
  | { type: "add"; text: string }
  | { type: "toggle"; id: number }
  | { type: "setFilter"; filter: Filter };

function reducer(state: State, action: Action): State {
  // TODO: three immutable transitions, discriminated by action.type:
  //   add      → append { id: state.todos.length + 1, text, done: false }
  //   toggle   → new array, done flipped on the matching id
  //   setFilter → new state with the new filter
  return state;
}

function visible(state: State): Todo[] {
  // TODO: honour state.filter — "all" returns everything,
  // "active" the undone ones, "done" the finished ones.
  return [];
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
      check: {
        expr:
          'output.includes("count: 2") && output.includes("first done: true") && output.includes("active: ship") && output.includes("done filter: write types") && output.includes("immutable: true") && output.includes("toggle landed: true")',
        hint: "Every transition returns a NEW object — spread state, replace one field. The `action.type` literal is your switch key, and inside each case the compiler narrows `action` to that member.",
        hints: [
          { tier: 1, text: "State is data, events are a union: the reducer's whole job is picking the right member of Action and rebuilding State around it — nothing mutates in place." },
          { tier: 2, text: "add → `todos: [...state.todos, { id: state.todos.length + 1, text: action.text, done: false }]`. toggle → `todos: state.todos.map((t) => t.id === action.id ? { ...t, done: !t.done } : t)`. setFilter → only `filter` changes. `visible` filters the same todos by the three filter literals." },
          { tier: 3, text: "visible can be one line: `state.filter === \"all\" ? state.todos : state.todos.filter((t) => state.filter === \"done\" ? t.done : !t.done)` — narrowing on `state.filter` before reading it isn't even needed here, but the ternary keys off exactly the same union." },
        ],
      },
      body: `Everything in this track converges here: **the data layer every React app eventually writes**, typed end to end. Three ideas carry the whole thing.

**1. State is one value, not a pile of flags.** \`State\` in the exercise is a single object whose \`filter\` is a literal union — \`"all" | "active" | "done"\` — so a filter you never defined can't exist. Combine that with the action union and you've made the illegal states unrepresentable *in both directions*: what the view shows, and what can happen next.

**2. Events are data.** An \`Action\` isn't a callback — it's a value describing *what happened*:

\`\`\`
type Action =
  | { type: "add"; text: string }
  | { type: "toggle"; id: number }
  | { type: "setFilter"; filter: Filter };
\`\`\`

Because actions are plain data they can be logged, replayed, time-travelled, tested with a literal array — and each member carries its own payload fields, narrowed for you inside \`case action.type\`. This is the shape of \`useReducer\`, Redux, Zustand's devtools, and every event-sourced backend: **events in, new state out, no mutation anywhere.**

**3. Purity is what makes it testable.** \`reducer(state, action)\` reads nothing and writes nothing — same inputs, same output. The harness in the exercise *is* the test suite:

\`\`\`
expect(reducer(s, { type: "toggle", id: 2 })).not.toBe(s);   // new reference
expect(s.todos[1].done).toBe(false);                          // old untouched
\`\`\`

The \`immutable: true\` line in the exercise is exactly that assertion: serialise before, run the transition, prove nothing behind you changed. In React, that identity change is what lets memoized components trust \`===\`; break it once and every optimisation downstream silently stops working.

**Where this goes next**

- \`useReducer\` drops this exact function into a component — the union becomes the event vocabulary of your UI.
- Persist the *actions*, not the state: a log of events rebuilds any snapshot (that's debugging with replay).
- Add a fifth action member and watch the compiler walk you to every unfinished \`case\` — exhaustiveness pays rent at exactly this moment.
- On the server the same pattern scales: each event is a row, the state is a fold over them, and the type system keeps the fold total.

You've written about forty lines. You've also written the skeleton of every serious state layer you'll meet for the rest of your career — now with a compiler that refuses to let the states and events drift apart.`,
      quiz: [
        {
          q: "Why model actions as a discriminated union instead of `(state) => void` callbacks?",
          options: [
            "Callbacks are slower",
            "Plain-data events can be logged, replayed and exhaustively checked; each member carries its own payload",
            "Functions can't be typed",
            "Unions are required by React",
          ],
          answer: 1,
          explanation:
            "Data describes what happened without doing it — that separability is what enables replay, time travel, and compile-time coverage of every event.",
        },
        {
          q: "The reducer must return a NEW state because…",
          options: [
            "Mutation throws in strict mode",
            "New object identity is what React's memoisation compares — mutate once and every `===` optimisation downstream lies",
            "Spreads are faster than push",
            "State may be frozen at runtime",
          ],
          answer: 1,
          explanation:
            "Identity is the signal. Immutable transitions keep renders predictable (and make the `immutable:` assertion in the exercise meaningful).",
        },
        {
          q: "`filter: \"all\" | \"active\" | \"done\"` beats `filter: string` because…",
          options: [
            "Shorter to type",
            "A typo'd filter becomes a compile error instead of an empty screen",
            "Strings can't be compared",
            "It serialises better",
          ],
          answer: 1,
          explanation:
            "Literal unions are closed sets: `filter: \"donr\"` never compiles, and every switch on it gets exhaustiveness checking for free.",
        },
        {
          q: "Inside `case \"toggle\"`, `action.id` type-checks because…",
          options: [
            "All members happen to have id",
            "The discriminant narrows `action` to the toggle member, whose payload is visible there",
            "id is declared on the union itself",
            "strict mode allows unknown fields",
          ],
          answer: 1,
          explanation:
            "Same narrowing as FetchState: proving `type === \"toggle\"` exposes exactly that member's fields — and hides the others.",
        },
        {
          q: "Testing this reducer is easy because…",
          options: [
            "It renders nothing",
            "It's pure — literal state in, literal state out, no DOM, network or clock involved",
            "React Testing Library handles it",
            "Reducers are automatically tested",
          ],
          answer: 1,
          explanation:
            "Purity means the entire flow is an array of events folded into an expectation — the harness in the exercise already does it.",
        },
      ],
    },
  ],
};
