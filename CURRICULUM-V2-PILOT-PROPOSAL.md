# Curriculum V2.1 — Pilot Status & Execution Proposal

**To:** Project lead
**From:** Curriculum Architect (author of record, V2 / V2.1)
**Date:** 2026-10-02
**Document type:** strategic planning deliverable (plan patch). This document records status and requests authorization; it implements nothing.
**Status of record:** documentation phase complete. **Wave 0 (the Pilot) authorized and shipped** — see §6.
**Source artifacts:** [CURRICULUM-V2.md](./CURRICULUM-V2.md) · [CURRICULUM-V2-PATCH.md](./CURRICULUM-V2-PATCH.md). Section references resolve against these; where they disagree, the patch wins.

---

## 0. Decision requested

Authorization to begin **"walking the map"** — Wave 0 (the Pilot) as scoped in §3 below, under the single dependency reconciliation recorded in §2. Walk step one is the pilot: **partial-credit recording + the diff/click grader + Track XVI end-to-end.** A green light commits Wave 0 and nothing else.

---

## 1. Position of record

The current deliverable is exclusively the plan patch (V2.1) — a strategic planning document. This is a scope statement, not a caveat: the documentation phase is the architectural prerequisite, because every implementation below must start against *verified* integration points rather than assumptions, and because the pilot's value is as a falsifiable experiment — experiments with code already committed are no longer clean measurements.

**Position at authorization time — zero code execution.** Nothing in the repository had been modified for V2 or V2.1; the documentation phase alone was the deliverable. That position has since been superseded by the authorized Wave 0 — see §6 for the execution record. Everything *outside* Wave 0 remains unimplemented: no Pyodide runner, no milestone schema updates, and Fix 2's propagation seeds still deferred.

**Documentation-only footprint.** The pass added `CURRICULUM-V2-PATCH.md` and two pointer edits: the header link in `CURRICULUM-V2.md` and the entry in the README's *Further documentation* section. No source file was touched; there is nothing to typecheck.

**Deferred infrastructure, scheduled.** Every deferred item is assigned a wave in §10.3. Nothing is unscheduled, and nothing waits on an unstated dependency.

### 1.1 What the documentation phase delivered (complete)

- **All 8 fixes** in `CURRICULUM-V2-PATCH.md`, each with: the exact V2 track/lesson it patches, a lesson outline with at least one concrete gradable exercise spec, the grader it requires, and its pilot-or-wait sequencing.
- **The risk designs:** §9.1 tool-churn review dates (`reviewBy` on lessons, dated `toolRefs`), §9.2 the BYOK live-model playground (explicitly non-gating), §9.3 the pilot's scope definition.
- **Fix 7 validated against real, dated sources (§7.1):** Next.js is validated as a framework — State of JS 2025 (13,002 respondents) at 59% usage, 423+ junior-tagged Next.js roles, and explicit new-grad/junior postings naming React/Next.js; explicit "server components" language in *junior* postings is only partial (it concentrates mid/senior). Verdict: conditional module, sequenced last, gated on re-validation in the owner's actual market.
- **Counts:** V2's 20 tracks / 111 lessons → **20 / 119** (or 21 / 122 if Fix 7 validates in). No V2 lesson is deleted.
- **Integration:** linked from `CURRICULUM-V2.md` (pointer header) and `README.md` (*Further documentation*).

### 1.2 Auditable fix map

| Fix | Patches | Grader | Wave |
| --- | --- | --- | --- |
| 1. Python executes | V2 §8.3, §8.5, §10.4 limit | New Pyodide runner | 1 |
| 2. Multi-file diffs | V2 `19.2`, `debug-the-bug`, `16.7`; extends §2 taxonomy | New diff/click grader | **Pilot** |
| 3. Codebase archaeology | New lesson 16.2 | Diff grader (locate mode) | **Pilot** |
| 4. Operating agents | New lessons 16.4–16.6 | Quiz + rubric | **Pilot** |
| 5. Production debugging | `testing` track, 4 → 7 lessons | Locate + sort + quiz | 2 |
| 6. What not to paste | `security`, after V2 §8.2 | Quiz + rubric | 2 |
| 7. Next.js / server components | Conditional new track ⅩⅪ | Diff grader + quiz | 4 — conditional |
| 8. Projects loop | `milestones.ts` + claim log | Rubric + new ProofRunner | 3 |

