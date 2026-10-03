import type { Track } from "./types";
import { diffChallenge } from "./diff-challenges";

/* ═══════════════════════════════════════════════════════════════
   Track XIX — Professional Workflow (V2 §6, seeded by V2.1 Fix 2).

   The seed order was Workflow → Testing → further Agents expansion:
   the diff/click grader was validated inside Track XVI (the pilot's
   own validation surface), and this is the first *propagated* consumer.
   The review here is a retry-with-backoff PR whose planted defect is
   silently wrong logic — a 400 retried like a 503.
   ═══════════════════════════════════════════════════════════════ */

export const workflowTrack: Track = {
  id: "workflow",
  title: "Professional Workflow",
  blurb:
    "PRs, review, tickets and decision records — the written work that decides whether code ships.",
  numeral: "ⅩⅨ",
  lessons: [
    {
      id: "pull-requests",
      title: "Pull Requests: Intent and Tradeoffs",
      minutes: 12,
      rubric: {
        id: "pr-description",
        title: "Write the PR description",
        prompt: "Write the description for the diff below.",
        brief:
          "The diff adds a `deletedAt` soft-delete to projects and updates two queries. The linked issue asks only for the API change. One rejected alternative is recorded: a hard delete with a backup table.",
        minWords: 60,
        criteria: [
          {
            id: "intent",
            label: "States why the change is needed, not just what it does",
            check: "output.includes('soft') || output.includes('recover')",
            weight: 2,
          },
          {
            id: "migration",
            label: "Names the migration and its reversibility",
            check: "output.includes('migration') || output.includes('deletedat')",
            weight: 2,
          },
          {
            id: "alternative",
            label: "Records the rejected alternative and why",
            check:
              "output.includes('hard delete') || output.includes('alternative') || output.includes('instead')",
            weight: 1,
          },
          {
            id: "out-of-scope",
            label: "Says explicitly what is not included",
            check:
              "output.includes('not included') || output.includes('out of scope') || output.includes('does not')",
            weight: 1,
          },
          {
            id: "test-plan",
            label: "Includes a test plan someone else can run",
            check: "output.includes('test') || output.includes('verify')",
            weight: 2,
          },
          {
            id: "why-first",
            label: "Opens with intent and tradeoff before the file list",
            weight: 1,
          },
        ],
        exemplar: `## Why
Projects are hard-deleted today, so a mis-click is unrecoverable and support has no way back. This adds a soft delete so the data survives an accidental removal; hard deletion stays possible via the admin job, which is why the column is nullable rather than required.

## What changed
- \`projects.deletedAt\` column plus a migration that backfills existing rows with NULL (reversible: dropping the column restores the old shape).
- The two list queries now filter \`deletedAt IS NULL\`.

## Alternative considered
A hard delete with a nightly backup table was rejected: it makes recovery an operator task with a restore window, and support cannot answer "can we get it back?" without escalation.

## Not included
The admin restore endpoint, the UI affordance, and the audit log entry — those follow in separate PRs so this one stays reviewable.

## Test plan
Run the migration on a copy of staging, delete a project, confirm it disappears from the list and still exists in the table with \`deletedAt\` set.`,
      },
      body: `A pull request is a **request to change someone's mental model**, not a changelog. The description is where the reviewer learns what you were trying to do — and what you decided *not* to do.

**What belongs in the description:**

| Section | Answers | Why it matters |
| --- | --- | --- |
| Why | the problem, and why now | a reviewer who knows the *why* can catch a wrong approach; without it they can only check syntax |
| What | the shape of the change | a map, not a file list — the diff is already the file list |
| Alternative | the road you did not take, and why | it stops the same conversation in review, and it is the part future-you will forget |
| Not included | the boundary | "out of scope" is the most-read section on a big PR |
| Test plan | how to convince yourself | a reviewer should never have to invent one |

**The two failure modes:**

- **A description that restates the diff.** "Added a column, updated two queries." The reviewer can read code; what they cannot read is your intent.
- **A description that overclaims.** "Fixes all timezone bugs." Now every reviewer looks for the counter-example, and one of them finds it.

**The tradeoff sentence.** Almost every PR contains one, and it is the most valuable line in the description: *"I chose X over Y because Z, accepting the cost of W."* Reviewers cannot evaluate a decision that was never stated, and a decision record with a named cost is what separates a senior PR from a large one.

**Why this is graded against a diff you cannot see the internals of:** in real review you are handed a change and a ticket, not a tutorial. The rubric checks whether your description would let a reviewer who has never seen this code make a decision.`,
      quiz: [
        {
          q: "A reviewer's first question is usually…",
          options: [
            "\"Does this compile?\"",
            "\"What is this trying to do, and is that the right thing?\"",
            "\"How many lines changed?\"",
            "\"Who wrote it?\"",
          ],
          answer: 1,
          explanation:
            "Intent comes before mechanics. A description that never states intent forces the reviewer to reverse-engineer it from the diff — which is where wrong approaches survive review.",
        },
        {
          q: "\"Fixes all timezone bugs\" is a bad PR claim because…",
          options: [
            "It is too short",
            "It invites a counter-example the author has not checked for, and reviewers will find one",
            "Timezones are not a real problem",
            "Claims belong in the issue, not the PR",
          ],
          answer: 1,
          explanation:
            "An unbounded claim moves the reviewer's job from verifying a change to disproving a boast. Scope the claim to what the tests actually cover.",
        },
        {
          q: "Why state a rejected alternative?",
          options: [
            "To show effort",
            "Because the same alternative is what a reviewer would suggest, and the reason it was rejected is not visible in the diff",
            "It is required by most teams",
            "To lengthen the description",
          ],
          answer: 1,
          explanation:
            "The diff can only show what was chosen. Without the alternative and its cost, review re-litigates a decision that was already made.",
        },
        {
          q: "The most-read section of a large PR description is usually…",
          options: ["The title", "The test plan", "\"Not included\" / out of scope", "The file list"],
          answer: 2,
          explanation:
            "Reviewers use the boundary to decide what they can skip. Omitting it is how a PR ends up with a hundred comments about things it never intended to touch.",
        },
      ],
    },
    {
      id: "reviewing-diffs",
      title: "Reviewing Someone Else's Diff",
      minutes: 14,
      body: `Review is a **filter with a stated bar**, not a taste contest. The work is to separate three categories, and to say which is which:

1. **Blocking** — this must change before merge. A correctness bug, a security hole, a broken invariant.
2. **Non-blocking** — worth saying, will not hold the PR. Style, naming, a simplification the author can take or leave.
3. **Question** — you do not know yet, and the answer decides the category.

**The failure mode this lesson targets:** treating every observation as blocking. A reviewer who blocks on a stray log line while missing a retry that multiplies bad requests has inverted the bar, and the author learns to argue about the log.

**The review habit that catches real defects:** read for *behaviour under adverse conditions*, not for style. Ask what happens when the network is slow, the input is empty, the response is an error, or two requests overlap. Agent-written code is especially good at looking resilient while doing the wrong thing on the error path — it has read every retry tutorial and none of the incident reports.

**The comment worth writing** names three things: the line, the scenario that breaks, and the fix you would accept. "This looks wrong" is not reviewable; "this retries a 400, so a malformed request becomes five malformed requests — only retry 5xx" is.`,
      diff: diffChallenge("upload-retry-blocks-400"),
      quiz: [
        {
          q: "A teammate's PR has a `console.log` in a hot loop and an unchecked `res.ok`. Which is blocking?",
          options: [
            "The log — it runs on every request",
            "The unchecked `res.ok` — an error body becomes data",
            "Both",
            "Neither; both are style",
          ],
          answer: 1,
          explanation:
            "The log costs throughput; the unchecked response produces wrong behaviour. Blocking means *must change before merge*, and correctness outranks noise.",
        },
        {
          q: "The best review comment includes…",
          options: [
            "A judgement: \"this is wrong\"",
            "The line, the scenario that breaks, and the fix you would accept",
            "A link to a style guide",
            "A request to add tests",
          ],
          answer: 1,
          explanation:
            "A scenario is falsifiable and a fix is actionable. Without both, the author has to guess what you meant — which is how a review thread becomes an argument.",
        },
        {
          q: "You are unsure whether a change is correct. The right review move is…",
          options: [
            "Approve — you can fix it later",
            "Block — uncertainty is a blocker",
            "Ask a question that names the case you cannot reason about",
            "Ignore it",
          ],
          answer: 2,
          explanation:
            "A question is a category, not a failure to decide. It tells the author exactly which case to explain, and the answer decides blocking vs not.",
        },
        {
          q: "A diff renames a variable across 40 files that the task never mentioned. That is…",
          options: [
            "Fine — renames are mechanical",
            "Scope creep: it hides the real change and should be its own PR",
            "A blocking bug",
            "A question",
          ],
          answer: 1,
          explanation:
            "Review is of *this* change. An unrelated rename buries the diff that matters, and it is the single most common way an agent's PR becomes unreviewable.",
        },
        {
          q: "Why does this lesson use a retry PR as the planted defect?",
          options: [
            "Retries are rarely used",
            "Because it looks like resilience while behaving as an availability bug — the defect is on the error path, where reading for style never looks",
            "Because retries are hard to write",
            "Because tests cannot cover retries",
          ],
          answer: 1,
          explanation:
            "Retrying a 400 turns one bad request into five. The code reads as more robust than what it replaced, which is exactly the class of agent defect that survives a style-only review.",
        },
      ],
    },
    {
      id: "vague-request-ticket",
      title: "Turning a Vague Request into a Ticket",
      minutes: 12,
      rubric: {
        id: "ticket-scoping",
        title: "Scope the request into a ticket",
        prompt: "Write the ticket.",
        brief:
          "Input: a stakeholder message — \"the dashboard feels slow, especially in the morning\" — plus p95 data (2.4 s in the morning window, 0.9 s otherwise) and two complaint quotes. One quote is about a different page.",
        minWords: 60,
        criteria: [
          {
            id: "measurable",
            label: "States a measurable target (a number and a percentile)",
            check: "output.includes('p95') || output.includes('95th')",
            weight: 2,
          },
          {
            id: "window",
            label: "Names when it is slow, using the data",
            check: "output.includes('morning') || output.includes('window')",
            weight: 2,
          },
          {
            id: "scope-boundary",
            label: "Marks the out-of-scope complaint explicitly",
            check:
              "output.includes('out of scope') || output.includes('separate') || output.includes('not this')",
            weight: 2,
          },
          {
            id: "unknowns",
            label: "Lists what is still unknown and how it will be found",
            check: "output.includes('unknown') || output.includes('investigate') || output.includes('measure')",
            weight: 1,
          },
          {
            id: "verify",
            label: "Says how the fix will be verified",
            check: "output.includes('verif') || output.includes('check') || output.includes('confirm')",
            weight: 2,
          },
          {
            id: "no-vibes",
            label: "Contains no unmeasurable adjective (\"snappy\", \"feels\")",
            weight: 1,
          },
        ],
        exemplar: `## Problem
Dashboard p95 is 2.4 s between 08:00 and 10:00, against 0.9 s for the rest of the day. Two complaints reference the morning window.

## Target
Bring p95 in the 08:00–10:00 window under 1.2 s — a 50% cut, and within 300 ms of the all-day p95, so the window stops being a separate experience.

## In scope
The dashboard route and the queries it runs on first load.

## Out of scope
The second complaint is about the reports page, which does not share this route's queries — separate ticket, linked here so it is not lost.

## Unknowns
Whether the slowdown is query time or queueing (the window overlaps the nightly job). Investigate by comparing server-side query durations against client-observed load time in that window before choosing a fix.

## Verification
Re-measure p95 in the same window after the change, on the same traffic, before closing.`,
      },
      body: `Stakeholder requests arrive as **symptoms**. A ticket is the translation into a problem that can be finished and checked.

**The four moves:**

1. **Make the symptom measurable.** "Feels slow" becomes a percentile and a threshold. Without a number, the ticket cannot close — every fix is arguable, and the same complaint returns next month.
2. **Use the data to bound the scope.** If p95 is 2.4 s in one window and 0.9 s otherwise, that window is the ticket. "Make the dashboard faster" is unbounded and will absorb a quarter.
3. **Separate the second complaint.** A vague report usually contains two problems from two people about two pages. Naming the one you are *not* fixing — and linking it — is how you keep the ticket reviewable without dropping the other issue.
4. **State the unknowns and the verification.** The unknowns are what the investigation must answer; the verification is what proves the ticket is done. Both belong in the ticket, not in the author's head.

**The unmeasurable-adjective test.** Read your ticket and underline every word that a reader could disagree with while agreeing with the facts. "Snappy", "feels", "should be fine" — each one is a decision deferred to the end, where it is most expensive.`,
      quiz: [
        {
          q: "A stakeholder says \"the dashboard feels slow\". The first ticket-writing move is…",
          options: [
            "Estimate the work",
            "Find a measurement that distinguishes the problem from normal: a percentile, a window, a threshold",
            "Assign an engineer",
            "Ask which page they mean",
          ],
          answer: 1,
          explanation:
            "Without a measurement the ticket has no definition of done, so it cannot be verified or closed — only abandoned.",
        },
        {
          q: "An AI-drafted ticket says: \"Improve dashboard performance so it should be snappy for users.\" What do you change?",
          options: [
            "Nothing — the intent is clear",
            "Replace \"snappy\" with a target p95 and a verification step; the adjective is an unfalsifiable criterion",
            "Add more adjectives",
            "Split it into two tickets",
          ],
          answer: 1,
          explanation:
            "\"Snappy\" is a decision the ticket refuses to make. A p95 target with a re-measurement step is the same intent, made checkable.",
        },
        {
          q: "Two complaints arrive about two different pages. The right move is…",
          options: [
            "One ticket covering both, since they came together",
            "Scope this ticket to one, name the other explicitly as out of scope, and link it",
            "Ignore the second",
            "Ask the stakeholder to pick",
          ],
          answer: 1,
          explanation:
            "One ticket, one problem, one verification. Naming the out-of-scope item keeps it visible without making this ticket unreviewable.",
        },
        {
          q: "Why record the unknowns in the ticket?",
          options: [
            "To look thorough",
            "Because they are the investigation's job list, and the fix cannot be chosen before they are answered",
            "It is required for estimation",
            "To delay the work",
          ],
          answer: 1,
          explanation:
            "Choosing a fix before knowing whether the cost is query time or queueing is guessing. The unknowns make the next step explicit.",
        },
      ],
    },
    {
      id: "decision-records",
      title: "Explaining Your Decisions in Writing",
      minutes: 11,
      rubric: {
        id: "decision-record",
        title: "Write the decision record",
        prompt: "Write the decision record for a change you shipped.",
        brief:
          "Use the capstone from the agents track, or a real change of your own. The record is for the engineer who inherits this in six months and wants to know why it is the way it is.",
        minWords: 50,
        criteria: [
          {
            id: "decision",
            label: "States the decision in one sentence",
            check: "output.includes('decided') || output.includes('decision')",
            weight: 2,
          },
          {
            id: "alternative",
            label: "Names at least one rejected alternative with a reason",
            check: "output.includes('instead') || output.includes('alternative') || output.includes('rejected')",
            weight: 2,
          },
          {
            id: "tradeoff",
            label: "Names a cost you accepted",
            check: "output.includes('cost') || output.includes('tradeoff') || output.includes('slower')",
            weight: 2,
          },
          {
            id: "revisit",
            label: "States the condition that would change the decision",
            check:
              "output.includes('revisit') || output.includes('if we') || output.includes('when') || output.includes('would change')",
            weight: 2,
          },
          {
            id: "no-hedging",
            label: "Does not hedge the decision itself (\"we sort of\", \"probably\")",
            weight: 1,
          },
        ],
        exemplar: `We decided to validate agent output with a test that fails on the draft rather than reviewing the diff by eye.

We rejected a review-only process because the failure we kept seeing was silent — code that reads correctly and behaves incorrectly on an edge case — and eye review caught it roughly never in our own practice.

The cost we accepted is slower turnaround: writing the failing test first adds minutes per change, and for genuinely trivial edits it is pure overhead.

We would revisit this if the team moved to a workflow where every change is generated with tests attached by default, which would remove the manual step.`,
      },
      body: `A decision record is not documentation of *what* the code does — the code already does that. It records **why it is this way and not the other way**, which is the part that is invisible after the fact.

**Four sentences, and a record that survives its author:**

1. **The decision** — one sentence, no hedging. "We decided X."
2. **The alternative** — what you did not do, and the reason. This is the one future engineers actually search for.
3. **The cost** — every decision has one. A record that lists only benefits is advocacy, not a decision.
4. **The revisit condition** — the change that would make you decide differently. This is what turns a stale decision into a dated one instead of a wrong one.

**Why the cost sentence matters most.** Six months later, someone will find the cost and conclude the decision was a mistake — because nobody wrote down that it was accepted deliberately. Naming it in advance converts "who wrote this?" into "this was a considered trade."

**Why hedge words are banned.** "We sort of prefer" and "probably better to" cannot be evaluated or superseded. A record that does not commit cannot be wrong, which means it cannot be useful either.`,
      quiz: [
        {
          q: "A decision record's most-searched sentence is usually…",
          options: [
            "The decision",
            "The rejected alternative and its reason",
            "The date",
            "The author",
          ],
          answer: 1,
          explanation:
            "Future engineers arrive asking \"why not the obvious approach?\" — which is exactly the alternative. Without it, the decision gets re-litigated from scratch.",
        },
        {
          q: "Why name the cost explicitly?",
          options: [
            "To appear balanced",
            "Because someone will find it later and mistake an accepted trade for an oversight",
            "It is required by most templates",
            "To shorten the document",
          ],
          answer: 1,
          explanation:
            "The cost exists whether or not you write it. Recording it as accepted is what prevents it from reading as a mistake six months on.",
        },
        {
          q: "\"We decided to sort of prefer the queue approach.\" The problem is…",
          options: [
            "It is too long",
            "It does not commit, so it cannot be superseded or evaluated",
            "It mentions a queue",
            "Nothing",
          ],
          answer: 1,
          explanation:
            "A hedged decision has no state. You cannot revisit a decision that was never made.",
        },
        {
          q: "The revisit condition is valuable because…",
          options: [
            "It sets a deadline",
            "It dates the decision: a reader can tell whether the world has changed enough to reconsider",
            "It lists stakeholders",
            "It removes the need for tests",
          ],
          answer: 1,
          explanation:
            "\"Revisit if we exceed 10k events/s\" makes the decision correct-until-then, rather than simply old.",
        },
      ],
    },
  ],
};