# Curriculum V2 — Judgment Over Authorship

> **Patched.** [CURRICULUM-V2-PATCH.md](./CURRICULUM-V2-PATCH.md) (V2.1) is the
> execution & operating patch: executed Python, multi-file diff review with
> partial credit, codebase archaeology, agent-configuration lessons, production
> debugging, AI data boundaries, a validated Next.js decision, and project
> milestones reworked around agent tasks, notes, and proof tests. Where the
> patch disagrees with this document, the patch wins.

The next version of Codexter's curriculum. Its single organizing idea: every
track trains **judgment over AI output**, not just authorship of code. The
canonical exercise becomes *"Here is AI-written code. Something is wrong with
it. Find it, explain it, fix it."*

**Scope of this document.** This is the design deliverable: lesson-by-lesson
outlines, a concrete exercise spec per lesson, the grader each exercise needs
(existing or to build), and an auditable diff against today's curriculum.

**Current → proposed:** 15 tracks / 86 lessons → **20 tracks / 111 lessons**,
plus four grader changes. §1 records what was *verified by execution* against
the real grading code before any exercises were designed against it.

---

## 1. Precondition — grader audit (verified, not assumed)

### 1.1 What exists today

| Grader | Code | Grades | Pass rule |
| --- | --- | --- | --- |
| Output check | `src/lib/runner.ts` + `src/lib/checkExpr.ts` | console output of sandboxed JS (async drained, loop guard, mock REST server) | whitelisted expression is true |
| **DebugLab** | `src/components/DebugLab.tsx` | a repaired program | runs without error **and** `fixCheck` true; first pass calls `onPass` |
| TS compiler | `src/lib/tsRunner.ts` | `lang: "ts"` exercises | zero diagnostics **and** output check |
| LivePreview | `src/components/LivePreview.tsx` | DOM in a sandboxed iframe | every `requires` selector matches |
| GitSim | `src/components/GitSim.tsx` | simulator state | objective predicates |
| Quiz / Predict / Sort | lesson components | answers | exact match |

The output-check grammar is deliberately small: `output.includes(...)`,
`indexOf`, `lastIndexOf`, `split(...)[n].trim()`, `.length`, string/number
comparisons, `!`, `&&`, `||`. **No regex, no counting, no arithmetic.** Checks
fail closed. This matters for authoring: if a check needs a count, the exercise
fixture must print it as its own labeled line.

### 1.2 Verification run — all six taxonomy categories accepted

`runUserCode` + `evaluateCheck` (the exact functions DebugLab calls) were run
against one representative bug per category. Each case required: broken version
fails (error or check false), reference fix passes, and the injected failure is
**not** a syntax error. A genuine syntax error was run as a control.

```
category                | broken outcome                  | fix outcome  | verdict
------------------------+---------------------------------+--------------+--------
RC race/concurrency     | ran cleanly, wrong output       | check passes | ACCEPT
EC missing edge case    | ran cleanly, wrong output       | check passes | ACCEPT
HA hallucinated API     | error: Math.clamp is not a func | check passes | ACCEPT
ID insecure default     | ran cleanly, wrong output       | check passes | ACCEPT
SL silently wrong logic | ran cleanly, wrong output       | check passes | ACCEPT
CX bad complexity       | error: operation budget exceeded| check passes | ACCEPT
control (syntax error)  | error: Unexpected token ';'     | —            | distinguishable
```

**Verdict: yes.** DebugLab accepts arbitrary injected bugs from the taxonomy,
not just syntax errors — with the authoring rules below. The verification was
executed with Bun against the real modules; the first task of implementation is
to make it permanent as a vitest suite mirroring `tests/debug-challenges.test.ts`
(broken fails / reference fix passes / no typo hunts), one test per category.

### 1.3 Per-category authoring rules (derived from the run)

| Code | Category | How it must manifest | Grading rule |
| --- | --- | --- | --- |
| **RC** | Race conditions / concurrency | deterministic ordering via `setTimeout` (the runner drains timers, so ordering is reproducible); observable "applied/dropped" lines | check asserts the winning ordering and the absence of the stale write |
| **EC** | Missing / mishandled edge cases | silent wrong value on the edge input, labeled in output (`average([]) -> 0`) | check asserts the labeled edge-case line |
| **HA** | Invented APIs / methods | a runtime `TypeError` is the honest manifestation; the *fix* must use the real API | check asserts the real-API output |
| **ID** | Insecure defaults | only via instrumented fixtures that make the decision observable (`insecure:` / `secure:` lines). Never perform a genuinely unsafe operation | check asserts the safe branch ran and the unsafe branch did not |
| **SL** | Silently wrong logic | runs cleanly, plausible output, wrong on real input | the core format; check asserts the real-input output |
| **CX** | Bad complexity | an **operation-budget fixture** inside the exercise (`ops` counter, hard budget) turns an O(n²) solution into a deterministic failure. Never wall-clock timing, never asymptotic analysis | check asserts correct output **and** the printed operation count |