### 1.3 Verification basis (why the sequencing is load-bearing)

The repo-verified facts the pilot is built on (§0 of the patch):

1. Heavy runtimes already lazy-load behind a dynamic `import()` (`Playground` → `tsRunner`) — Pyodide is an addition, not an architecture rewrite.
2. DebugLab's contract is `{ challenge, onPass }` with a run-clean + output-check pass rule — diff grading is a sibling component, not a DebugLab rewrite.
3. `progress.ts` already stores 0..1 best-per-key scores; only `Lesson.handleScore` discards fractions — this is the one shared engine fix every partial-credit grader depends on.
4. Milestone claims are `v.optional(v.any())` — no schema migration for new artifact fields.
5. The milestone merge rule is pinned by tests — Fix 8's artifacts must not break it.

---

## 2. Architectural reconciliation — §2.5 (seed order)

**Directive as received:** seed multi-file diff content into the **Workflow** track first (`19.2 Reviewing Someone Else's Diff`), then Testing, then any further Agents expansion.

**Conflict:** the pilot ships one diff exercise inside **Track XVI itself** (`16.7` Exercise B — "review the agent's 5-file PR").

**Justification:** a grader cannot be validated by content that ships *after* the pilot track. Track XVI is the validation surface; Workflow `19.2` is Wave 1. Deferring `16.7` would schedule the validation of the grader after the content that consumes it — a dependency inversion that cannot close.

**Compliance:** this is the single deviation. Every other propagation follows the requested seed order exactly:

| Diff exercise seed | Requested order | Actual sequencing | Status |
| --- | --- | --- | --- |
| Workflow `19.2` Exercise B | 1st | Wave 1, first content item | **follows directive** |
| `testing/debug-the-bug` station 3 | 2nd | Wave 1 | **follows directive** |
| Track XVI `16.7` Exercise B | 3rd | **Wave 0 — pilot** | single, justified inversion |

The lead may re-open this reconciliation before authorizing, but without it the pilot's Gate A (§4) cannot be measured.

---

## 3. The Pilot — three technical deliverables

The pilot is Wave 0. It is not "everything at once": it is the minimum set of changes that makes the judgment curriculum *gradable* and *provable*.

**D1 — Partial-credit recording implementation.**
One shared engine change: `Lesson.handleScore` must record fractional scores (0..1) instead of collapsing to pass/fail; completion remains `scoreFor(...) >= 1`, so partial attempts are visible while the lesson stays incomplete until mastery. `progress.ts` already stores 0..1 best-per-key — this is a recording fix, not a format change, and it requires no backend work.
*Done when:* 0.4 / 0.7 attempts persist and render; every downstream grader can call through it.

**D2 — Diff/click grader deployment.**
A new sibling component to DebugLab (not a rewrite): `DiffLab.tsx` + `MultiFile.tsx` viewer + `src/data/diff-challenges.ts`, wired through the existing type → `STEPS` → section integration path. Deterministic, no execution. Extended taxonomy: V2's six codes plus SC / TG / NM / DL. Grading ladder per §2.3: wrong file 0.0 · correct file 0.4 · file + line 0.7 · file + line + category 1.0. Authoring invariants test-pinned: exactly one blocker; ≥2 distractors; ≥1 distractor in the same file as the blocker; planted line in bounds of the after-side.
*Done when:* the diff-challenge suite is green and one seeded exercise validates the format end-to-end (the `16.7` item from §2).

**D3 — Track XVI end-to-end realization.**
The full renumbered track (§4): 16.1 Specs · 16.2 Codebase Archaeology · 16.3 Managing Context · 16.4 Instruction Files · 16.5 Plan Before Code · 16.6 Permissions · 16.7 Verification (with the diff review) · 16.8 When Not to Use an Agent · 16.9 Capstone. This is the pilot's validation surface for both the diff grader's locate mode and the partial-credit path. It entails the **rubric grader** (V2 §6.0) as a build item *inside* this deliverable — Track XVI's written exercises are rubric-graded (§9.3).
*Done when:* every Track XVI exercise is gradable, the capstone requires the partial-credit path, and the track is playable end-to-end.

**Execution constraints checked.** No Convex schema or function change is required by any pilot deliverable — claims remain `v.any()`, and progress scores are already 0..1 and store/sync as-is. Wave 0 is therefore not gated by the workspace deploy-key limitation recorded in the README.

