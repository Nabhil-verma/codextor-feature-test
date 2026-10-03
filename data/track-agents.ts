import type { Track } from "./types";
import { debugChallenge } from "./debug-challenges";
import { diffChallenge } from "./diff-challenges";
import { repoSnapshot } from "./repo-snapshots";

/* ═══════════════════════════════════════════════════════════════
   Track XVI — Working with Coding Agents (V2.1 pilot).

   The track where the learner operates the tool instead of admiring
   it: specs, archaeology, context, instruction files, plan approval,
   permissions, verification, and a capstone that runs the full loop.
   Tool-agnostic by policy — the lessons name artifacts ("a project
   instruction file"), not product UI.
   ═══════════════════════════════════════════════════════════════ */

export const agentsTrack: Track = {
  id: "agents",
  title: "Working with Coding Agents",
  blurb:
    "Operate the tool: write specs an agent can execute, read unfamiliar code, manage context, approve plans, choose permissions, and verify what ships.",
  numeral: "ⅩⅥ",
  lessons: [
    {
      id: "specs-and-prompts",
      title: "Specs and Prompts: From Vague Task to Executable Spec",
      minutes: 12,
      body: `An **executable spec** is a task an agent can finish without asking a single clarification question. It answers four things:

1. **Scope** — what exactly is included and, just as important, what is not.
2. **Acceptance criteria** — measurable statements a reviewer can check.
3. **Non-goals** — the changes that would look correct but are out of scope ("do not touch the billing copy").
4. **Definition of done** — how it gets verified: which test, which command, which observable behaviour.

Vague requests are not malicious — they're underspecified, and the agent fills the gaps with its best guess:

\`\`\`
✗ "make the dashboard faster"

✓ "Reduce the initial dashboard load. Scope: the overview route only.
   Acceptance: LCP under 2.0s on a throttled profile; /api/metrics request
   count must not increase. Non-goals: no visual redesign, no data-model
   changes. Done: the dashboard e2e + LCP budget tests pass."
\`\`\`

Writing the spec is also a design step for *you*: gaps you cannot fill in the spec ("faster than *what*?") are gaps the agent will fill for you — differently every session.`,
      quiz: [
        {
          q: "Which of these is an executable spec?",
          options: [
            "Make the settings page nicer and faster.",
            "Add dark mode to settings: toggle persisted in localStorage, applied through the existing theme hook; acceptance — reload keeps the choice, no flash on load; non-goal — do not restyle other pages.",
            "Improve settings performance (target TBD).",
            "Refactor the settings page for quality.",
          ],
          answer: 1,
          explanation:
            "It names scope, acceptance criteria (persistence, no flash), and a non-goal. The others leave scope and verification to the agent's guess — every session a different guess.",
        },
        {
          q: "Why does a non-goal belong in the spec?",
          options: [
            "To make the prompt longer and more formal",
            "Agents optimize for the goal and may helpfully expand scope; explicit non-goals prevent correct-looking, out-of-scope changes",
            "Because the test suite requires one",
            "To document the team's values",
          ],
          answer: 1,
          explanation:
            "\"While I was there\" changes are the most common scope bug in agent diffs. A non-goal is cheaper than a rejected pull request.",
        },
        {
          q: "Which addition turns \"make it faster\" into something verifiable?",
          options: [
            "A deadline for the work",
            "More implementation detail in the prompt",
            "A measurement, a target or decision rule, and how it is checked",
            "A note that the current performance is bad",
          ],
          answer: 2,
          explanation:
            "Verification needs three things: what is measured, what counts as success, and the check that decides. Without them, \"faster\" is an opinion.",
        },
      ],
      rubric: {
        id: "spec-dashboard",
        title: "Spec the fastest dashboard",
        prompt: "Turn \"make the dashboard faster\" into an executable spec.",
        brief:
          "It must name what is measured, a target or decision rule, at least one non-goal, and a definition of done that includes verification.",
        minWords: 70,
        criteria: [
          {
            id: "nonGoal",
            label: "Names at least one explicit non-goal or out-of-scope change",
            check:
              'output.includes("non-goal") || output.includes("non goal") || output.includes("out of scope")',
          },
          {
            id: "measure",
            label: "Names what is measured (a metric, budget, or profile)",
            check:
              'output.includes("measure") || output.includes("metric") || output.includes("lcp") || output.includes("p95") || output.includes("budget")',
          },
          {
            id: "done",
            label:
              "Definition of done includes verification (a test, command, or observable check)",
            check:
              'output.includes("test") || output.includes("verify") || output.includes("check") || output.includes("pass")',
          },
          {
            id: "target",
            label: "States a target or decision rule for the measurement",
          },
        ],
        exemplar: `Reduce the initial load time of the dashboard overview route.

Measurement: LCP on the existing performance budget test, throttled profile.
Target: LCP at or below 2.0s, and no increase in /api/metrics request count.

Scope: the overview route and the widgets it renders.
Non-goals: no visual redesign, no data-model changes, no other routes.

Definition of done: the dashboard e2e suite passes, the LCP budget assertion is green, and the request-count test is unchanged.`,
      },
    },
    {
      id: "codebase-archaeology",
      title: "Codebase Archaeology: Finding Where Things Live",
      minutes: 14,
      body: `An agent will draw you a confident map of a repo it has never compiled. Someone has to verify that map — in month one, that someone is you.

**Read one request end to end.** Pick a single route and follow it: entry (server/router) → handler → rules/services → data → response. Name each hop and the file it lives in. One traced request teaches you more than an hour of scrolling.

**Hypothesis first, grep second.** Before searching, predict where things live — routes in \`routes/\`, domain rules near services, money math near the model. Then check. Being wrong cheaply is how you build the right mental model.

**Ask scoping questions that have answers:**
- *What else calls this function?* — answerable from the repo, not an opinion.
- *What breaks if I rename this field?* — a blast radius you can compute.
- *Which module owns this invariant?* — a layer question with one honest answer.

These work on the repo and on an agent's answer about the repo. The difference: an agent's answer is a draft. The repo is the source of truth.`,
      repo: repoSnapshot("shop-api"),
      quiz: [
        {
          q: "You have just opened a repo you've never seen; a bug is reported in a path you don't know. What is the strongest first move?",
          options: [
            "Grep for the error string first — search beats reading",
            "Trace one request through the code end to end",
            "Ask an agent to summarize the repository",
            "Read the README and changelog cover to cover",
          ],
          answer: 1,
          explanation:
            "Tracing one real request builds an entry → handler → data model in minutes. Grep tells you where a string appears; a trace tells you how the system works.",
        },
        {
          q: "What makes \"What else calls this function?\" a real question rather than a rhetorical one?",
          options: [
            "It is answerable from the repository itself — call sites are evidence",
            "It is a polite way to say the function is bad",
            "It only applies to public APIs",
            "An agent can answer it faster than a search",
          ],
          answer: 0,
          explanation:
            "Call sites, importers, and type usages are facts in the repo. The same question asked of an agent produces a draft answer that you then verify the same way.",
        },
        {
          q: "A teammate plans to rename Order.total to amountCents. The blast-radius question is:",
          options: [
            "\"Is amountCents a better name?\"",
            "\"How many lines does the rename touch?\"",
            "\"Which files read or construct that field, and must change together?\"",
            "\"Which service owns orders?\"",
          ],
          answer: 2,
          explanation:
            "The blast radius is the set of files whose behaviour depends on the field — including ones a grep might miss because they destructure or pass it along.",
        },
      ],
    },
    {
      id: "managing-context",
      title: "Managing Context: What Goes In, What Stays Out",
      minutes: 11,
      body: `The context window is a budget, and every serious tool treats it as one. What you put in decides what the agent can still hold in mind.

**The minimal context pack.** For a task, include:
- the files that will change and the one or two they depend on,
- the error or failing test, in full, once,
- the decision you already made, so it doesn't relitigate it.

**Summarise, don't paste.** A 600-line log is not context; it is noise with occasional signal. Paste the exception and the three lines around it. When history matters, write the summary yourself — a compaction summary that drops the failing test's name is worse than no summary.

**Context rot is real.** A stale error from forty messages ago gets "fixed" again. When the situation changes, restate it; one clear message beats five corrections scattered through a transcript.

The test: if a new teammate read only your context pack, could they start the task? If yes, it is enough. If no, adding more raw material rarely helps — adding *the right* material does.`,
      quiz: [
        {
          q: "You're asking an agent to fix a failing test. Which context pack is minimal and sufficient?",
          options: [
            "The failing test output, the file under test, and any module it imports directly",
            "The whole repository, so nothing is missed",
            "The last 600 lines of CI logs",
            "The test output plus a one-line summary of every file in the project",
          ],
          answer: 0,
          explanation:
            "The test, the file, and its direct dependencies are the working set. Everything else is noise the agent has to hold — and pay for — while working.",
        },
        {
          q: "An agent's draft compaction summary of a long debugging session drops the name of the failing test. Why is that dangerous?",
          options: [
            "It makes the summary shorter than the limit",
            "The failing test defined the task; without it the agent re-fixes something else, confidently",
            "It's fine — the test can be rediscovered later",
            "It wastes context either way",
          ],
          answer: 1,
          explanation:
            "The failing test is the acceptance criterion. Losing it during compaction silently changes the task, and the agent will do the new, wrong one well.",
        },
        {
          q: "When should you restate the situation instead of adding to the transcript?",
          options: [
            "Never — history is always valuable",
            "Every message, to be safe",
            "When the situation has changed enough that older messages mislead",
            "Only when the model complains",
          ],
          answer: 2,
          explanation:
            "Context rot: stale errors and superseded decisions get acted on. A short, current restatement is worth more than the raw history it replaces.",
        },
      ],
      rubric: {
        id: "compaction-summary",
        title: "Write the compaction summary",
        prompt: "Summarise this debugging session so work can continue after compaction.",
        brief:
          "Keep the failing test name, the reproduction, and the open decision — and drop the raw logs.",
        minWords: 70,
        criteria: [
          {
            id: "failure",
            label: "Names the failing test or the exact failure",
            check: 'output.includes("test") && output.includes("fail")',
          },
          {
            id: "repro",
            label: "Includes the reproduction (the steps that trigger it)",
            check:
              'output.includes("repro") || output.includes("steps") || output.includes("trigger")',
          },
          {
            id: "decision",
            label: "Keeps the open decision or the chosen next step",
            check:
              'output.includes("decision") || output.includes("open question") || output.includes("next")',
          },
          {
            id: "dropLogs",
            label: "Drops the raw logs and keeps only what matters",
          },
        ],
        exemplar: `Failing test: checkout.summary.spec.ts › "renders an empty cart without crashing".

Reproduction: add nothing to the cart, open /checkout. The API now returns { order: null }; orderSummary() assumes an object and throws while reading order.total.

What we know: the failure started with the 14:20 deploy that changed the empty-cart response shape.
Open decision: is an empty cart a valid UI state, or should the API keep returning an empty object?
Next: reproduce on the branch, then fix the read in src/checkout/summary.ts.

Dropped: the 400-line network log and an unrelated flaky-timeout investigation.`,
      },
    },
    {
      id: "instruction-files",
      title: "Project Instruction Files: Teaching an Agent Your Conventions",
      minutes: 12,
      body: `Every agent session starts ignorant of your project. A **project instruction file** (the name differs by tool) is how it inherits the conventions instead of re-learning — or inventing — them each time.

**What belongs in the file:**
- setup, build, and test commands that actually exist,
- directory ownership ("UI components live in src/components; no fetch calls there"),
- style rules with a reason, so they apply to cases the rule didn't name,
- hard boundaries ("never touch migrations without a human reviewer"),
- what a change must include before it is reviewable (a test, a changelog entry).

**What doesn't:**
- one-off task details — those belong in the session prompt,
- aspirational rules nobody enforces ("write clean code"),
- anything that contradicts the actual scripts. A stale command is worse than no command: the agent runs it, it fails, and it "fixes" the project instead of the file.

**Treat the file as code.** It is updated in the same pull request that changes the convention it describes. A rules file that lags the repo is a bug generator.`,
      quiz: [
        {
          q: "\"Build with pnpm; `pnpm test` runs vitest; `pnpm lint` is required before review.\" Where does this line belong?",
          options: [
            "In the project instruction file — a durable build/test convention",
            "In today's session prompt — it's about the current task",
            "Nowhere — the agent can discover it by looking",
            "In the README only",
          ],
          answer: 0,
          explanation:
            "Stable commands and gates are exactly what the instruction file carries; repeating them per session is the cost it removes.",
        },
        {
          q: "\"Today: add a delete button to the orders table.\" Where does that belong?",
          options: [
            "The project instruction file, under Task Notes",
            "The session prompt",
            "Nowhere",
            "A code comment in the orders component",
          ],
          answer: 1,
          explanation:
            "One-off task detail is session context. Written into the rules file it becomes a diary no future session should read.",
        },
        {
          q: "\"We value clean, maintainable code.\" What's wrong with putting this in the instruction file?",
          options: [
            "Nothing — values set the tone",
            "It's aspirational and unenforceable, so it changes no decision and dilutes the rules that do",
            "It's too short to be useful",
            "It should be bolded",
          ],
          answer: 1,
          explanation:
            "Rules earn their place by changing behaviour. 'Be careful' competes for attention with 'never edit migrations without review' — and loses nothing when ignored.",
        },
        {
          q: "A PR adds a new convention and updates the instruction file in the same change. Why does that matter?",
          options: [
            "Reviewers prefer bigger pull requests",
            "The file is code: shipping the convention without it leaves every future session with a stale map",
            "It isn't required, but it is polite",
            "Because the file is auto-generated",
          ],
          answer: 1,
          explanation:
            "A rules file that trails the repo is a bug generator — the next agent inherits a false rule and follows it confidently.",
        },
        {
          q: "\"Renderer caches are stale after a soft reload; clear them before screenshot tests.\" Where does this belong?",
          options: [
            "In the project instruction file — a durable, decision-changing gotcha",
            "In the session prompt every single time",
            "Nowhere — it's a workaround",
            "Only in the test file",
          ],
          answer: 0,
          explanation:
            "It is stable, it changes what an agent does, and otherwise it gets rediscovered painfully every few sessions.",
        },
      ],
      rubric: {
        id: "instruction-file",
        title: "Write the rules file",
        prompt: "Write the project instruction file for this repository.",
        brief:
          "Fact sheet: pnpm + vitest, components in src/components, PR titles are `type: summary`, secrets live in .env and are never committed, and there is one known renderer-cache gotcha. Keep it under ~40 lines.",
        minWords: 60,
        criteria: [
          {
            id: "commands",
            label: "Names the package manager and its real commands",
            check: 'output.includes("pnpm")',
          },
          {
            id: "tests",
            label: "Names the test runner used for verification",
            check: 'output.includes("vitest")',
          },
          {
            id: "secrets",
            label: "States the secrets boundary (.env is never committed)",
            check: 'output.includes(".env")',
          },
          {
            id: "boundaries",
            label: "States hard boundaries as rules, not suggestions",
          },
          {
            id: "budget",
            label: "Fits the budget and leaves one-off task detail out",
          },
        ],
        exemplar: `# Project rules

## Commands
- Install and build with pnpm.
- Tests: \`pnpm test\` (vitest). A change is not reviewable without a test that fails first.
- Lint: \`pnpm lint\` must pass before review.

## Layout
- React components live in \`src/components\`. No data fetching in that folder.
- Shared utilities live in \`src/lib\` and are imported, never duplicated.

## Conventions
- PR titles: \`type: summary\` (feat, fix, chore, docs).
- New behaviour ships with a test in the same PR.

## Boundaries
- Never commit secrets. \`.env\` stays local; \`.env.example\` is the committed contract.
- Never edit migrations or CI configuration without a human reviewer.

## Gotcha
- Renderer caches survive a soft reload. Clear them before screenshot tests, or the diff is a lie.`,
      },
    },
    {
      id: "plan-before-code",
      title: "Plan Before Code: The Cheapest Place to Catch a Misunderstanding",
      minutes: 11,
      body: `The approval loop is: task → agent plan → **you read the plan** → approve or correct. It is the highest-leverage review in the whole workflow, because rejecting a plan costs a message while rejecting a diff costs a rewrite, a review cycle, and a broken build.

**Read the plan for three things:**
1. **Missing steps** — the plan updates one query but never audits the others that read the same data.
2. **Wrong files** — the change lands in the page component when the rule belongs in the service.
3. **Out-of-scope intent** — "while I'm here" refactors, silent migrations, and destructive cleanup nobody asked for.

**What plans lie about:**
- \`"run the tests"\` without naming which tests, or what they must prove,
- a \`"cleanup\"\` step that deletes rows a reversible feature should keep,
- \`"update queries"\` singular, when the codebase has six read paths.

A plan is a proposal about *what the change is*, not a formality before it. If you can't find a flaw in a plan for a non-trivial change, you probably haven't read it yet.`,
      quiz: [
        {
          q: "Plan step: \"Add a deletedAt column and an index on it.\"",
          options: [
            "Approve as written",
            "Revise — EC (a path or case is missing)",
            "Revise — SC (out of scope / destructive intent)",
            "Revise — TG (the verification is vacuous)",
          ],
          answer: 0,
          explanation:
            "The column plus its index is exactly what a soft delete needs first; the read filters depend on it.",
        },
        {
          q: "Plan step: \"Update listProjects to filter out deleted rows.\"",
          options: [
            "Approve as written",
            "Revise — EC (a path or case is missing)",
            "Revise — SC (out of scope / destructive intent)",
            "Revise — TG (the verification is vacuous)",
          ],
          answer: 1,
          explanation:
            "Soft delete means every read path must filter. The plan names one query and never audits the others — deleted projects keep leaking through dashboards, exports, and admin views.",
        },
        {
          q: "Plan step: \"Delete the related project_members rows for the project.\"",
          options: [
            "Approve as written",
            "Revise — EC (a path or case is missing)",
            "Revise — SC (out of scope / destructive intent)",
            "Revise — TG (the verification is vacuous)",
          ],
          answer: 2,
          explanation:
            "Soft delete is reversible by definition. Dropping membership rows is a destructive behaviour change nobody asked for — the classic out-of-scope step found at plan time for the price of a message.",
        },
        {
          q: "Plan step: \"Update the projects page so deleted projects disappear from the list.\"",
          options: [
            "Approve as written",
            "Revise — EC (a path or case is missing)",
            "Revise — SC (out of scope / destructive intent)",
            "Revise — TG (the verification is vacuous)",
          ],
          answer: 0,
          explanation:
            "In scope and correctly placed: the UI reflects the filter rather than reimplementing the rule.",
        },
        {
          q: "Plan step: \"Backfill: mark existing archived projects with deletedAt.\"",
          options: [
            "Approve as written",
            "Revise — EC (a path or case is missing)",
            "Revise — SC (out of scope / destructive intent)",
            "Revise — TG (the verification is vacuous)",
          ],
          answer: 0,
          explanation:
            "A data migration that keeps the old archived state consistent is part of shipping the feature, not scope creep — and it is additive, not destructive.",
        },
        {
          q: "The plan's verification reads: \"run the tests.\" Approve or revise, and why?",
          options: [
            "Approve — which tests can be decided later",
            "Revise — name the specific tests and the failing-first reproduction",
            "Revise — tests are unnecessary for a soft delete",
            "Approve — the CI pipeline will run something",
          ],
          answer: 1,
          explanation:
            "A verification step that names nothing cannot fail. The plan should say which test proves soft delete works and which test proves the rows survive a restore.",
        },
      ],
    },
    {
      id: "permissions-and-sandbox",
      title: "Permissions & Sandbox Settings: Least Privilege for an Unattended Tool",
      minutes: 12,
      body: `Agents run with capabilities, and every capability has a blast radius. Choosing them is a session decision, not a preference:

- **Read** — inspect files and history. Almost always safe; this is where investigation and review live.
- **Write** — edit the working tree. Safe when bounded to a branch; never point it at a shared or protected branch unattended.
- **Execute** — run commands and tests. Necessary for "make the tests pass"; risky when the project can deploy or migrate by accident.
- **Network** — fetch dependencies and call APIs. Grant it when the task genuinely needs it, because it is also how data leaves the machine.

**Least privilege is the default.** Start read-only for investigation and review, add write for a bounded feature branch, add execute when the task is "make it pass". Expand deliberately — one session, one reason.

**Always human:** deploys, destructive commands, credential operations, anything touching production data. A capability that can do those unattended is not a convenience; it is an incident waiting for a typo.

Ask before granting anything: *if this goes wrong at 2am, what is the worst thing it can have done?* Grant only the level whose answer you can live with.`,
      quiz: [
        {
          q: "Task: \"Explain how billing rounds prices.\" Minimal permission profile?",
          options: [
            "Read-only",
            "Read + write (bounded branch)",
            "Read + write + execute",
            "Do not delegate — needs a human",
          ],
          answer: 0,
          explanation:
            "Investigation is the read-only case: no writes, no commands, nothing to undo.",
        },
        {
          q: "Task: \"Upgrade the router to v7 and fix the fallout.\" Minimal profile?",
          options: [
            "Read-only",
            "Read + write (bounded branch)",
            "Read + write + execute",
            "Do not delegate — needs a human",
          ],
          answer: 2,
          explanation:
            "It has to edit and run the suite to fix the fallout — but on a branch, not a protected one. Execute is what lets it verify its own work.",
        },
        {
          q: "Task: \"Run the migration suite against the staging database.\" Minimal profile?",
          options: [
            "Read-only",
            "Read + write (bounded branch)",
            "Read + write + execute",
            "Do not delegate — needs a human",
          ],
          answer: 3,
          explanation:
            "Migrations against shared infrastructure are exactly the 'always human' list: irreversible, shared, and not yours to spend.",
        },
        {
          q: "Task: \"Rename an internal utility across the repository.\" Minimal profile?",
          options: [
            "Read-only",
            "Read + write (bounded branch)",
            "Read + write + execute",
            "Do not delegate — needs a human",
          ],
          answer: 1,
          explanation:
            "Mechanical and compiler-verified: it needs writes, not the ability to run arbitrary commands or reach the network.",
        },
        {
          q: "Task: \"Trace a production stack trace to the file that owns the failing function.\" Minimal profile?",
          options: [
            "Read-only",
            "Read + write (bounded branch)",
            "Read + write + execute",
            "Do not delegate — needs a human",
          ],
          answer: 0,
          explanation:
            "Tracing is reading. Nothing about locating the owner of a function requires the ability to change or run anything.",
        },
        {
          q: "Task: \"Fix the failing tests in the module you are working on.\" Minimal profile?",
          options: [
            "Read-only",
            "Read + write (bounded branch)",
            "Read + write + execute",
            "Do not delegate — needs a human",
          ],
          answer: 2,
          explanation:
            "'Fix the failing tests' means run, read, edit, run again. Execute is the capability that closes that loop — on your branch.",
        },
        {
          q: "Task: \"Issue a refund from the payments dashboard.\" Minimal profile?",
          options: [
            "Read-only",
            "Read + write (bounded branch)",
            "Read + write + execute",
            "Do not delegate — needs a human",
          ],
          answer: 3,
          explanation:
            "Money out the door is a human operation. No permission profile makes an unattended refund acceptable.",
        },
        {
          q: "Task: \"Update the README install steps.\" Minimal profile?",
          options: [
            "Read-only",
            "Read + write (bounded branch)",
            "Read + write + execute",
            "Do not delegate — needs a human",
          ],
          answer: 1,
          explanation:
            "A documentation edit needs writes and nothing else — no commands, no network.",
        },
      ],
    },
    {
      id: "verifying-agent-output",
      title: "Verifying Agent Output: Tests Are the Review You Can't Skip",
      minutes: 13,
      body: `"Tested locally" is a claim, not evidence. Agent output is a **draft**, and the review you cannot skip is the one a machine performs: a test that fails on the draft and passes on the fix.

**The verification loop:**
1. **Read the diff first** — the whole change, not the summary the agent wrote about it.
2. **Ask what evidence would prove it** — a test, a type check, a query plan, a benchmark.
3. **Write or request that evidence before accepting** — a test that already passes proves nothing.
4. **Run it against the draft** — if it passes immediately, your test is wrong.

**What blocks a merge, even when the code is correct:**
- a change that touches files the task never mentioned (scope),
- a "test" that asserts nothing (verification theatre),
- a name or comment that now describes the old behaviour,
- leftover debug output — a nit, unless it leaks data or bypasses a guard.

That is the same taxonomy you have been practising all along. The only difference in review is that the defect sits inside a multi-file surface, and finding the line is part of the job.`,
      debug: debugChallenge("csv-quoted-fields"),
      diff: diffChallenge("agent-pr-search-race"),
      quiz: [
        {
          q: "An agent's pull request says \"tested locally\". What has been proven?",
          options: [
            "The change works — the agent ran it",
            "Nothing yet: until you can see the test, and it fails on the draft, it is a claim about a session you cannot observe",
            "The change is safe to merge",
            "That a test exists somewhere in the branch",
          ],
          answer: 1,
          explanation:
            "You cannot review a session you did not see. The artefact is the test: it must exist, and it must fail on the draft before the fix.",
        },
        {
          q: "The agent's PR is functionally correct, but it also reformats three unrelated files. What do you do?",
          options: [
            "Approve — the code is correct, and formatting is harmless",
            "Block — unrelated changes hide the real diff and should be split out before review",
            "Block only if a test fails",
            "Approve and fix the formatting yourself",
          ],
          answer: 1,
          explanation:
            "Scope is not a bug in the code, it is a bug in the change: an unreviewable diff is how a real defect gets approved by accident.",
        },
        {
          q: "A test was added that asserts only \`expect(result).toBeDefined()\`. What is wrong with it?",
          options: [
            "Nothing — it is a smoke test",
            "It cannot fail for the reason it claims to guard, so it proves nothing about behaviour",
            "It is too slow",
            "It should use toBeTruthy instead",
          ],
          answer: 1,
          explanation:
            "An assertion that the wrong implementation also satisfies is theatre. The test must fail on the broken behaviour — otherwise it certifies nothing.",
        },
      ],
    },
    {
      id: "when-not-to-use-agents",
      title: "Knowing When Not to Use an Agent",
      minutes: 10,
      body: `Agents are reliable where the task is **verifiable and mechanical**, and unreliable where the task is **novel or judgment-bound**. Classifying the task is the skill.

- **Delegate** — boilerplate with a known shape (a CRUD endpoint, test scaffolding), and mechanical renames the compiler checks for you.
- **Delegate with tests** — trusted work whose failure modes matter: auth checks, dependency upgrades, performance work with a budget. The tests are the contract, not ceremony.
- **Keep it human** — novel algorithms, decisions with irreversible blast radius, and anything that is not yet a verifiable request. "Make it feel snappier" is a wish, not a task: spec it first, then decide.

The signals: *Can I state the acceptance criterion as something a machine can check? Is the shape of the solution known in advance? If it goes wrong, what is the worst it can have done?* Two yeses and a survivable worst case means delegate. Otherwise the cost of correcting it exceeds the cost of doing it.`,
      quiz: [
        {
          q: "Task: a boilerplate CRUD endpoint for a new resource.",
          options: [
            "Delegate",
            "Delegate — with tests that pin the behaviour",
            "Keep it human",
          ],
          answer: 0,
          explanation:
            "A known shape, a known pattern, and mistakes are visible immediately. This is the canonical delegate case.",
        },
        {
          q: "Task: a novel consensus algorithm for a distributed lock.",
          options: [
            "Delegate",
            "Delegate — with tests that pin the behaviour",
            "Keep it human",
          ],
          answer: 2,
          explanation:
            "Novel algorithms have no correct pattern to imitate and subtle invariants that tests are hard to write for. This is design work, not boilerplate.",
        },
        {
          q: "Task: rename a function across 200 files.",
          options: [
            "Delegate",
            "Delegate — with tests that pin the behaviour",
            "Keep it human",
          ],
          answer: 0,
          explanation:
            "Mechanical and compiler-verified: the type checker finds every miss. No judgment to review, so no tests needed.",
        },
        {
          q: "Task: cut a hot loop's cost to fit an existing performance budget.",
          options: [
            "Delegate",
            "Delegate — with tests that pin the behaviour",
            "Keep it human",
          ],
          answer: 1,
          explanation:
            "Viable to delegate, but only with the benchmark as the acceptance criterion — otherwise 'faster' is unverifiable and easy to fake.",
        },
        {
          q: "Task: add an authorization check to a new admin route.",
          options: [
            "Delegate",
            "Delegate — with tests that pin the behaviour",
            "Keep it human",
          ],
          answer: 1,
          explanation:
            "Security-sensitive work is delegate-able when a test proves the denied case, not just the allowed one. The failure mode is silent, so the evidence matters more than the speed.",
        },
        {
          q: "Task: write the test scaffolding for a module.",
          options: [
            "Delegate",
            "Delegate — with tests that pin the behaviour",
            "Keep it human",
          ],
          answer: 0,
          explanation:
            "Scaffolding is shape work — the runner, the fixtures, the naming — and you review the assertions as you use them.",
        },
        {
          q: "Task: a major dependency upgrade with breaking changes.",
          options: [
            "Delegate",
            "Delegate — with tests that pin the behaviour",
            "Keep it human",
          ],
          answer: 1,
          explanation:
            "Broad and mechanical, but every break is a behaviour change: delegate only with the existing suite as the contract.",
        },
        {
          q: "Task: make the app feel snappier.",
          options: [
            "Delegate",
            "Delegate — with tests that pin the behaviour",
            "Keep it human",
          ],
          answer: 2,
          explanation:
            "It is not a task yet — there is no measurement and no definition of done. Spec it first; the classification follows from the spec.",
        },
      ],
    },
    {
      id: "capstone-agent-loop",
      title: "Capstone: Run the Full Agent Loop",
      minutes: 22,
      body: `Everything in this track, in one loop:

**spec → context → draft → verify → fix → proof.**

Below is an agent-drafted debounced search queue with **two** planted defects. Your job is the whole loop, not the repair:

1. **Spec it.** Write the acceptance criteria you are holding the draft to (one line each).
2. **Trace the draft.** Which line breaks them? Name the taxonomy category.
3. **Repair it.** Make the program behave — both defects, not the loudest one.
4. **Prove it.** Write the verification note: what was wrong, which test or observable behaviour proves the fix, and what a reviewer should check.

A defect you find but cannot explain is a defect you will ship again next month. The note is the part that makes the fix yours.`,
      debug: debugChallenge("debounced-search-queue"),
      rubric: {
        id: "capstone-note",
        title: "The verification note",
        prompt: "Write the note a reviewer would need in order to trust this fix.",
        brief:
          "Name both defects and their taxonomy categories, the test or observable behaviour that proves the fix, and the spec you held the draft to.",
        minWords: 80,
        criteria: [
          {
            id: "race",
            label: "Names the stale-response race (or out-of-order results) as a concurrency bug",
            check:
              'output.includes("race") || output.includes("stale") || output.includes("out of order")',
          },
          {
            id: "empty",
            label: "Names the empty-query defect",
            check:
              'output.includes("empty") || output.includes("blank") || output.includes("no query")',
          },
          {
            id: "proof",
            label: "States the test or observable behaviour that proves the fix",
            check:
              'output.includes("test") || output.includes("applied:") || output.includes("proves") || output.includes("proof")',
          },
          {
            id: "spec",
            label: "Names the acceptance criteria the draft was verified against",
          },
          {
            id: "reviewer",
            label: "Tells the reviewer which line or behaviour to check",
          },
        ],
        exemplar: `Two defects in the drafted search queue.

1. Race condition (RC): the response handler applied results without checking whether the request was still the newest one. Searches for "a" and "alp" were both in flight, and "a" resolved *after* "alp", so the stale results won. Fix: stamp each request with an id and ignore any response that is not the latest.

2. Edge case (EC): the queue fired a request for the empty string. An empty query has no results and never should have become a request. Fix: return early when the query is falsy.

Spec it was verified against: (a) only the newest query's results are ever applied, in any resolution order; (b) an empty query produces no request at all.

Proof: with the fix, the request log shows only "a" and "alp", the final applied value is "alp-result", and the guard skips the late "a" response. A reviewer should check the guard line and the early return, then watch the request log — the running program is the evidence.`,
      },
      quiz: [
        {
          q: "What is the full agent loop this capstone runs?",
          options: [
            "Prompt → paste → accept → ship",
            "Spec → context → draft → verify → fix → proof",
            "Draft → commit → review → revert",
            "Spec → draft → merge",
          ],
          answer: 1,
          explanation:
            "The loop ends in proof, not in a merge: the note and the test are what turn a plausible draft into a reviewed change.",
        },
        {
          q: "Why write the verification note when the bug is already fixed?",
          options: [
            "To satisfy a process requirement",
            "Because writing the cause down is how you find out whether you actually understood it — an unexplained fix ships again",
            "Because a reviewer cannot read the diff",
            "To increase the pull request size",
          ],
          answer: 1,
          explanation:
            "The note is the explanation test. If you cannot say which category the defect belongs to and what proves the fix, you fixed a symptom.",
        },
        {
          q: "The draft fires a request for an empty query. Which taxonomy category is that?",
          options: [
            "RC — race condition",
            "EC — missing or mishandled edge case",
            "SL — silently wrong logic",
            "CX — bad complexity",
          ],
          answer: 1,
          explanation:
            "The empty string is the classic unhandled input: nothing crashes, the code just does work it should never have started.",
        },
      ],
    },
  ],
};