Pedagogical payoff worth keeping visible: HA and CX are mostly caught *by
running the code*; EC, ID and SL are not. The exercise briefs should say so.

### 1.4 Grader amendments required before content is built on top

1. **Diagnosis + partial credit (DebugLab).** Add optional
   `diagnosis: { prompt, options, answer }` (options = taxonomy labels) and an
   `onScore(score: 0..1)` callback. Scoring: fix passes → **1.0**; diagnosis
   right but fix imperfect → **0.5**; neither → **0**. `progress.ts` already
   stores best score 0..1, but `Lesson.tsx` currently records only `score >= 1`
   and completion is `scoreFor(...) >= 1` — so a 0.5 attempt must be recorded
   (partial credit, visible) while the lesson stays incomplete until the fix
   passes. No backend change.
2. **Mock LLM endpoint** in the runner (`/api/llm/chat`) with per-run state, so
   retry scenarios are deterministic on every run. Scenarios: `ok`, `ratelimit`
   (429 ×2 then 200), `malformed`, `tool-call`, `sse`. The existing
   `/api/users` mock only depends on within-run state, so per-run state is safe.
3. **Operation-budget helper** as a content convention (starter code), not a
   runner change.
4. **Rubric grader** (new `rubric` lesson element + component) for written
   deliverables — §5.0.
5. **SQL runner + lab** (larger) — §4.0.
6. Optional: a timed DebugLab for the interview capstone. Default plan keeps
   the timer *displayed but not gating* (the existing RapidFire timer is
   quiz-only), consistent with the product's "speed feeds score, not mastery".

---

## 2. The shared bug taxonomy (content contract)

Every "spot what the AI got wrong" exercise carries exactly one primary
category (cross-category hybrids are allowed for capstones only):

| Code | Category |
| --- | --- |
| RC | Race conditions / concurrency |
| EC | Missing or mishandled edge cases |
| HA | Invented / hallucinated APIs or library methods |
| ID | Insecure defaults (permissive CORS, disabled cert checks, weak crypto, string-concatenated SQL) |
| SL | Silently wrong logic that passes a shallow glance |
| CX | Bad complexity (accidental O(n²) where O(n log n) was expected) |

Authoring invariants, enforced by tests:

- The broken program runs cleanly **or** fails with a runtime error — never a
  parse error. (HA and CX legitimately throw; everything else stays silent.)
- A reference fix ships beside every challenge; the broken version fails its
  own check and the reference fix passes it.