**Out of scope, and staying closed until §4 clears:** the Pyodide runner + executed Python lessons (Wave 1); Fix 2's propagation seeds — Workflow → Testing → further Agents (Wave 1); production debugging 11.5–11.7 (Wave 2); the AI data-boundaries lesson (Wave 2); milestone artifacts + ProofRunner (Wave 3); the Next.js track (Wave 4, conditional). Their designs are frozen in the patch; none ships or is committed to before the pilot reports.

---

## 4. Exit gates and the commitment rule

The pilot is a falsifiable experiment with recorded gates (§10.3, §9.3):

- **Gate A — format validity:** multi-file diff catch rate beats chance, measured from the recorded partial-credit attempts D1 enables.
- **Gate B — track validity:** Track XVI completions are recorded for learners who complete both written exercises.
- **Commitment rule:** if the pilot does not validate, **no other fix is committed to.** Waves 1–4 stay closed. A red pilot is a successful pilot — it stops four waves of investment for the cost of one.

---

## 5. Authorization

Requested: the green light to initiate the Pilot (Wave 0) — D1, then D2, then D3 — under the §2.5 reconciliation.

A green light unlocks only Wave 0. It does not commit the Pyodide wave, the propagation seeds, production debugging, data boundaries, milestones, or the conditional Next.js track. Those remain gated on the §4 results and on the lead's re-review of this record.

**The map is drawn — and Wave 0 has been walked.**

---

## 6. Wave 0 — execution record (shipped)

The green light was given and the pilot is implemented. All three deliverables exist in the repository, verified by typecheck (`bun tsc -b --noEmit`, clean) and the full suite (`bun run test`, 257/257 across 26 files).

**D1 — partial-credit recording.** `Lesson.handleScore` now records any score `> 0`; `progress.ts` already stored 0..1 best-per-key, so fractional attempts (0.4 / 0.5 / 0.7) persist and pay their lesson XP while completion still requires `scoreFor(...) >= 1`. Certificates, badges, track completion and the Learn page's counts are unchanged — all of them already gate on a full score.

**D2 — diff/click grader.** Shipped as designed: `src/components/DiffLab.tsx` + `src/components/MultiFile.tsx` (LCS-based changed-line highlighting, clickable lines) + `src/data/diff-challenges.ts`, with the partial-credit ladder in `src/lib/labGrade.ts`. The extended taxonomy (six executed + SC/TG/NM/DL) lives in `src/data/bug-taxonomy.ts`. One seeded exercise ships: an agent PR adding debounced product search with a planted **RC** (the stale-response guard was dropped in the refactor), three distractors including one in the same file, and a three-tier hint ladder.

**D3 — Track XVI end-to-end.** Nine lessons, in the planned order, registered as the 16th track (`numeral: ⅩⅥ`): Specs · Codebase Archaeology (repo trace over a six-file `shop-api` snapshot) · Managing Context · Instruction Files · Plan Before Code · Permissions · Verifying Agent Output (the diff review, plus a new `parseCSV` debug lab) · When Not to Use an Agent · Capstone (a new two-defect search-queue debug lab + a rubric-graded verification note). The **rubric grader** also shipped — `src/components/Rubric.tsx` over the existing check grammar for auto-checkable criteria, plus self-attested judgment criteria — and DebugLab gained the **diagnosis** input (right diagnosis, unfinished fix → 0.5 recorded).

**Verified invariants** (`tests/lab-graders.test.ts`): every planted line is in bounds of its file; exactly one blocker per exercise; ≥2 distractors with one near the blocker; every rubric is satisfiable by its own exemplar in the check grammar; locate answers are reachable; only executed taxonomy codes appear in DebugLab diagnoses; Track XVI's nine ids ship in order. Track count assertions were updated from 15 → 16 in `tests/curriculum.test.ts`.

**Not touched, still closed:** the Pyodide runner and executed Python lessons (Wave 1), Fix 2's propagation seeds — Workflow `19.2` → `testing/debug-the-bug` → further Agents expansion (Wave 1), production debugging 11.5–11.7 (Wave 2), the AI data-boundaries lesson (Wave 2), milestone artifacts + ProofRunner (Wave 3), the Next.js track (Wave 4, conditional). No Convex schema or function changed.

**Gates still stand.** Gate A (diff catch rate beats chance) and Gate B (Track XVI completions recorded via both written exercises) are now measurable from real attempts; Waves 1–4 remain closed until they clear.
