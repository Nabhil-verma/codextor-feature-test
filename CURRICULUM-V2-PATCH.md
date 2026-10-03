# Curriculum V2.1 — The Execution & Operating Patch

A patch to **[CURRICULUM-V2.md](./CURRICULUM-V2.md)**, not a rewrite. V2's
organizing idea — train judgment over AI output — stands. This pass fixes what
V2 still got wrong:

1. **Python never runs.** A nonexecuting Python track is the biggest remaining
   credibility hole in a curriculum that claims behavioural grading.
2. **Every exercise is still one isolated snippet.** Real agent output is a
   diff across several files, and the wrong line is harder to find inside that
   surface area.
3. **Agent fluency is treated as prompting skill.** Writing and maintaining
   project instruction files, forcing plan-before-code, and choosing permission
   levels is the line between "knows how to prompt" and "knows how to operate
   the tool".

**Scope of this document.** Like V2, this is a design deliverable: for each fix,
which V2 track/lesson it patches, a lesson outline with at least one concrete
gradable exercise, the grader it needs, and whether it ships in the pilot or
waits. §0 records what was *verified against the repository* before any of it
was designed.

**Counts:** V2's 20 tracks / 111 lessons → **20 tracks / 119 lessons** for this
patch (all eight fixes except Fix 7), or **21 tracks / 122 lessons** if the
conditional Next.js track (Fix 7) is validated in. No V2 lesson is deleted.

---

## 0. Preconditions — what was verified in the repo, not assumed

| Claim | Where it was checked | Result |
| --- | --- | --- |
| Heavy runtimes already lazy-load behind a dynamic `import()` in the Run handler | `src/components/Playground.tsx` — `await (await import("../lib/tsRunner")).runTs(code)`, with the type-only import commented "so the TS compiler chunk stays lazy" | Confirmed. Pyodide and a diff/click grader can follow the same pattern; **no architecture rewrite is needed** for Fix 1 |
| DebugLab's existing contract | `src/components/DebugLab.tsx` — `{ challenge, onPass }`; pass = `!r.error && evaluateCheck(challenge.fixCheck, logs)` | Confirmed. Diff grading is a **sibling component**, not a DebugLab rewrite |
| Partial credit is storable but not recorded | `src/lib/progress.ts` — scores are 0..1 best-per-key, `recordLesson(key, score, date)` already accepts fractions; `src/pages/Lesson.tsx` — `handleScore` records only `score >= 1` | Confirmed. This is exactly V2 §1.4 #1's gap; every new partial-credit grader depends on fixing it once |
| Lesson elements are declared once and rendered once | `src/data/types.ts` (`Lesson`), `src/pages/Lesson.tsx` (`STEPS` array + one section per element) | Confirmed. Adding `diff` / `python` is a type + step + component, same as `debug` and `preview` |
| Milestone claims need no backend migration for new artifact fields | `src/convex/schema.ts` — `claims: v.optional(v.any())` | Confirmed. Fix 8 can extend the claim payload client-side with no schema change |
| The milestone merge rule exists and is pinned by tests | `src/lib/milestones.ts` (`mergeClaims`, "more deliverables wins, ties earlier date"), `tests/milestone-claims.test.ts` | Confirmed. Fix 8's artifacts must not break this rule |
| The bug taxonomy and DebugLab diagnosis are V2 amendments, not shipped code | `CURRICULUM-V2.md` §1.4, §2 | Confirmed. Fix 2's expanded taxonomy is an amendment to an amendment, applied before implementation |

**Cost estimate that shapes sequencing:** Fix 1 (Pyodide) and Fix 2 (diff
grader) are independent build tracks; Fixes 3–6 are content on top of them;
Fix 8 touches the claim log and waits; Fix 7 is conditional. The pilot is
therefore *not* "everything at once" — see §10.

### 0.1 Fix → V2 patch map