- Checks are output expressions only, in the existing grammar.
- Agent-authored flavor: realistic comments ("handles edge cases", "verified
  against production data") that are confidently wrong. Never fake a bug as
  "the code is actually fine, the lesson is about assumptions".
- Every challenge exposes a taxonomy **diagnosis** (new) so partial credit is
  possible on the judgment, not just the repair.

---

## 3. Track XVI — Working with Coding Agents

*id `agents`, numeral ⅩⅥ, 5 lessons (the 4 specified lessons + a capstone, to
match the platform's one-capstone-per-track pattern).*

**16.1 Specs and Prompts — From Vague Task to Executable Spec**
*Objective: turn a vague task into a spec an agent can execute without guessing.*
- **Exercise A (auto).** Input: three candidate specs for "add dark mode to
  settings" — one vague, one executable, one scoped-but-unverifiable. Expected:
  the executable one (names scope, measurable acceptance criteria, explicit
  non-goals). Category: n/a. Grading: exact match (quiz).
- **Exercise B (written).** Input: the prompt "make the dashboard faster".
  Expected: a spec naming what is measured, a target or decision rule, ≥1
  non-goal, and a definition of done that includes verification. Grading:
  rubric (new) — one weighted criterion each; partial credit.
- *Grader:* quiz (exists) + rubric (build).

**16.2 Managing Context — What Goes In, What Stays Out**
*Objective: choose context deliberately, summarize vs paste, avoid context rot.*
- **Exercise A (auto).** Input: a realistic session (repo layout, 600-line log,
  three relevant files, one stale error from 40 messages ago) and a task.
  Expected: the minimal context pack. Grading: exact match (quiz).
- **Exercise B (written).** Input: the same session. Expected: a compaction
  summary that keeps the failing test name, the repro, and the open decision —
  and drops raw logs. The AI's draft summary (shown) silently loses the failing
  test name (rot). Grading: rubric (new) with auto-checkable criteria
  ("names the failing test") using the existing check grammar over the text.
- *Grader:* quiz (exists) + rubric (build).

**16.3 Verifying Agent Output with Tests**
*Objective: treat agent output as a draft; write or request tests before accepting.*
- **Exercise A (DebugLab).** Input: AI-written `parseCSV` with the comment
  "handles quoted fields and embedded commas — tested", but it splits on every
  comma. Fixture data includes `"Doe, Jane"` and an empty trailing field.
  Expected fix: quote-aware parse. Category: **SL**. Grading: test pass/fail
  (run clean + output check).
- **Exercise B (auto).** Input: three candidate tests. Expected: the one that
  fails on the broken parser. Grading: exact match (quiz).
- *Grader:* DebugLab (exists), with the §1.4 partial-credit amendment.

**16.4 Knowing When Not to Use an Agent**
*Objective: classify tasks by agent reliability and choose the right mode.*
- **Exercise.** Input: 8 task cards (boilerplate CRUD endpoint; novel consensus
  algorithm; rename across 200 files; a hot-loop performance constraint;
  auth check; test scaffolding; a breaking dependency upgrade; "make it feel
  snappier"). Expected: delegate / delegate-with-tests / human-only, each with
  a reason. Grading: exact match per card; lesson score = % correct (partial
  credit is native to quizzes).
- *Grader:* quiz (exists).

**16.5 Capstone — The AI-Drafted Feature**
*Objective: run the full loop — spec → context → draft → verify → fix — and ship proof.*
- **Exercise A (DebugLab).** Input: an AI-drafted debounced search queue with
  **two** planted issues: a stale-response race (RC) when out-of-order results
  land, and an empty-query edge case that fires a request for `""` (EC). Fix
  must satisfy both behaviors. Grading: test pass/fail.
- **Exercise B (written).** Expected: the spec used, and a verification note
  naming what was wrong and which test proves the fix. Grading: rubric (new);
  diagnosis partial credit via the §1.4 amendment.
- *Grader:* DebugLab + rubric (build).

---

## 4. Track XVII — Building with LLMs

*id `llm`, numeral ⅩⅦ, 6 lessons. All runnable exercises execute against the
mock LLM endpoint (§1.4 #2) — the honest equivalent of the API track's mock
REST server. Live BYOK calls stay a playground, never a graded dependency.*

**17.1 Calling an LLM API — Auth, Shape, Streaming, Failure**
*Objective: make a correct call, handle errors, retry safely.*
- **Exercise A (code).** Input: `chat(messages)` against `/api/llm/chat`; the
  `ratelimit` scenario 429s twice, then succeeds. Expected: retry with backoff,
  surface the final text, and fail fast on a 400. Output includes
  `answer: …` and `retries: 2`. Grading: test pass/fail.
- **Exercise B (DebugLab).** Input: AI code that ignores `res.ok` and parses an
  error body as a completion. Expected: check `res.ok` before parsing. Category:
  **EC**. Grading: test pass/fail.
- *Grader:* runner + new mock route (fixture build).

**17.2 Structured Output and Tool Calling**
*Objective: force schema-conformant output and validate before use.*
- **Exercise A (DebugLab).** Input: AI code does
  `JSON.parse(resp).items[0].price` with no validation; the mock returns one
  malformed payload. Expected: validate against a hand-rolled guard; reject or
  repair; never use unvalidated fields downstream. Category: **SL**. Grading:
  test pass/fail on both valid and malformed responses.
- **Exercise B (code).** Input: a `get_weather` tool schema. Expected: the
  correct `tool_calls` request and a parsed tool result. Grading: output check.
- *Grader:* runner + structured mock payloads (content).

**17.3 Context Windows, Cost, and Latency**
*Objective: budget tokens, truncate meaningfully, reason about cost and latency.*
- **Exercise A (code).** Input: fixture histories including one tool
  call/result pair. Expected: `fitHistory(messages, maxTokens)` keeps the system
  prompt and newest whole turns, never splits a tool pair, prints token counts
  and dropped ids. Grading: test pass/fail.
- **Exercise B (DebugLab).** Input: the AI version that re-tokenizes the whole
  history every turn (O(n²)) and drops half of a tool pair. Expected: fix both.
  Category: **CX** (primary) + EC. Grading: test pass/fail with an
  operation-budget fixture.
- *Grader:* runner (exists).

**17.4 RAG Basics and Where It Breaks**
*Objective: chunk, index, retrieve; name the three classic failure modes.*
- **Exercise A (code).** Input: a fixed mini-corpus, deterministic hash-based
  embeddings, three queries. Expected: correct doc ids retrieved. Grading:
  output check.
- **Exercise B (DebugLab).** Input: AI version chunks every 500 chars
  mid-sentence and retrieves by raw substring. Expected: sentence-aware chunks
  and retrieval that handles a paraphrase. Category: **SL**. Grading: test
  pass/fail.
- **Exercise C (auto).** Input: three incidents (stale index, bad chunking,
  irrelevant context). Expected: correct diagnosis + mitigation. Grading: exact
  match (quiz).
- *Grader:* runner + quiz (exist).

**17.5 What MCP Is**
*Objective: explain MCP's purpose and read/write a minimal tool call.*
- **Exercise A (predict, displayed).** Input: an MCP manifest and a question.
  Expected: the correct JSON-RPC `tools/call` message (method/params). Grading:
  exact match (predict).
- **Exercise B (quiz).** Input: four statements about MCP (why standardization
  exists; what a server exposes; what it does *not* solve). Grading: exact match.
- *Grader:* predict/quiz (exist). **Honest note:** a live MCP session needs a
  server and is out of scope for the sandbox; this lesson is read-only by design.

**17.6 Writing Simple Evals**
*Objective: score quality programmatically instead of eyeballing.*
- **Exercise A (code).** Input: 6 fixture cases and a scoring rule. Expected:
  `runEval()` prints `passed 5/6` and names the failing case. Grading: output
  check.
- **Exercise B (DebugLab).** Input: the AI's eval asserts `output.length > 0`
  for everything — "all green", catches nothing. Expected: assertions that fail
  on the known-bad fixture case. Category: **SL**. Grading: test pass/fail.
- *Grader:* runner (exists).

---

## 5. Track XVIII — SQL & Databases *(requires a new grader)*

*id `sql`, numeral ⅩⅧ, 6 lessons. Progression: SELECT/WHERE/JOIN →
aggregation → subqueries/CTEs → indexing/performance → schema design → spot the
AI's query.*

### 5.0 The SQL runner (build first)

- **Engine:** sql.js (SQLite compiled to WASM), self-hosted from `public/`
  (no CDN), loaded by dynamic `import()` only when a `sql` exercise renders —
  the same lazy-loading pattern as the TypeScript compiler. Fresh in-memory DB
  per run from `schema` + `seed` → deterministic.
- **Lesson type:** `sql?: SqlExercise` on `Lesson`; new `SqlLab` component
  (editor + result grid + plan view).
- **Grading semantics:**
  - result-set equivalence, order-insensitive unless `ORDER BY` is required;
    column aliases significant when asserted;
  - errors fail unless the exercise expects an error (constraint probes);
  - **statement budget** for N+1 exercises (the runner counts executed
    statements; the fix must use ≤ 1);
  - **plan assertions** for the indexing lesson (`EXPLAIN QUERY PLAN` must not
    contain `SCAN tracks`, must contain `SEARCH`);
  - **injection probe** for the security module: run the learner's query with a
    hostile input literal and assert the result stays safe.
- **Invariants, test-pinned:** every starter query fails its own exercise,
  every reference query passes, and every exercise's expected result is
  duplicate-sensitive (to catch fan-out bugs).

### 5.1 Reading Data: SELECT, WHERE, JOIN
*Objective: write real queries against a real schema.*
- **Exercise.** Input: `artists/albums/tracks` schema + seed. Expected: four
  queries (filter, ORDER BY, inner join, left join with a row that must not
  disappear). Grading: result equivalence (SQL runner, new).

### 5.2 Aggregation and Grouping
*Objective: GROUP BY / HAVING, and the join-before-aggregate trap.*
- **Exercise A.** Input: "tracks per album for albums with >10 tracks".
  Expected: correct counts. Grading: result equivalence.
- **Exercise B (DebugLab-SQL).** Input: the AI's query joins
  tracks→albums→genres *before* counting, so counts inflate. Expected: aggregate
  before joining. Category: **SL**; the fixture guarantees a duplicate-sensitive
  result so the bug is visible. Grading: result equivalence.
- *Grader:* SQL runner (new).

### 5.3 Subqueries and CTEs
*Objective: decompose with CTEs; know when correlated subqueries are fine.*
- **Exercise.** Input: "albums above their artist's average track length".
  Expected: same rows as the reference; single statement. Grading: result
  equivalence.
- **Variant (DebugLab-SQL).** The AI's CTE groups by album instead of artist —
  silently plausible, wrong for multi-album artists. Category: **SL**.
- *Grader:* SQL runner (new).

### 5.4 Indexing and Query Performance
*Objective: read a plan and add the index the query needs.*
- **Exercise.** Input: a query on `tracks(album_id)` with no index; the brief
  says the table has 10M rows. Expected: `CREATE INDEX` such that
  `EXPLAIN QUERY PLAN` shows `SEARCH tracks USING INDEX`, plus a one-liner on
  the write-side cost. Grading: plan assertion + result equivalence.
- **AI variant:** the AI's query is correct but assumes an index that doesn't
  exist. Category: **CX** (missing index assumption).
- *Grader:* SQL runner (new, plan assertions).

### 5.5 Schema Design Basics
*Objective: keys, constraints, normalization decisions.*
- **Exercise.** Input: a denormalized schema. Expected: repair with PK, FK,
  NOT NULL, UNIQUE; then three probe inserts must fail exactly
  (duplicate email, orphan FK, null required). Grading: DDL applied + expected
  errors (test pass/fail).
- *Grader:* SQL runner (new).

### 5.6 Spot What the AI Got Wrong: Queries *(required module)*
*Objective: diagnose four planted SQL bugs; each is partially credited.*
- **Items:** (1) LEFT JOIN + `WHERE` on the right table silently drops
  unmatched rows (**SL**); (2) join fan-out duplicates (**SL**); (3) N+1: N
  queries rewritten to one join, statement budget ≤ 1 (**CX**); (4) SQL
  injection via string concatenation — hostile input `' OR '1'='1` must return
  nothing, the parameterized version must return the right row (**ID**).
- Grading: per-item result equivalence + statement count + safety probe; lesson
  score = items correct (0..1).
- *Grader:* SQL runner (new).

---

## 6. Track XIX — Professional Workflow

*id `workflow`, numeral ⅩⅨ, 4 lessons. Written deliverables need the rubric
grader; decision points reuse the quiz grader.*

### 6.0 The rubric grader (build)

`rubric?: RubricSpec` lesson element + `RubricLab` component:
`{ deliverable, criteria: { id, text, weight, check?: string }[], exemplar }`.
Criteria with a `check` are evaluated over the learner's typed answer with the
existing check grammar (deterministic, gameable — weighted low); the rest are
self-attested against the exemplar. Score = weighted sum (partial credit);
completion requires all *blocking* criteria. BYOK LLM feedback (the existing
`src/lib/ai.ts` client) may annotate feedback but **never** sets the grade.
Honest framing: this is a checklist, not a semantic judge.

**19.1 Pull Requests — Intent and Tradeoffs**
*Objective: write PR descriptions that explain why, not what.*
- **Exercise.** Input: a diff, the linked issue, and one rejected alternative.
  Expected: description stating intent, the tradeoff, out-of-scope, and a test
  plan. Grading: rubric (new) — auto-checkable subset ("migration", "rollback",
  "not included"); judgment criteria self-attested; exemplar revealed after.

**19.2 Reviewing Someone Else's Diff**
*Objective: specific, actionable comments; separate nits from blockers.*
- **Exercise A.** Input: six comments from a review thread. Expected: blocking /
  non-blocking / question. Grading: exact match per item (quiz).
- **Exercise B.** The diff contains a planted RC bug. Expected: a blocking
  comment that names the line, the failure scenario, and the proposed fix.
  Grading: rubric (new).
- *Grader:* quiz (exists) + rubric (build).

**19.3 Turning a Vague Request into a Ticket**
*Objective: scope stakeholder noise into acceptance criteria.*
- **Exercise A.** Input: "the dashboard feels slow" + p95 data + two complaint
  quotes. Expected: ticket with a measurable target, scope boundary, unknowns,
  and verification steps. Grading: rubric (new).
- **Exercise B.** Input: the AI-drafted ticket. Expected: spot the unverifiable
  criterion ("should be snappy"). Category: **SL** (unverifiable spec).
  Grading: exact match (quiz).
- *Grader:* rubric (build) + quiz (exists).

**19.4 Explaining Your Decisions in Writing**
*Objective: decision, rejected alternatives, tradeoffs, revisit conditions.*
- **Exercise.** Input: the completed capstone from Track XVI. Expected: a short
  rationale. Grading: rubric (new) — decision in one sentence; ≥1 rejected
  alternative with reason; ≥1 tradeoff; ≥1 condition that would change the
  decision; exemplar.

---

## 7. Track XX — Interview Prep & Live Coding

*id `interview`, numeral ⅩⅩ, 1 lesson (the specified capstone). The integration
point: the learner directs an assistant, catches its mistakes in real time, and
ships under time budget — exercising all four new tracks at once.*

**20.1 Capstone — The Monitored Session**
*Objective: direct the agent, catch its errors live, ship a correct solution.*
- **Stage 1 — Direct (RapidFire, exists).** Four timed decisions: the next
  instruction to give; what to verify before accepting; when to stop the agent;
  what to test first. The session prompt samples Track XVI (spec wording),
  XVII (a mock-LLM parse), XVIII (a SQL query), XIX (what the PR note must
  say). Grading: exact match per decision; the timer adds pressure but does not
  gate mastery.
- **Stage 2 — Catch and Fix (DebugLab + amendment).** The assistant's draft
  contains two planted issues from different categories (recommended: RC + SL).
  Expected: diagnose each (partial credit) and fix both (check). Grading: test
  pass/fail + 0.5 diagnosis credit.
- **Stage 3 — Ship (code exercise).** A final small program against the spec
  with edge cases. Grading: output check.
- Optional post-mortem writeup graded by rubric (§6.0).
- *Grader:* quiz + RapidFire (exist); DebugLab with §1.4 #1 (build); optional
  timer for DebugLab explicitly out of scope.

---

## 8. Changes to existing tracks

### 8.1 Testing & Debugging — verify-and-fix becomes the primary format

| Lesson | Change |
| --- | --- |
| `debug-the-bug` | Rewritten as **"Verify and Fix: AI-Written Programs"** — three DebugLab-style stations (EC, SL, RC) replacing the single `starter`+`check`. |
| `tdd-mocking` | New exercise: **"Write the failing test"** — starter ships a buggy function; the learner writes assertions; the runner must report the named failures (`2 failed, 0 passed`). Grading: output check. |
| `debugging-method` | Framing updated: the scientific method is now applied to a *drafted* change, not only self-written code. |

Grader note: DebugLab (exists, plus §1.4 #1 for diagnosis credit); runner
(exists).

### 8.2 Security — 3 new lessons (5 → 8)

> **Flag for stakeholders:** this addition is my own judgment call, not sourced
> from an external curriculum reference.

**Leaked Secrets: Find, Rotate, Prevent**
*Objective: spot committed credentials and run the response — rotate, revoke, purge history, prevent recurrence.*
- **Exercise A (auto).** Input: a repo fixture (file listing + git-history
  excerpt) containing one live key and two decoys. Expected: the committed key.
  Category: **ID**. Grading: exact match (quiz).
- **Exercise B (sort).** Input: the four response steps. Expected: rotate →
  revoke → purge history → add scanning/pre-commit. Grading: exact match (sort).
- **Exercise C (written).** Expected: a prevention note (scanning, pre-commit
  hook, secret manager, least privilege). Grading: rubric (build).
- *Grader:* quiz + sort (exist); rubric (build).

**Hallucinated & Malicious Dependencies**
*Objective: verify a dependency before installing instead of trusting an agent's suggestion.*
- **Exercise A (auto).** Input: an AI-suggested `package.json` diff — one
  package that doesn't exist, one typosquat, one real. Expected: install /
  verify / reject per package, with reasons. Category: **HA + ID**.
  Grading: exact match (quiz); partial credit per package.
- **Exercise B (written).** Expected: the verification step — registry
  existence, source repo, download counts, provenance/attestation, lockfile
  pinning. Grading: rubric (build).
- *Grader:* quiz (exist) + rubric (build).

**Prompt Injection**
*Objective: recognize prompt injection in agent/RAG pipelines and apply basic mitigations.*
- **Exercise A (predict).** Input: a poisoned retrieved document in an agent
  data flow. Expected: what the document can make the agent do — and what it
  cannot, given tool scopes. Category: **ID**. Grading: exact match (predict).
- **Exercise B (DebugLab).** Input: a prompt builder that concatenates trusted
  system instructions with untrusted document text into one message; the
  injected instructions are obeyed by the mock agent. Expected fix: separate
  channels, never let retrieved text grant capabilities, restrict tool scope.
  Grading: test pass/fail.
- *Grader:* predict/quiz (exist) + DebugLab (exists).

### 8.3 Python — replace the Matplotlib/ML lesson

- Remove `matplotlib-ml`. Add **"Calling LLM APIs from Python"** —
  *objective: recognize the failure modes of an LLM client written in Python
  even when you can't run it here.* Reading + predict + quiz; the exercise is a
  *predict-the-bug* over AI-generated Python client code — missing timeout
  (hang), bare `except:` (swallowed errors), retrying a 400, and an API key
  printed in an error line. Categories: **EC + SL**. Grading: exact match.
- Honest constraint: this track **does not execute Python** today (all four
  lessons are read/predict). The new lesson is therefore graded by
  predict/quiz. Executed Python (Pyodide) is a separate runner project,
  explicitly out of scope here.
- Change: `matplotlib-ml` → `python-llm-api` (count unchanged, 4 lessons).

### 8.4 DSA — rebalance toward judging generated code

- `big-o` — *objective: recognize an accidental O(n²) in generated code from
  its scaling behavior.* Keep the lesson, and add **"Spot the accidental
  O(n²)"** DebugLab (`containsDuplicate`/pair-sum with nested loops under an
  operation budget). Category: **CX**.
- `sorting` — *objective: judge a generated implementation for worst-case
  behavior instead of reproducing one from memory.* Keep merge/quick concepts,
  but the exercise changes from "implement from memory" to **"fix the AI's
  sort"** — last-element pivot on already-sorted input (CX) plus a comparator
  mutation bug (SL). Category: **CX** primary.
- All other DSA lessons unchanged; nothing is cut.

### 8.5 Every track — one "spot what the AI got wrong" challenge

| Track | Lesson touched | Category | Exercise spec (input → expected fix) | Grader |
| --- | --- | --- | --- | --- |
| web | `fetch-api` | SL | AI `loadUser()` renders `res.json()` without checking `res.ok`, so a 404 `{error}` body becomes "the user" → check `res.ok`, branch error vs data | runner (exists) |
| react | `hooks-effect` | RC | AI effect `fetchUser(id).then(setUser)` with no cleanup → abort/ignore on id change so the stale response cannot win | DebugLab (exists) |
| tailwind | `responsive-dark` | SL | AI markup puts `md:` where `sm:` was intended (desktop fine, mobile broken) → corrected breakpoint utilities | LivePreview probe (exists) |
| state | `state-shapes` | SL | AI reducer mutates nested state ("spread is enough") → new nested objects; output asserts the previous state is untouched | DebugLab (exists) |
| api | `abort-races` | RC | AI creates an AbortController but never calls it on param change → abort the previous request; stale response dropped | DebugLab (exists) |
| typescript | `unknown-errors` | EC | AI guard `typeof v === "object"` accepts `null` and arrays → exclude them; compiler clean + runtime output correct | TS exercise (exists) |
| backend | `api-security` | ID | AI middleware sends `Access-Control-Allow-Origin: *` with credentials and trusts `x-user-role` → origin allowlist, role derived server-side; instrumented request prints the decision | runner + request fixture (content) |
| dsa | `big-o` | CX | AI `containsDuplicate` nests loops (budget fixture at n=600) → Set-based single pass, `operations: 600` | DebugLab (exists) |
| python | `python-syntax` | SL | AI Python uses `is` for string equality and a bare `except:` → `==` and the specific exception, with reasons | predict/quiz (exists) |
| git | `git-workflow-lab` | ID | AI sequence `git add . && commit -m wip && push --force` → stage named files, descriptive commit, non-force push; assert simulator state | GitSim + quiz (exist) |
| testing | `debug-the-bug` | RC / EC / SL | Three AI-authored stations, one planted issue each (§8.1) | DebugLab (exists) |
| devops | `docker-dockerfile` | ID | AI Dockerfile: `USER root`, `chmod 777`, `ENV API_KEY=…`, `curl … \| bash` → non-root user, least permissions, secret mount, pinned checksum download | predict/quiz (exists) |
| security | `sqli` | ID | AI `WHERE email = '${email}'` → parameterized query; hostile input `' OR '1'='1` returns nothing while the real email returns its row | DebugLab (exists) |
| architecture | `caching-and-redis` | CX (＋ EC) | AI LRU scans the whole map per `get` and never evicts → O(1) Map-based LRU with eviction; operation budget + size-cap assertions | runner + op budget (exists) |
| performance | `layout-shift` | SL | AI hero `<img>` has no dimensions and `loading="lazy"` → intrinsic width/height, eager above the fold; attribute probe | LivePreview (exists) |

Each row is one modified lesson; no lesson counts change. Every challenge also
carries a taxonomy **diagnosis** (partial credit, §1.4 #1), and a curriculum
test asserts every track ships at least one taxonomy-tagged challenge.

---

## 9. Keep / Trim

**Keep, deliberately:**

- **DSA and Big-O** — rebalanced toward *recognizing* bad complexity in
  generated code (new CX labs), not writing sorts from memory. The topics stay;
  the exercise format changes.
- **TypeScript, system design, the arch/performance/security fundamentals** —
  this is the literacy that makes judging AI output possible at all. Nothing is
  cut to make room for the new tracks; the new tracks are additive.
- All 15 existing tracks and their certificates.

**Trim (syntax-memorization exercises — recall is cheap, judgment is scarce):**

| Where | Trim | Replace with |
| --- | --- | --- |
| `web/es6-syntax` | "write destructuring/arrows from memory" starter | review an AI refactor that changes semantics (default params vs `\|\|`, `var` hoisting) |
| `dsa/sorting` | "implement merge sort from memory" starter | fix the AI's sort (§8.4) |
| `python/python-syntax` quiz | 2 pure-recall items (tuple immutability; `[::-1]`) | 2 judging items (AI's slicing/comprehension errors) |
| `python/matplotlib-ml` | entire lesson (chart-type recall + sklearn tour) | "Calling LLM APIs from Python" (§8.3) |
| `testing/debug-the-bug` | single self-written repair format | three AI-authored verify-and-fix stations (§8.1) |

No track is deleted. No lesson is removed except the one replacement above.

---

## 10. Auditable diff vs. the current curriculum

### 10.1 Counts

| | Current | Proposed |
| --- | --- | --- |
| Tracks | 15 | **20** (+5) |
| Lessons | 86 | **111** (+25) |
| DebugLab lessons | 2 | 12+ |
| Taxonomy categories used | 0 (labeled) | 6 (all six in Track XVI alone) |

New lessons: agents 5, llm 6, sql 6, workflow 4, interview 1, security +3.
Python is net zero (one replacement). Everything else is a modification, not an
addition — so the +25 is fully accounted for.

### 10.2 Grader changes

| Grader | Status | Needed for |
| --- | --- | --- |
| Output check / DebugLab | exists | agent, LLM, every-track challenges |
| DebugLab diagnosis + partial credit | **amend** | §1.4 #1 |
| TS compiler / LivePreview / GitSim / quiz / predict / sort | exists | unchanged |
| Mock LLM endpoint + per-run state | **build** | Track XVII |
| SQL runner + SqlLab | **build** | Track XVIII |
| Rubric grader + RubricLab | **build** | Tracks XIX, written parts of XVI/XX |
| Operation-budget helper | content convention | CX exercises |

### 10.3 Files touched at implementation

- New data: `src/data/track-agents.ts`, `track-llm.ts`, `track-sql.ts`,
  `track-workflow.ts`, `track-interview.ts` (+ `sql-fixtures.ts`,
  `llm-fixtures.ts`).
- New engine: `src/lib/sqlRunner.ts`, `src/components/SqlLab.tsx`,
  `src/components/RubricLab.tsx`.
- Types: `SqlExercise`, `RubricSpec`, `Diagnosis`; `Lesson.sql`,
  `Lesson.rubric`; `DebugChallenge.diagnosis`.
- Edits: `src/lib/runner.ts` (mock LLM + per-run state),
  `src/components/DebugLab.tsx` (diagnosis + `onScore`),
  `src/pages/Lesson.tsx` (record partial scores),
  `src/data/index.ts` (registry), `README.md` (track table, counts),
  `CURRICULUM-ROADMAP.md` (record).
- Tests to add: taxonomy suite (one case per category, mirroring
  `tests/debug-challenges.test.ts`), SQL exercise suite (starter fails /
  reference passes / duplicate-sensitivity), rubric determinism, mock LLM
  fixtures, and a curriculum assertion that every track has ≥1 taxonomy
  challenge and numerals stay unique.
- No Convex/backend changes: scores are already 0..1, XP/badges/certificates
  derive from the existing progress map.

### 10.4 Risks and honest limits

- **LLM exercises are graded against a mock, not a live provider.** This is the
  same trade the API track already makes, and it is what keeps grading
  deterministic. Live BYOK calls remain optional practice.
- **The rubric grader is a weighted checklist, not an LLM judge.** Auto-checked
  criteria are gameable; judgment criteria are self-attested against exemplars.
  Present it as such.
- **Complexity is proven by operation budgets, not asymptotic analysis** — the
  budget is the detection mechanism, and the check still requires correct
  output at scale.
- **Insecure defaults are simulated in instrumented fixtures**; no exercise
  performs a genuinely unsafe operation.
- **Python still does not execute.**
- **The timed capstone is soft** — displayed pressure, not a hard gate,
  consistent with rapid-fire's "speed feeds score, not mastery".

### 10.5 Rollout order

1. Graders + tests: DebugLab amendment, mock LLM, rubric, SQL runner.
2. Track XVI (reuses DebugLab only) — proves the format.
3. Track XVII (needs the mock LLM).
4. Track XVIII (needs the SQL runner).
5. Track XIX (needs the rubric grader).
6. Track XX capstone (depends on all of the above).
7. One content pass for the 15 per-track challenges in §8.5, with the mapping
   table as the checklist.
8. README/roadmap/counts, curriculum assertions, then certificates and XP —
   which are already automatic.