| Fix | Patches | New artifacts | Grader | Wave |
| --- | --- | --- | --- | --- |
| 1. Python executes | V2 §8.3 (`python-llm-api`), §8.5 python row, §10.4 limit | `pythonRunner.ts`; starter/check on 3 of the 4 Python lessons (pandas stays a reading) | **Pyodide runner** (new; same check grammar) | 1 |
| 2. Multi-file diffs | V2 §6 (`19.2` Ex. B), §8.1 (`debug-the-bug`), §3 (`16.7` Ex. B); extends §2 taxonomy | `DiffExercise` type, `DiffLab` + `MultiFile` viewer, `diff-challenges.ts` | **Diff/click grader** (new; deterministic, no execution) | 0 pilot |
| 3. Codebase archaeology | New lesson **16.2** in Track XVI | repo snapshots, `TraceQuestion` spec | Diff/click grader's **locate mode** | 0 pilot |
| 4. Operating agents | New lessons **16.4–16.6** in Track XVI (distinct cluster) | instruction-file rubric, plan cards, permission cards | Quiz + rubric (V2 build) | 0 pilot |
| 5. Production debugging | New lessons **11.5–11.7** in `testing` track (V2 §8.1's track) | log/trace fixtures | Diff/click (locate) + sort + quiz | 2 |
| 6. What not to paste | New lesson in `security` (after V2 §8.2's additions) | scenario cards | Quiz (per-card) + rubric | 2 |
| 7. Next.js / server components | New conditional track `nextjs` (ⅩⅪ), downstream of React | 3 lessons, one diff review | Diff grader + quiz | 4 — **only if re-validated** |
| 8. Projects track loop | Shipped milestone layer (`milestones.ts`, Projects page, claim log) — untouched by V2 | artifact schema, `ProofRunner` | Rubric + **ProofRunner** (new) | 3 |

---

## 1. Fix 1 — Make Python execute (Pyodide)

**Patches:** V2 §8.3 (the `matplotlib-ml` → `python-llm-api` replacement), the
Python row of V2 §8.5 (`python-syntax`, currently predict/quiz), and V2 §10.4's
honest limit *"Python still does not execute"* — which this fix deletes.

### 1.1 Loading architecture (verified — no rewrite)

The repo already has the pattern V2 §5.0 described for sql.js: a heavy runtime
behind a dynamic `import()` that only the relevant exercise reaches
(`Playground.tsx` → `tsRunner`). Pyodide follows it with one refinement:

- **Load trigger:** the Python runner chunk starts loading when a `lang:
  "python"` exercise section mounts, not on first `Run`. Pyodide's first load is
  ~10–14 MB (WASM + stdlib); the TS compiler's chunk is small enough that
  run-time loading is invisible, Pyodide's is not.
- **Self-hosted from `public/pyodide/`** — no CDN, same rule V2 set for sql.js.
  The app already ships a service worker (`public/sw.js`), so the assets cache
  after first use.
- **Worker execution:** run inside a Web Worker, because the JS runner's
  in-thread loop guard cannot instrument Python. Timeout = `worker.terminate()`
  → deterministic `"Script took too long — possible infinite loop!"`, matching
  the JS runner's failure mode. stdout is captured via `setStdout` and batched
  to the main thread.
- **Fresh namespace per run** (`pyodide.runPython` against a new dict) so runs
  are deterministic and one exercise cannot see another's globals. Same
  `evaluateCheck` grammar over the captured output — Python gets parity with
  JS/TS grading: run cleanly **and** satisfy the output check. No compiler
  stage (Python has no typed pass gate); no wall-clock assertions.
- **Packages:** stdlib only for graded exercises. numpy/pandas are out of scope
  (bundle size); the pandas lesson stays honest as a reading, and the executed
  lessons say so.

Type changes are the same shape as V2 §5.0's SQL proposal: `Lesson.lang`
becomes `"ts" | "python"` (or a `py?: true` flag), `Playground` gets a python
branch, and `pythonRunner.ts` exports `runPython(code) → { logs, error }`.

### 1.2 Lesson changes

| Lesson | Before (V2) | After (V2.1) |
| --- | --- | --- |
| `python-syntax` | reading + predict + quiz | reading + **executed exercise**: fix the AI's mutating-default function and print labelled outputs |
| `python-oop` | reading + sort + quiz | reading + sort + **executed exercise**: write the `except`-specific handler and print which branch ran |
| `pandas-numpy` | reading + quiz | unchanged (reading, honest) |
| `python-llm-api` | predict-the-bug only (§8.3) | **executed**: the retry/timeout lesson is now graded by running it |

### 1.3 Exercise spec (the V2 lesson, now executed)

`python-llm-api` — *Calling LLM APIs from Python*, graded for real:

```ts
{
  id: "python-llm-api",
  lang: "python",
  // The exercise ships a fixture module `client.py` whose call_model raises
  // RateLimitError twice, then succeeds — deterministic per run, no network.
  starter: `from client import call_model, RateLimitError

def ask(prompt):
    # TODO: this currently crashes on the first 429.
    return call_model(prompt)["text"][0]["content"]

print("answer:", ask("summarise: refund policy"))
print("retries:", 0)`,
  check: {
    expr: "output.includes('answer:') && output.includes('retries: 2') && output.includes('handled: RateLimitError')",
    hint: "Retry only the retryable error, with a bounded attempt count, and print what you handled.",
  }
}
```

Required output after the fix: the answer text, `retries: 2`, and a line naming
the handled exception. The fixture always 429s exactly twice; the learner must
retry that error and **not** swallow a 400 (a second fixture call prints
`400 -> raised, not retried`; the check asserts it appears). This converts V2's
"predict-the-bug" reading into the ownership exercise it was meant to be.

### 1.4 Grader & sequencing

- **Grader:** new **Pyodide runner** (`src/lib/pythonRunner.ts` + worker);
  reuses the existing check grammar and `DebugLab`-style verdict display.
- **Sequencing:** **waits** — Wave 1, immediately after the pilot. It is
  independent of the diff work, so it can run in parallel with pilot content,
  but it is not one of the two validated-pilot deliverables. First post-pilot
  item because it closes the largest stated gap.

---

## 2. Fix 2 — Multi-file diffs, not single snippets

**Patches:** V2 §6 `19.2 Reviewing Someone Else's Diff` (Exercise B becomes the
first real multi-file review), V2 §8.1 `debug-the-bug` (one station becomes a
diff review), V2 §3 Track XVI `16.7` Exercise B (verification becomes a PR
review), and **extends V2 §2's taxonomy** with four review-specific codes.

### 2.1 The format

A new lesson element, usable by the tracks above and every future review
exercise — same integration points as `debug`/`preview` (type + `STEPS` entry +
section):

```ts
type DiffExercise = {
  id: string;
  title: string;
  brief: string;              // the agent's PR description — plausibly wrong
  files: DiffFile[];          // 3–6 files, realistic size (20–120 lines each)
  planted: {                  // exactly ONE blocking defect
    file: string;
    line: number;             // line in the "after" side of that file
    category: TaxonomyCode;   // V2's six, plus the review additions below
    why: string;              // reference reasoning, revealed after the attempt
  };
  distractors: string[];      // correct-looking changes that are NOT blockers
  hints: Hint[];
};
```

The learner reads the diff and clicks the line they would **block on**, then
picks the category. The reason *is* the category selection — deterministic, no
LLM in the loop, no free text to fudge.

### 2.2 Expanded taxonomy (extends V2 §2)

V2's six categories (RC, EC, HA, ID, SL, CX) remain the blocker set for
executed code. Review adds four that only exist in a diff surface:

| Code | Category | Why it's review-specific |
| --- | --- | --- |
| SC | Scope creep / unrelated change | Agent diffs quietly rename, reformat, or touch files the task never mentioned — a blocker in review even when the code is correct |
| TG | Missing or incorrect test | The change ships without a test, or the "test" asserts nothing |
| NM | Misleading name/comment drift | The identifier or comment now says something false about behaviour |
| DL | Leftover debug/dead code | `console.log`, commented-out code, feature-flag remains that must not merge |

Exactly one blocker per exercise, from the extended set; distractors must be
*correct* changes (a clean rename, a dependency bump, a legitimate test) so
file-level heuristics can't win — at least one distractor sits in the same file
as the blocker.

### 2.3 Grading — partial credit, as specified

| Learner selects | Score |
| --- | --- |
| Wrong file | 0.0 |
| Correct file, wrong/absent line | 0.4 |
| Correct file + correct line | 0.7 |
| Correct file + line + correct category | **1.0** |

The lesson stays **incomplete until 1.0** (same rule as V2 §1.4 #1); 0.4/0.7
attempts are recorded and visible. This rides on the same one-line fix to
`Lesson.handleScore` that V2 already requires — both graders call `onScore`.

### 2.4 Seeded exercise — V2 §6 `19.2`, Exercise B

*Input:* PR titled *"add retry with backoff to uploads — tested locally"*.
Five files: `src/lib/retry.ts`, `src/lib/upload.ts`, `src/hooks/useUpload.ts`,
`src/lib/retry.test.ts`, `package.json`.

*Blocker:* `src/lib/retry.ts`, line 31 —
`if (res.status >= 400) return retry(nextAttempt);` — retries the 400 (a
validation error) the same as a 503. Category **SL** (silently wrong logic:
looks like resilience, turns a bad request into five bad requests). The
learner must click that line and choose SL.
*Distractors:* a repository-wide rename in `upload.ts` (SC-*looking*, actually
returns correct behaviour — teaches "scope is not a bug"), a `console.log` in
`useUpload.ts` that is intentionally part of the diff and non-blocking (DL is a
nit **here**; the authoring rule is that DL only blocks when it leaks data or
bypasses a guard), and `package.json` adding the retry dependency (fine).
*After the attempt:* the reference `why` is revealed, plus the taxonomy
explanation — "retrying something that will never succeed is an availability
bug wearing a resilience costume".

**Propagation:**
- `testing/debug-the-bug` (V2 §8.1): station 3 becomes a multi-file diff
  review — same planted RC defect, now embedded in a 4-file diff (the
  single-file two-bug station still teaches repair; this station teaches
  location).
- Track XVI `16.7 Verifying Agent Output with Tests`, Exercise B: replace the
  "pick which test fails" quiz with *"review the agent's 5-file PR — what do
  you block on?"* (the true verification format).

### 2.5 Grader & sequencing

- **Grader:** new **diff/click grader** (`DiffLab.tsx` + `MultiFile.tsx`
  viewer + `src/data/diff-challenges.ts`), deterministic, no execution. Tests:
  planted file/line exists and falls inside the after-file; category ∈ extended
  taxonomy; every diff has 1 blocker + ≥2 distractors; the same file contains a
  distractor. Part of the **DebugLab diagnosis change** the pilot exists to
  validate.
- **Sequencing:** **pilot** for the grader and for Track XVI's use of it;
  the Workflow `19.2` seed is the first content authored against it (Wave 1's
  opening item), then Testing, then any further Agents expansion.

**One deliberate reconciliation, stated plainly:** the seed order
(Workflow → Testing → Agents) applies to *propagated* content. The pilot still
ships one diff exercise inside Track XVI (`16.7`), because a grader cannot be
validated by content that ships after the track it was built for — Track XVI is
the pilot track, so it exercises the format first and everything else follows
the seed order.

---

## 3. Fix 3 — Reading an unfamiliar codebase

**Patches:** **new lesson 16.2** in Track XVI (*"Working with Coding Agents"*),
which also becomes a prerequisite flavor for Fix 8's milestones. Standalone
alternative considered and rejected: an "early module" before the agents track
would duplicate the multi-file viewer Fix 2 builds, for no pedagogical gain.

> Why this belongs in the agents track: an agent will happily produce a
> confident, wrong map of a repo. Someone has to verify that map. That is the
> skill juniors are actually paid for in month one — and it is the same
> "locate the thing in a multi-file surface" muscle as Fix 2.

### 3.1 Lesson 16.2 — Codebase Archaeology: Finding Where Things Live

*Objective: trace a request end-to-end, locate undocumented behaviour, and ask
scoping questions before changing anything.*

Reading covers:
- **Entry → handler → data → response.** Read one request through a repo the
  learner has never seen, naming each hop and the file it lives in.
- **Finding behaviour without being told.** Grep is the second step; the first
  is *form a hypothesis about naming and boundaries* (routes live in `routes/`,
  the money math is near the model, etc.).
- **Scoping questions — to the repo or to an agent.** *What else calls this
  function? What breaks if I rename this? Which of these two modules owns the
  invariant?* The lesson teaches that these are answerable, not rhetorical, and
  that an agent's answer to them is a draft to verify.

### 3.2 Exercise spec — locate and cite

One repo snapshot (`shop-api`, 6 files:
`server.ts`, `src/routes/orders.ts`, `src/services/orders.ts`, `src/db/orders.ts`,
`src/lib/money.ts`, `workers/email.ts`), one shared `MultiFile` viewer, three
gradable questions:

1. **Locate the hop** — *"A successful request marks an order paid. Where does
   that happen?"* Targets: `src/services/orders.ts → markOrderPaid()`.
   Scoring: correct file = 0.4, file + function = 1.0 (locate-mode ladder,
   category omitted).
2. **Multi-select callers** — *"What calls `formatPrice`?"* Answers:
   `routes/orders.ts → listOrders()`, `workers/email.ts → sendReceipt()`.
   Exact-set scoring; partial per item.
3. **Rename blast-radius** — *"`Order.total` is renamed `amountCents`. Which
   files must change?"* Multi-select over the file set; misses and false
   positives cancel per item, lesson score = items correct.

**Grader:** the Fix 2 **diff/click grader in locate mode** (selection against
author-declared targets; no execution). Same component, different answer key —
this is why Fix 2's grader is a deliverable the rest of the plan depends on.

**Sequencing:** **pilot** (Track XVI end-to-end).

---

## 4. Fix 4 — Configuring agents, not just prompting them

**Patches:** **new lessons 16.4–16.6** in Track XVI — a distinct cluster, not a
footnote on V2's 16.1 specs lesson. The track renumbers as follows:

| V2 | V2.1 | Note |
| --- | --- | --- |
| 16.1 Specs and Prompts | 16.1 | unchanged |
| — | **16.2 Codebase Archaeology** | Fix 3 |
| 16.2 Managing Context | 16.3 | shifted |
| — | **16.4 Project Instruction Files** | Fix 4 |
| — | **16.5 Plan Before Code** | Fix 4 |
| — | **16.6 Permissions & Sandbox Settings** | Fix 4 |
| 16.3 Verifying Agent Output | 16.7 | shifted; Exercise B upgraded by Fix 2 |
| 16.4 Knowing When Not to Use an Agent | 16.8 | shifted |
| 16.5 Capstone | 16.9 | shifted |

Content stays **tool-agnostic**: the lessons teach the *artifact* ("a project
instruction file — names vary by tool"), never a product's UI. Named tools
appear only in a dated "current examples" sidebar subject to the review
cadence (§9.1).

### 4.1 Lesson 16.4 — Project Instruction Files

*Objective: write and maintain a rules file so an agent inherits project
conventions instead of re-learning them every session.*

- What belongs: setup/build/test commands, directory ownership, style rules
  with a reason, hard boundaries ("never touch migrations without a human"),
  review requirements.
- What doesn't: one-off task details, aspirational rules nobody enforces,
  anything that contradicts the actual scripts.
- Maintenance: the file is code — it's updated in the same PR that changes the
  convention it describes.

**Exercise (rubric + auto-checkable subset).** Input: a repo fact sheet (pnpm
+ vitest, `src/components` folder convention, "PR titles are `type: summary`",
secrets in `.env` never committed, one known gotcha in the renderer). Expected:
a ≤40-line instruction file. Auto-checked with the existing check grammar over
the text (`includes("pnpm test")`, `includes("vitest")`, `includes(".env")`);
judgment criteria (are the boundaries stated as rules, not suggestions?) are
rubric-weighted against an exemplar. **Also:** a per-line sort — ten candidate
lines → *belongs in the file* / *belongs in the session prompt* / *belongs
nowhere*; exact match per item.

### 4.2 Lesson 16.5 — Plan Before Code

*Objective: require a plan, get it approved, and treat the plan as the place
misunderstandings are cheapest to catch.*

- The approval loop: task → agent plan → the human reads the plan for **missing
  steps, wrong files, and out-of-scope intent** → approve or correct.
- Why it's cheap: rejecting a plan costs a message; rejecting a diff costs a
  rewrite, a review cycle, and a broken build.
- What plans lie about: "run the tests" without naming them, silent migrations,
  "refactor while I'm here".

**Exercise (graded, exact-match per item).** Input: feature request *"let users
soft-delete a project"* + the agent's 6-step plan (index on `deletedAt`,
update queries to filter, migration, UI affordance, tests — but **no step reads
existing query call sites**, and one step quietly drops the related
`project_members` rows). Expected: multi-select the two steps that must be
fixed before approval + pick the category each (EC, SC); plus one card: *"the
plan says 'add tests' — approve or revise, and why"*. Lesson score = items
correct.

### 4.3 Lesson 16.6 — Permissions & Sandbox Settings

*Objective: choose what an agent may do unattended — read, write, execute,
network — for the task at hand.*

- The four capability levels and their blast radii; least privilege as the
  default, expansion as a deliberate session decision.
- Read-only for investigation/review; write for a bounded feature branch;
  execute for test runs; network only when a task genuinely needs it.
- What always requires a human: deploys, destructive commands, credential
  operations, anything touching production data.

**Exercise (classify + select, exact match per card).** Input: 8 task cards
(*"explain how billing rounds"*, *"upgrade the router to v7"*, *"run the
migration suite against staging"*, *"rename an internal utility"*, …).
Expected per card: the minimal permission profile + the one capability, if any,
that must stay off + whether unattended approval is acceptable. Score = % of
cards fully correct (quizzes already support partial credit). **Grader:** quiz
(exists).

**Sequencing:** **pilot** — these three are part of Track XVI end-to-end, and
they need no new engine: rubrics (§6.0 of V2) and quizzes. Their grading only
depends on the V2 rubric grader, which the pilot therefore includes (§10).

---

## 5. Fix 5 — Logs, traces, and production debugging

**Patches:** the `testing` track (V2 §8.1's track, "Testing & Debugging").
V2 changes `debug-the-bug` but leaves the track covering only bugs in code the
learner is actively running. This appends a three-lesson module — track grows
**4 → 7**, new ids `prod-traces`, `prod-logs`, `incident-timeline`. The track
blurb gains "watch after DevOps" because the vocabulary (`log levels`,
`containers`, `request ids`) is taught in that track.

### 5.1 Lesson 11.5 — Production Stack Traces

*Objective: read a stack trace from a shipped build — not a local one.*

Reading covers: minified vs. symbolicated frames; source maps as a first
question, not an afterthought; "blame the last deploy" as a hypothesis, not a
conclusion; and the difference between *where it threw* and *where the bad
value was made*.

**Exercise (locate + diagnose).** Input: symptom report *"checkout returns 500
intermittently since the 14:20 deploy"*, a production stack trace
(`TypeError: Cannot read properties of undefined (reading 'total')` at
`orderSummary (chunk-7f2a.js → src/checkout/summary.ts:88)`), and the
6-file diff of the 14:20 deploy. Expected: click the **first file/function to
check** (`src/checkout/summary.ts → orderSummary()`) and pick the root cause
(*"the API now returns `{ order: null }` for empty carts; the summary assumes
an object"*). Scoring: file = 0.4, file+function = 0.7, + correct root cause =
1.0.

### 5.2 Lesson 11.6 — Structured Logs: Reconstructing What Happened

*Objective: turn a wall of JSON lines into a factual account.*

Reading covers: request/correlation ids, levels as severity not opinion, field
naming contracts, and the difference between *first error* and *root cause*.

**Exercise (select from a log dump).** Input: 48 structured lines from three
services with one real incident buried among warnings. Expected: multi-select
the request ids that actually failed; single-select the **first fault line**;
single-select the service that originated it. Exact answers; per-item partial
credit.

### 5.3 Lesson 11.7 — The Incident Timeline Across Services

*Objective: order scattered events into a timeline and name the first thing to
check.*

**Exercise (sort + locate).** Input: six timestamped lines from three services
(gateway, orders, payments), deliberately interleaved and 90 seconds apart.
Expected: drag-to-order the causal chain (`gateway 502 → retries → payments
timeout → queue backlog`, as the authored reference) **and** click the first
file to check in the repo snapshot. Grading: exact sort (existing `DragSort`)
+ locate ladder (Fix 2 grader). Timeline = 0.6, first-file = 0.4.

**Grader:** Fix 2's locate grader + existing sort/quiz components; no new
engine. **Sequencing:** **waits** — Wave 2, after the pilot, because it is
content, not engine, and depends only on graders the pilot builds.

---

## 6. Fix 6 — What not to paste into AI tools

**Patches:** the `security` track, appended **after** V2 §8.2's three additions
(track becomes **9 lessons**). Distinct from V2's *Leaked Secrets* lesson:
that one is about a secret already committed to a repo; this one is about the
boundary **before** the prompt leaves the laptop.

### 6.1 Lesson — Data Boundaries and Accountability

*Objective: decide what may leave a company's boundary into an AI tool, and
own the consequences either way.*

Reading covers four boundaries and the accountability frame:

1. **Proprietary / work code** — employer policy and the company boundary first;
   open-source counterparts and minimal repros as the legitimate substitute.
2. **Secrets and credentials** — even uncommitted, even in a "private" session;
   the model provider's retention is out of your hands.
3. **Customer data / PII** — anonymise or synthesise; a real payload is a
   breach with extra steps.
4. **License & provenance of output** — generated code's provenance is not
   clean-room; whether it can be redistributed depends on the provider's terms,
   the tool's ingestion, and your employer's policy; attribution risk is real
   and generally owned by the engineer, not the tool.

The frame: **the engineer remains accountable for what the AI produced and for
what the AI was shown** — tooling never transfers that.

### 6.2 Exercise spec

**A. Classify (per-card exact match).** 10 scenario cards — e.g. *"a customer's
support ticket with their email and order history"* (never), *"a stack trace
from production that includes an internal hostname"* (redact first —
`prod-db.internal` → `db.internal`), *"an open-source snippet you're debugging"*
(fine), *"the company's pricing algorithm in prose"* (never), *"a failing test
with synthetic fixtures"* (fine after a PII check). Each card: category
(never / redact first / fine) + the boundary it touches (proprietary, secret,
PII, license). Score = cards fully correct.

**B. Accountability note (rubric).** 120 words: what you would do before
pasting anything into a new tool, and who owns a defective output. Rubric
criteria (auto-checkable subset in the check grammar): names the engineer's
responsibility for the output **and** the input; names at least two of the four
boundaries; names one verification step for generated code. Exemplar revealed
after.

**Grader:** quiz + rubric (both V2 builds). **Sequencing:** **waits** — Wave 2
(content; depends on the rubric grader, which the pilot builds).

---

## 7. Fix 7 — Next.js / server components: validate, don't assume

**Patches (if validated in):** a new conditional mini-track `nextjs`, numeral
ⅩⅪ, **3 lessons**, sitting downstream of the React track (React II → … →
Next.js). V2 has no Next.js content at all, so this is a pure addition.

### 7.1 The validation (method + findings)

Method: sample public junior/new-grad postings and framework-demand data in
the English-speaking/remote market (the app's stated audience — the repo names
no narrower market; if the owner has a metro in mind, re-run the same sample
against it before authoring). Date of sample: **2026-10-02**.

| Evidence | Kind | Finding |
| --- | --- | --- |
| State of JS 2025 (13,002 devs; published Feb 2026; via InfoQ, 2026-03-20) | survey | **Next.js used by 59%** of respondents — the most-used meta-framework; React itself at 83.6% |
| reactjobs.io — "423+ Junior Next.js Jobs" (accessed 2026-10-02) | aggregator | hundreds of junior-tagged Next.js roles actively listed |
| D3 — *Frontend Engineer, New Grad* (Greenhouse) | posting | "Build and maintain frontend components using **React, Next.js**, TypeScript, HTML, and CSS" |
| Fospha — *Junior Software Engineer* (London, Greenhouse) | posting | "frontend UI in **React/Next.js**" |
| Black Canyon Consulting — *Junior/Mid Full Stack* (Greenhouse) | posting | "web interfaces using **React, Next.js**, JavaScript, and TypeScript" |
| ZipRecruiter (Austin; Jacksonville listing) | posting | "(**App Router** preferred)"; "production applications with React and Next.js (**App Router | Server Components**)" |
| LinkedIn — *UI/React/Web Developer* (VY Systems, 2026-09-22) | posting | "**App Router. Server Components.** Modern rendering strategies." |
| devjobs.de | aggregator | 92 Next.js roles in Germany; berlinstartupjobs runs a dedicated Next.js skill area |

**Verdict — split, and it matters:**
- **Next.js as a framework: validated.** It appears consistently, including in
  explicit new-grad and junior postings.
- **"Server components" as an *explicit junior* requirement: partial.** The
  phrase concentrates in mid/senior and staffing listings ("Next.js App Router,
  React Server Components, server actions…" — kore1, 2026-09-04); junior
  postings list Next.js more often than they list RSC by name.

**Decision:** build the module, but scope it as *Next.js + the server/client
boundary*, with the boundary lesson as the bet (juniors meet that failure mode
in review long before a JD names it) — and keep it **last in the sequence**,
gated on a re-validation pass in the owner's actual market before authoring.
If postings there don't show Next.js/RSC, it deprioritizes cleanly — the other
seven fixes lose nothing.

### 7.2 Module spec (3 lessons)

1. **`next-app-router` — Files Are Routing.** Route segments, layouts, `page`/
   `layout`/`loading`/`error` conventions, when to reach for a route handler.
   *Exercise:* map four URLs to their files against a wrong AI file tree
   (exact match per route; the AI put the layout one segment too high).
2. **`next-server-client-boundary` — Spot What the AI Got Wrong.** The common
   real failures: `"use client"` added globally to silence a hydration warning;
   a server page importing a browser-only hook; secrets read through a
   `NEXT_PUBLIC_` name and shipped to the bundle (**ID**); non-serializable
   props passed across the boundary; a client-side waterfall where a server
   fetch belonged (**CX**).
   *Exercise:* review a 5-file agent PR (diff grader, category ID planted in
   `lib/env.ts` + one boundary misuse distractor) — "what do you block on?"
3. **`next-rendering-strategies` — Choose Rendering Per Route.** Static,
   dynamic, revalidated, client-only — as a *decision*, not a religion.
   *Exercise:* four routes with constraints (dashboard behind auth, blog post,
   live stock ticker, marketing page) → pick the strategy + one consequence
   each (exact match; per-route partial credit).

**Grader:** Fix 2 diff grader + quiz. **Sequencing:** **waits — last.** Wave 4,
conditional on re-validation; the module must not delay the pilot or Waves 1–3.

---

## 8. Fix 8 — Rework the Projects track around the agent loop

**Patches:** the shipped milestone layer — `src/lib/milestones.ts`, the
Projects page, and the claim log — which V2 left untouched. V2's rubric grader
(§6.0) is a dependency. Every one of the six milestones currently asks for a
feature + ticked deliverables; none of them reflects V2 or this patch. The
redesign turns each milestone into **portfolio evidence of judgment**:

> each milestone requires (1) one real feature built with an agent, (2) a short
> written note on what the agent got wrong, and (3) the test that proved it was
> wrong.

### 8.1 The artifact loop per milestone

| # | Milestone | Agent task (delegated) | The note must name | The proof test catches |
| --- | --- | --- | --- | --- |
| 1 | Semantic Page Shell | "Convert the shell to semantic landmarks and add a skip link" | the missed heading level / focus trap the agent introduced | a DOM assertion (heading order, skip link target exists) |
| 2 | Design System Layer | "Apply the token system to the card grid, responsive from 320px" | the breakpoint/dark-mode regression the agent left | a selector assertion (sm/md classes, dark variant present) |
| 3 | Interactive Component | "Add immutable add/toggle/remove + controlled input" | the mutation, stale closure, or key bug the agent wrote | the unit test that fails on the agent's draft (mutation incident) |
| 4 | Live Data Layer | "Fetch content, handle loading/error/empty/ready, abort on unmount" | the unawaited value / missing `res.ok` check / abort gap | the test that reproduces the stale-or-error path |
| 5 | Persistent State | "Add a store with getState/setState/subscribe, persist to localStorage" | the needless notify / overwritten persist / lost unsubscribe | the test that fails when setState over-notifies |
| 6 | Ship It | "Generate the README and a changelog from the commit history" | the fabricated claim or dropped evidence in the agent's text | a truthfulness test (claims map to commits/scripts that exist) |

Existing executable proofs (the four code proofs + two previews) stay — they
become the *build* evidence. The note and test are **additional** claim
requirements, not replacements. XP total stays 1,750 (no double-pay); the
artifacts are the unlock condition change, evaluated by completion rates (§8.4).

### 8.2 New claim shape

Additive, optional, no migration — `claims` is `v.optional(v.any())` today
(verified in `src/convex/schema.ts`):

```ts
type Claim = {
  at: string;
  deliverables: number[];
  artifacts?: {
    task: string;              // what was delegated
    note: string;              // what the agent got wrong
    noteCategory: TaxonomyCode;
    proof: {                   // the test that proved it
      buggy: string;           // the agent's version (minimal repro)
      test: string;            // the learner's test
      fixed: string;           // their fix
    };
  };
};
```

`mergeClaims` keeps its pinned rule (more deliverables wins) and extends the
tie-break: equal deliverables → the claim **with artifacts** wins; if both (or
neither) carry artifacts → the earlier date wins. That is still a deterministic
total order, so push/pull converge exactly as `tests/milestone-claims.test.ts`
requires. Old claims without
artifacts remain valid for existing learners; the Projects UI marks them
"pre-patch claim" and offers a resubmission path.

### 8.3 The new grader: ProofRunner (dual-run test-of-the-test)

The claim's proof is graded by **execution**: the runner executes
`buggy + test` and expects a failure (an assertion error the test claims), then
executes `fixed + test` and expects success — both through the existing
sandbox. This is the mechanism that makes "the test that proved it" a
*requirement* rather than an attestation. It fits every milestone because the
learner submits a minimal reproduction, which is also exactly what they can
commit to their repo.

Grading: `test fails on buggy AND passes on fixed` → proof verified (1.0);
one of two → 0.5 recorded, claim incomplete. The note is graded by V2's rubric
grader with auto-checkable criteria (`names the failure scenario`,
`names the taxonomy category`) plus self-attested judgment criteria. Honest
limits (state them in the UI): the agent session itself is unobservable; the
note is self-authored; the proof is a minimal repro, not necessarily the
repo's real test — the artifacts are portfolio evidence, not trustless proof.

**Export:** the Portfolio page renders each claimed milestone's note + proof
as a shareable "judgment card" (copy as Markdown), so the artifacts are
literally reusable in applications, as intended.

### 8.4 Measurement

The redesign ships with its own success metric: **(a)** ≥80% of new claims
carry all three artifacts within two cohorts of launch — below that, the note/
test friction is mis-scoped; **(b)** proof tests pass dual-run on first
submission for ≥50% of learners — below that, the milestone prompts aren't
teaching what the earlier lessons teach; **(c)** artifact use in job
applications via the export (self-reported, optional). Each threshold maps to a
different fix, which is why they are recorded here rather than after the fact.

**Grader:** rubric (V2 build) + **ProofRunner** (new, small — two sandboxed
runs; reuses `runner.ts`). **Sequencing:** **waits** — Wave 3, after the rubric
grader exists (pilot) and after the pilot proves the artifact loop is worth
extending; it touches the synced claim payload, so it gets its own test pass
(merge commutativity + staleness + legacy claims).

---

## 9. Risks designed around

### 9.1 Tool churn — the review-date convention

Tool names and UIs go stale fast; a lesson pinned to a product's button label
is a liability. The contract:

- **Core content is tool-agnostic.** Concepts, not product UI. The artifact
  named in a lesson is generic ("project instruction file", "plan approval",
  "permission profile"); a named tool may appear only in a `toolRefs` sidebar
  entry with an `asOf` date.
- **Every lesson carries `reviewBy`.** Content that names a tool/UI: 90 days.
  Concept-only content: 180 days. Max 12 months, ever.
- **Tests pin it.** The curriculum suite asserts every lesson has `reviewBy`,
  every `toolRefs` entry has `asOf`, and no `reviewBy` is more than 12 months
  out. A scheduled workflow (the repo already uses GitHub Actions) opens an
  issue when lessons pass their date — stale references get caught on a
  cadence instead of silently rotting.

### 9.2 Mock-only LLM grading — the BYOK "catch the live model" playground

V2 grades LLM exercises against the mock endpoint; every failure learners see
is a fixture. Counter this with a **BYOK live-model playground** — the only
place a real model runs:

- **Entry:** on Track XVII lessons and the review lesson. Uses the existing
  BYOK client (`src/lib/ai.ts`; learner's own key, stored locally, called
  direct — no proxy), with a token-cost warning and a "don't paste proprietary
  code" banner (which is Fix 6's lesson applied).
- **Flow:** a fixed task card (review this function / write this test / refactor
  this module) is sent; the learner reads the real output and must **catch
  whatever the live model actually got wrong that session**: cite the exact
  line, pick the taxonomy category, optionally propose the fix.
- **Non-deterministic by design, and therefore never gates mastery.** The
  snapshot of the model's output is stored alongside the learner's claim, so
  the catch is evidence-backed and reviewable; grading records participation +
  a "caught one live" badge, not lesson completion. The deterministic mock
  exercises remain the graded spine — reproducibility is what makes grading
  fair, and this playground exists to make sure learners also see the model
  actually fail.

### 9.3 Scope — the pilot is two workstreams, not eight fixes

**Ship and validate first:**

1. **Track XVI end-to-end, fully graded.** Track XVI renumbered to nine
   lessons per §4's map: includes Fix 3 (archaeology), Fix 4 (the operating
   cluster), the Fix 2 diff exercise in 16.7, and a capstone that requires the
   diagnosis partial credit path. "Fully graded" pulls one more grader into
   this workstream: **the V2 rubric grader** — three Track XVI exercises are
   written deliverables.
2. **The DebugLab diagnosis change** — partial-credit recording in
   `Lesson.handleScore` (the one shared engine change), the diagnosis input on
   DebugLab, **the expanded taxonomy**, and the **diff/click grader** the rest
   of the plan (Fixes 2, 5, 7) depends on.

Everything else waits: Fix 1 (Wave 1), Fix 2's propagation seeds (Wave 1),
Fixes 5–6 (Wave 2), Fix 8 (Wave 3), Fix 7 (Wave 4, conditional). If Track XVI
plus the grader don't validate — i.e., learners can't find the planted issue in
a multi-file diff at a rate better than chance — no other fix is committed to.

---

## 10. Auditable diff vs. V2, and rollout

### 10.1 Counts

| | V2 | V2.1 (this patch) | V2.1 + conditional Fix 7 |
| --- | --- | --- | --- |
| Tracks | 20 | 20 | 21 |
| Lessons | 111 | **119** (+8: +1 archaeology, +3 agents config, +3 production debugging, +1 data boundaries) | 122 (+3 Next.js) |
| Lessons with executed Python | 0 | 3 | 3 |
| Multi-file diff exercises | 0 | 3 | 4 |
| New graders | — | Pyodide runner, diff/click grader, ProofRunner; DebugLab partial-credit amendment *recorded* | — |
| Practice-only (non-graded) | — | BYOK live-model playground | — |

No V2 lesson is removed; `python-llm-api` and the §8.5 rows change *format*,
not count. Fix 8 changes the milestone claim schema, not lesson count.

### 10.2 Files touched at implementation (projected)

- **New:** `src/lib/pythonRunner.ts` (+ worker), `src/components/DiffLab.tsx`,
  `src/components/MultiFile.tsx`, `src/components/ProofRunner.tsx`,
  `src/data/diff-challenges.ts`, `src/data/repo-snapshots.ts` (archaeology),
  `src/data/bug-taxonomy.ts` (single source for diagnosis + diff categories),
  `src/data/track-nextjs.ts` (conditional).
- **Edits:** `src/data/types.ts` (`DiffExercise`, `TraceQuestion`, `reviewBy`,
  `toolRefs`; `Lesson.lang` gains `"python"`),
  `src/components/Playground.tsx` (python branch),
  `src/pages/Lesson.tsx` (partial-credit `handleScore`, `diff` step),
  `src/data/track-agents.ts`, `track-python.ts`, `track-testing.ts`,
  `track-security.ts`, `src/lib/milestones.ts` (claim artifacts),
  `src/pages/Projects.tsx` / `Portfolio.tsx` (artifact capture + export).
- **Tests to add:** diff-challenge suite (planted line in bounds; one blocker;
  ≥2 distractors; taxonomy valid), python exercises (starter fails / reference
  passes), review-date assertion, taxonomy-coverage assertion (extended),
  ProofRunner dual-run contract, claim-merge with artifacts (commutativity +
  legacy claims), Track XVI numbering/capstone assertions.
- **No Convex schema change** (claims are `v.any()`); no progress-format change
  (0..1 already stored).

### 10.3 Rollout order

| Wave | Ships | Depends on | Gate |
| --- | --- | --- | --- |
| 0 — pilot | DebugLab diagnosis + partial credit recording; diff/click grader + expanded taxonomy; V2 rubric grader; Track XVI (9 lessons) end-to-end | V2 §1.4 #1 | Multi-file diff catch rate beats chance; Track XVI completions with both written exercises |
| 1 | Fix 1 (Pyodide runner + 3 Python lessons executed; pandas stays a reading); Fix 2 seeds: Workflow `19.2`, then `testing/debug-the-bug`, then `16.7` expansion | Pilot green | Python starter-fails/reference-passes suite; diff grader reused by three tracks |
| 2 | Fix 5 (production debugging, 3 lessons); Fix 6 (data boundaries, 1 lesson) | Wave 1 | Rubric + locate grader in content use; incident exercises solvable |
| 3 | Fix 8 (milestone artifacts + ProofRunner + claim merge + export) | Wave 2; rubric grader | §8.4 metrics; merge tests green |
| 4 — conditional | Fix 7 (Next.js track) | **Re-validation against the owner's actual market** | Postings show Next.js/RSC in the target market, or it is deprioritized |

---

*Patch authored against the repository state of 2026-10-02. Every "confirmed"
in §0 was read from the files named there; Fix 7's posting evidence is dated in
§7.1. Where this document disagrees with V2, this document wins; where it is
silent, V2 stands.*
