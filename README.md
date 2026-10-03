# Codexter

> **A 100% free, interactive code teacher.** Seventeen tracks, 99 hands-on lessons —
> you write and run real code from minute one, in the browser, with easy signup.

**Live:** [nnghedico.freebuff.app](https://nnghedico.freebuff.app)

No paywalls, no waste of time , no code snippets you can only
read. Every exercise runs *in your browser* and is graded by what your program
actually does.

---

## Table of contents

- [Why this exists](#why-this-exists)
- [Feature overview](#feature-overview)
- [The curriculum](#the-curriculum)
- [Nine ways to practise](#nine-ways-to-practise)
- [The XP economy](#the-xp-economy)
- [Progression: levels, ascension, titles, badges](#progression-levels-ascension-titles-badges)
- [Guilds](#guilds)
- [Project milestones](#project-milestones)
- [How the sandbox actually works](#how-the-sandbox-actually-works)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Project structure](#project-structure)
- [Accounts, progress & cloud sync](#accounts-progress--cloud-sync)
- [AI tutor (BYOK)](#ai-tutor-byok)
- [Testing](#testing)
- [Deployment](#deployment)
- [Design system](#design-system)
- [Troubleshooting](#troubleshooting)
- [Further documentation](#further-documentation)
- [License](#license)
- [Found a bug?](#found-a-bug)

---

## Why this exists

Most "learn to code" sites teach you to recognise code. You read a snippet, you
recognise the shape, you move on — and the moment real code appears on your
screen, you're lost.

Codexter is built on the opposite assumption: **you cannot learn to code without
running code.** So every lesson ends in a runner. You write something, you run
it, and something checks whether it actually worked. Not a human reading your
answer key — an expression evaluated against your program's real output, your
program's real compiler diagnostics, or the browser's own layout engine.

A few consequences worth calling out, because they're unusual for a learning app:

- **Grading is behavioural, not textual.** A break-and-fix lab that prints the
  right-looking thing still fails if the output is wrong. A program that prints
  the correct answer while lying to the type system still fails.
- **The real TypeScript compiler runs in the page.** Not a regex, not a
  hand-rolled checker — the `tsc` front end against an in-memory host holding the
  ES2020 libs, reporting genuine diagnostics with line and column.
- **Everything degrades instead of breaking.** A dead backend, a missing Convex
  function, a corrupt `localStorage` entry — each one costs you exactly one
  panel, with a plain-English explanation, instead of the whole app.

## Feature overview

- **17 curriculum tracks, 99 lessons** — Web foundations, React, Tailwind UI
  engineering, advanced React state, API integration, TypeScript for real
  projects, backend/Node, DSA, Python, Git & testing, DevOps/Linux/Docker, web
  security (OWASP), system design, web performance & accessibility,
  debugging/testing practice, and **working with coding agents** (the V2.1
  judgment track: specs, codebase archaeology, instruction files, plan
  approval, permissions, multi-file diff review, and an agent-loop capstone)
- **Live sandbox runner** — every lesson has an editor + console with
  self-checking exercises, "predict the output" challenges, and an
  infinite-loop guard
- **Visual execution engine** — step through code like Python Tutor: variables,
  call stack, and console replay line by line
- **The real TypeScript compiler, in the browser** — the TypeScript track runs
  the `tsc` front end against an in-memory host holding the ES2020 libs, so every
  Run reports real diagnostics with line and column, then strips types and
  executes. Grading needs all three: it runs, it compiles with zero errors, and
  its output passes — a program that prints the right thing while lying to the
  type system does not count
- **Measured performance & accessibility** — a track where the answer is a
  number, not an opinion: LCP/INP/CLS budgets, layout shift fixed in a live
  preview, AA contrast ratios, keyboard semantics and reduced motion, all graded
  against the page you actually built
- **Tiered hint system** — conceptual nudge → syntax reminder → code skeleton,
  before any full solution
- **Plain-English error translator** — runtime errors get beginner-friendly
  explanations above the console
- **Gamification game loop** — XP, levels, daily streaks, daily quests, 13
  badges, and a GitHub-style activity heatmap on your public portfolio
- **Global leaderboard** — live weekly / monthly / all-time brackets with
  glassmorphic rank rows, ascension frames and titles, and your own row glowing
  as it reorders
- **RPG ascension** — seven tiers (Initiate → Mythic) that change your avatar
  frame and unlock equippable titles, with a level ring and tier ladder on your
  profile
- **Guilds** — form a study group of up to 25, pool your XP on the guild board,
  and unlock collective rewards from Band to Legend
- **Interactive course elements** — drag-and-drop sequence challenges, a timed
  rapid-fire quiz mode with combo streaks and screen shake, and animated
  progress reveals
- **Live rendering + break-and-fix labs** — write HTML/CSS/Tailwind and watch the
  browser's own layout engine respond, or repair a genuinely broken program that
  is graded by running it
- **Project milestones** — one continuous portfolio project split into six
  milestones, each gated on the lessons that teach the skill and worth 1,750 XP
  toward your rank
- **Printable certificates** — finish every lesson in a track to unlock a
  gold-sealed certificate
- **Progress that follows you** — lesson scores and project milestone claims are
  saved locally by default; optional Convex Auth email sign-in syncs both across
  devices
- **Light & night mode** — one `class="dark"` on `<html>` rethemes everything,
  because every color in the Tailwind config resolves through the CSS variables
  in `src/index.css`. The choice (or your OS preference) is applied before first
  paint, so night mode never flashes white
- **Panels that fail alone** — every live-data panel renders inside its own error
  boundary, and pages inside a route-level one: a backend that is missing a
  function or unreachable costs you that panel with a plain-English explanation
  and a Try-again button, never the app shell
- **Quick practice** — six short exercises (rebuild code, match vocabulary, click
  the broken line) with per-question hints, feedback that names the line that's
  out of place, previous/next navigation and a completion screen
- **AI Socratic tutor (BYOK)** — bring your own Gemini or Claude key; it asks
  guiding questions instead of giving answers
- **PWA** — installable, with offline caching of lessons

## The curriculum

| # | Track | ID | Lessons | What it's for |
| --- | --- | --- | --- | --- |
| I | Web Development Foundations | `web` | 10 | HTML, CSS, the DOM, events, async, and the bugs everyone hits first |
| II | Modern Frontend: React | `react` | 4 | Components, props, state, and re-rendering without the guesswork |
| III | UI Engineering with Tailwind CSS | `tailwind` | 6 | Utility-first styling, responsive layout, dark mode as a token problem |
| IV | Advanced React State Management | `state` | 6 | Reducers, external stores, persistence, and the rules of immutability |
| V | API Integration & Data Fetching | `api` | 6 | `fetch`, loading/error/empty/ready, abort races, caching |
| VI | TypeScript for Real Projects | `typescript` | 6 | Type guards, generics, `unknown`, discriminated unions — compiled for real |
| VII | Backend Systems & APIs | `backend` | 5 | HTTP, REST, middleware, databases, security basics |
| VIII | Data Structures & Algorithms | `dsa` | 8 | Arrays through graph traversal, all runnable in-page |
| IX | Python & Data Fundamentals | `python` | 4 | Python syntax and data thinking, shown alongside the JS you know |
| X | Git, GitHub & Workflows | `git` | 4 | Commits, branches, merges, conflicts — with a guided terminal simulator |
| XI | Testing & Debugging | `testing` | 4 | What to test, boundary conditions, reading a failure properly |
| XII | DevOps, Linux CLI & Cloud | `devops` | 6 | Paths, permissions, containers, and deployment vocabulary |
| XIII | Web Security & OWASP | `security` | 5 | XSS, CSRF, injection, auth flaws, and how each one is exploited |
| XIV | System Design & Architecture | `architecture` | 6 | Caching, LRU, rate limiting, queues, and scaling vocabulary |
| XV | Web Performance & Accessibility | `performance` | 6 | Core Web Vitals and a11y as *measured* numbers |
| XVI | Working with Coding Agents | `agents` | 9 | Specs, archaeology, context, instruction files, plan approval, permissions, verification, capstone |
| XIX | Professional Workflow | `workflow` | 4 | PR descriptions, reviewing someone else's diff, scoping a vague request, decision records |

Reading lessons teach; the rest end in something runnable. Tracks share no
numerals, and a test pins that.

**Optional tracks (Tier 2).** `tailwind`, `python`, `devops`, `architecture`
and `performance` are marked `optional` in the registry and split into their
own section of the Learn page: framework-specific or lower-priority for
generalist screening, but fully playable and still counted for XP, ranks and
certificates.

## Nine ways to practise

A lesson is not one thing. Depending on what it's teaching, the page mounts a
different interaction:

| Interaction | Where | What it does |
| --- | --- | --- |
| **Reading + quiz** | most concept lessons | Markdown body, then multiple-choice with an explanation per answer |
| **Code exercise** | `starter` + `check` | Edit, run, and a JS expression is evaluated against your real `output` |
| **TypeScript exercise** | `lang: "ts"` | The same, but the program must also pass the real compiler with zero errors |
| **Break-and-fix** | `debug` | A genuinely broken program. Your repair is graded by running it |
| **Live preview** | `preview` | Write HTML/CSS/JS and the browser's own layout engine responds; graded on selectors |
| **CSS sandbox** | `sandbox` | A visual flexbox/grid playground that emits production-ready CSS |
| **Git simulator** | `gitSim` | A guided terminal with objectives checked against real branch/conflict state |
| **Predict the output** | `predict` | Commit to an answer, then run it and find out |
| **Drag-to-order** | `sort` | Reconstruct a sequence — box model layers, middleware pipeline, exception blocks |

Plus **rapid-fire**: the same questions again as a timed gauntlet, where speed
feeds a combo counter — but only a 100% run completes the lesson, so it can't be
used to skip mastery.

## The XP economy

Every number is **derived** from your progress map, never stored twice, so
rewards can't drift, can't be double-paid, and can't disagree between devices.

```
lesson completed           +50 XP
flawless quiz (100%)       +25 XP   → 75 for a perfect lesson
daily quests               +60 to +385 XP / day
consistency (2+ days)      +25 XP / day
```

**Daily quests** are computed, not stored, so a quest can never be claimed twice:

| Quest | Target | Bonus |
| --- | --- | --- |
| ⚔️ First Blood | Finish 1 lesson today | +60 |
| 🔥 Triple Threat | Finish 3 lessons today | +150 |
| ✦ XP Hunter | Earn 200 XP today | +100 |
| ◎ Flawless Run | Score 100% on any lesson today | +75 |

**Streaks** survive a one-day grace window, so a single missed day doesn't nuke a
long run. Both `current` and `longest` are tracked, and a broken current streak
still shows your personal best.

**Levels** are 250 XP each, with a ring showing your progress within the current
level.

## Progression: levels, ascension, titles, badges

### Ascension tiers

Seven tiers, each changing your avatar frame and unlocking more:

| Tier | Level | Perk |
| --- | --- | --- |
| I · Initiate | 1 | Your name on the board |
| II · Apprentice | 2 | Emerald frame + first titles |
| III · Adept | 4 | Aurora frame + animated streak flame |
| IV · Veteran | 6 | Violet frame + guild banner slot |
| V · Archon | 9 | Gilded frame + glowing rank row |
| VI · Ascendant | 12 | Tri-color frame + rare titles |
| VII · Mythic | 16 | Living prism frame + Mythic titles |

### Titles

Eight equippable titles unlock by level: Novice (1), Code Cadet (2), Syntax
Slinger (4), Bug Slayer (6), The Refactorer (8), Systems Architect (11),
Ascendant (14), Mythic Mind (16).

### Badges

13 badges, all derived from your own progress:

| Badge | Earned by |
| --- | --- |
| 🌱 First Steps | Complete your first lesson |
| ◎ Flawless | Score 100% on any lesson quiz |
| ③ Three-Day Streak | Learn something 3 days in a row |
| ⑦ Week Warrior | Learn something 7 days in a row |
| ✦ 1,000 XP | Earn 1,000 XP across all lessons |
| ❖ Track Finisher | Complete every lesson in a track |
| ❂ Explorer | Finish a lesson in 5 different tracks |
| ✺ Polyglot | Finish a lesson in every track |
| ♛ Seasoned | Reach level 5 |
| 🏅 Perfect Day | Clear every daily quest in a single day |
| ❈ Archon Ascendant | Ascend to the Archon tier |
| ⚔ Guildmate | Join a guild |
| ⚑ Guild Founder | Found your own guild |

## Guilds

Pooled XP unlocks collective rewards — the social loop that turns solo grinding
into team play. Guilds hold up to 25 members.

| Tier | Pooled XP | Perk |
| --- | --- | --- |
| Band | 0 | Shared guild banner |
| Company | 500 | +1 guild streak shield |
| Order | 2,000 | Guild aura on the leaderboard |
| Coterie | 6,000 | Custom guild reward tag |
| Legend | 15,000 | Gilded guild crest + title |

Guilds also run their own co-op quest line and activity feed, with member roles
(owner → officer → member), owner-managed promotions, and per-member
contribution reporting.

## Project milestones

One continuous portfolio project, split into six milestones. Each is **gated on
the lessons that teach the skill**, so you can't claim a milestone you haven't
earned — a stale claim whose progress was reset reads as *not earned*.

| # | Milestone | Phase | XP | The skill being proved |
| --- | --- | --- | --- | --- |
| 1 | Semantic Page Shell | Structure | 150 | Landmarks, semantics, accessibility |
| 2 | Design System Layer | Style | 250 | Tokens, responsive layout, dark mode |
| 3 | Interactive Component | Interactivity | 300 | State, controlled inputs, immutable updates |
| 4 | Live Data Layer | Data | 300 | `fetch`, all four states, abort on unmount |
| 5 | Persistent State | State | 350 | An external store that survives a refresh |
| 6 | Ship It | Delivery | 400 | Repo history, README, a live URL on your CV |

Total: **1,750 XP**. Every milestone's proof is an executable exercise solved by
an independent reference solution in the test suite — so a "solution" that
doesn't actually work can't ship.

## How the sandbox actually works

Worth a section, because this is the part most learning apps fake.

- **The JS runner** (`src/lib/runner.ts`) evaluates your program in a sandboxed
  function with a patched `console`, a `setTimeout` that registers into a
  pending-promise list so `runUserCode` waits for in-flight work instead of
  returning early, and a **loop tick guard** that aborts runaway `while`/`for`
  bodies rather than freezing the tab. Loop instrumentation is paren-aware and
  re-guards nested brace-less loops.
- **A mock REST server** is mounted at `/api/users` with full CRUD plus a
  deliberately flaky `/api/flaky` endpoint, so the API lessons can teach
  retries and error handling against something that genuinely fails.
- **The TS runner** (`src/lib/tsRunner.ts`) runs the real TypeScript compiler
  against an in-memory `CompilerHost` backed by the ES2020 lib files. It reports
  genuine diagnostics with code, line and column, then strips types and executes
  in the shared JS sandbox. Top-level `await` is legal; sandbox globals are
  declared and the DOM is deliberately not.
- **The visualizer** (`src/lib/stepper.ts`) records variable state and the call
  stack per line, so you can scrub through execution the way Python Tutor does.
- **Checks** are small expressions evaluated against the captured output —
  `output.includes("after add: 2 ship")`. They're parsed and interpreted by
  `src/lib/checkExpr.ts` rather than compiled with `new Function`, so the
  grading language is exactly the whitelisted vocabulary (string methods,
  comparisons, booleans) and anything else fails closed instead of running.
  Wrong text fails even if the code was right, which is the point: you're
  being graded on behaviour.

## Tech stack

| Layer | Choice |
| --- | --- |
| Build | Vite 5 |
| UI | React 18 + TypeScript 5.6 (strict, `noUnusedLocals`, `noUnusedParameters`) |
| Routing | React Router 6 (`HashRouter`) |
| Styling | Tailwind CSS 3.4 + PostCSS + autoprefixer |
| Animation | Framer Motion 13 |
| Icons | lucide-react |
| Backend | Convex 1.45 (queries, mutations, HTTP routes) |
| Auth | Convex Auth (`@convex-dev/auth`) — email/password, no API keys in the frontend |
| Tests | Vitest 2 + convex-test + Testing Library + jsdom |
| CI | GitHub Actions |

No runtime API keys ship in the frontend. The only network calls the app makes
are to Convex, and to an AI provider *if you supply your own key*.

## Getting started

```bash
npm install       # or bun install
npm run dev       # dev server on 0.0.0.0
npm test          # vitest suite
npm run typecheck # tsc -b --noEmit
npm run build     # production build → dist/
```

Bun works identically and is what CI uses. `npm run build` emits static output
to `dist/` and exits — it does not start a server.

CI runs the same two checks — `bun run typecheck` and `bun run test` — on every
push to `main` and every pull request.

## Project structure

```
src/
├── main.tsx                  # entry: providers + global CSS
├── App.tsx                   # router, RequireAuth, route boundary, lazy routes
├── AccountProvider.tsx       # Convex client, auth state, progress merge/push
├── index.css                 # every colour token, light + dark
├── convex/
│   ├── schema.ts             # progress, profiles, clans, clanQuests, clanEvents
│   ├── auth.ts / auth.config.ts
│   ├── progress.ts           # scores + milestone claims (separate mutations)
│   ├── profiles.ts           # public player card for the leaderboard
│   ├── leaderboard.ts        # bracketed top-N + your true rank
│   ├── clans.ts              # membership, board, feed, quests
│   ├── users.ts
│   └── http.ts               # auth HTTP routes
├── data/
│   ├── index.ts              # the track registry + findTrack/findLesson
│   ├── types.ts              # Lesson, Check, DebugChallenge, PreviewSpec, …
│   └── track-*.ts            # 17 tracks, 99 lessons of content
├── lib/
│   ├── localStore.ts         # the shared localStorage store + pub/sub primitive
│   ├── progress.ts           # progress store on top of it, v1→v2 migration
│   ├── gamification.ts       # XP, quests, streaks, ascension, titles, badges
│   ├── milestones.ts         # the six project milestones + gating
│   ├── runner.ts             # JS sandbox, loop guard, mock REST server
│   ├── tsRunner.ts           # in-browser TypeScript compiler host
│   ├── stepper.ts            # per-line trace for the visualizer
│   ├── guild.ts / guildState.ts / clanRewards.ts
│   ├── theme.ts              # dark-mode persistence (mirrors index.html)
│   ├── url.ts                # absolute-URL guard for the Convex client
│   ├── errors.ts / friendlyError.ts
│   └── ai.ts                 # BYOK Gemini/Claude client
├── components/               # lesson UI, sandboxes, tutor, error boundaries
│   ├── gamification/         # leaderboard, quests, ascension, drag, rapid-fire
│   └── clan/                 # guild feed + quest panel
└── pages/                    # Landing, Learn, Lesson, Playground, Certificate,
                             # Projects, Portfolio, Leaderboard, Clans, Auth
tests/                        # 26 suites, 257 tests
```

## Accounts, progress & cloud sync

The app works **fully without a backend** — progress lives in `localStorage`.
That's deliberate: the product is free and should never be gated on an account.

Accounts are built on **Convex Auth** (email/password, zero API keys in the
frontend) and add cross-device sync on top:

- On sign-in the cloud copy is merged with local, **best score per key wins**;
  local changes debounce-push to the cloud while signed in.
- One `progress` row per user holds both maps: the numeric score map in `data`
  and the milestone claims in `claims`. They merge by different rules — best
  score per key, best claim per milestone — so they live in **separate fields**
  and are written by **separate mutations** (`progress.save` /
  `progress.saveClaims`) rather than one blob that both would clobber. The
  `claims` field is optional, so rows written before the project layer keep
  working with no migration.
- `profiles` is the **public player card**: XP totals per bracket, level,
  ascension tier, streak and guild. The client recomputes it from the progress
  map and pushes it, so leaderboard queries sort server-side without reading
  anyone's full progress blob.
- XP, quests and ascension are all **derived** from the progress map (see
  `src/lib/gamification.ts`) — no second source of truth, and every reward is
  replayable and testable without touching the backend.
- Progress is keyed `` `${trackId}/${lessonId}!${YYYY-MM-DD}` ``. Pre-v2 keys had
  no date suffix and are migrated on load, keeping their scores but not
  fabricating streak days for a day we can't know.

The leaderboard, guild and milestone-claims panels each sit behind their own
error boundary, so if a query fails they render an inline explanation with a
Try-again button instead of breaking the page.

The app ships pointed at a public Convex deployment
(`accomplished-hyena-726`), so accounts, sync, and the leaderboard work with no
environment setup. The client URL is built from the `CONVEX_DEPLOYMENT`
constant in `src/AccountProvider.tsx` — change it there to target a different
deployment. A `VITE_CONVEX_URL` env var is deliberately **not** consulted, so a
`convex dev` localhost URL can never leak into a production build.

## AI tutor (BYOK)

Optional, and entirely client-side. Add a Gemini or Claude key in
**Settings → AI**, and the Socratic tutor asks guiding questions instead of
handing you the answer.

Keys are stored in `localStorage` and are sent only to the provider you chose —
`generativelanguage.googleapis.com` for Gemini, `api.anthropic.com` for Claude.
There is no server in the middle, no proxy, and no key in the bundle. Clearing
site data removes them.

The tutor is a *Socratic* tutor on purpose: it will not write the solution. It
asks what you think will happen, points at the line it thinks is wrong, and lets
you run the code to find out.

## Testing

```bash
npm test        # or: bun x vitest run
```

**257 tests across 26 files.** The content tests are the interesting ones,
because content is where bugs hide:

- Every broken debug program fails its own check, every reference fix passes it,
  and no challenge is secretly a syntax error
- Every diff-review exercise plants a defect that exists inside the after-side
  of a named file, ships ≥2 distractors with one near the blocker, and grades
  on the partial-credit ladder (0 / 0.4 / 0.7 / 1.0) — and every rubric is
  satisfiable by its own exemplar in the check grammar
- No starter is pre-solved, every check is satisfiable, every exercise has a
  full three-tier hint ladder
- Milestone gates derive from real progress, stale claims are not earned, and
  every executable proof is solved by an independent reference solution
- The in-browser compiler: clean code produces zero diagnostics, a real error
  carries the right code/line/column, and `const n: number = "6"` still *runs* —
  which is exactly why the pass gate needs the compiler's answer and not just
  the output
- Two-device claim-log merging is commutative and idempotent, and a full claim
  log with no progress renders as *not* earned
- The first cohort's bug list, pinned: real Convex errors render as explanations
  while the rest of the page keeps working, an assembly answer only verifies in
  *runnable* order, and the theme toggle flips `.dark` and remembers it
- Every colour token the source uses exists in both themes *and* in the Tailwind
  config, and every opacity modifier sits on Tailwind's scale — `bg-ink-100` and
  `bg-gold-400/12` both compiled to nothing before this test existed
- One storage primitive behind progress, claims, guild rewards, AI settings and
  the theme: corrupt JSON, blocked storage and hand-edited entries all degrade
  to the default instead of throwing inside a render

## Deployment

The client is a static Vite build (`dist/`). The backend is a Convex deployment
holding the auth tables plus progress, profiles, clans and clan quests.

`.github/workflows/ci.yml` runs `bunx convex deploy` on every push to `main`
once a `CONVEX_DEPLOY_KEY` repository secret is set (GitHub → Settings →
Secrets and variables → Actions → New repository secret, using a deploy key for
`accomplished-hyena-726`). Without the secret the job reports why and exits
clean, so forks never fail. To deploy by hand instead: `bunx convex deploy`.

> **Deploy key status (re-verified 2026-10-03).** The functions and schema are live on
> `accomplished-hyena-726` — `clans:mine`, `progress:get`, `progress:getClaims`
> and `clans:list` all answer on the deployment today. The workspace credential
> is accepted again: the earlier `401 AuthenticationFailed: Invalid Convex
> deploy key` is no longer reproducible, and `bun convex dev --once` pushes to
> the deployment. What is still
> owner-managed is the GitHub Actions secret, so CI can run `bunx convex deploy`
> on push (repository → Settings → Secrets and variables → Actions →
> `CONVEX_DEPLOY_KEY`). Until it is set, that job explains why and exits clean,
> and nothing is broken at runtime: the app keeps running against the live
> deployment.

One deliberate consequence of the hard-coded deployment constant: **this app has
one cloud deployment, not a dev/prod pair.** Convex labels it "Development"
because it was created as the project's dev deployment. Moving to a separate
production deployment is a code change plus a data migration — a new deployment
starts empty — not just a deploy.

## Design system

The palette is **paper / ink / gold**: warm off-white surfaces, near-black text,
and a single metallic gold accent. Values are space-separated RGB channels in
`src/index.css`, referenced from `tailwind.config.js` as
`rgb(var(--paper) / <alpha-value>)`, so every colour flips with one class on
`<html>` and Tailwind's `/opacity` modifiers keep working unchanged.

Typography is Fraunces (display), Inter (sans) and JetBrains Mono (code). Dark
mode is applied by a small inline script in `index.html` **before first paint**,
so the page never flashes white on load.

Motion is transform-and-opacity only, spring-smoothed, and skipped entirely under
`prefers-reduced-motion`.

## Troubleshooting

**A lesson says the check failed but my code looks right.** The check is an
expression over your program's actual `output`. If it compares text, spacing and
labels matter. Use the hint ladder — tier 3 is close to a skeleton.

**"This feature needs a newer server."** A Convex function the panel needs isn't
reachable. The panel is degraded on purpose, so the rest of the app keeps
working. Press **Try again**; if it persists, the backend needs a deploy.

**My progress vanished.** Progress lives in `localStorage` under a versioned
key. Private-mode browsers and "clear site data" both wipe it. Sign in to sync
it to your account.

**The rapid-fire run won't complete the lesson.** By design — only a 100% run
completes it. Speed feeds your combo score, not your mastery.

**`bun convex dev --once` fails with `Invalid Convex deploy key`.** See
[Deployment](#deployment). The local dev deployment and the whole test suite are
unaffected.

## Further documentation

- **[GAMIFICATION.md](./GAMIFICATION.md)** — the full feature plan behind the
  game layer: XP economy, quest and streak math, ascension tiers, guild
  rewards, the backend player-card model, and drop-in snippets for every
  component
- **[CURRICULUM-ROADMAP.md](./CURRICULUM-ROADMAP.md)** — the curriculum's
  interactive engine, the courses it unlocks, the project milestone layer, the
  open-items table, and the first real cohort's bug report with cause and fix for
  each entry
- **[CURRICULUM-V2.md](./CURRICULUM-V2.md)** — the next-curriculum design:
  the judgment-over-authorship exercise format, the shared AI-bug taxonomy,
  five new tracks (coding agents, building with LLMs, SQL, professional
  workflow, and an interview-prep capstone), the grader verification, and the
  auditable diff against the 15 tracks it was written against (the app now
  ships 16 — the agents track is the first V2 track to land)
- **[CURRICULUM-V2-PATCH.md](./CURRICULUM-V2-PATCH.md)** — the V2.1 patch:
  executed Python via Pyodide, multi-file diff review with partial credit,
  codebase archaeology, operating-agent lessons (instruction files, plans,
  permissions), production debugging, AI data boundaries, a validated Next.js
  decision, and the milestone redesign around agent tasks, notes, and proof
  tests — plus what ships as the two-item pilot
- **[CURRICULUM-V2-PILOT-PROPOSAL.md](./CURRICULUM-V2-PILOT-PROPOSAL.md)** —
  the pilot's status report and execution record: the seed-order reconciliation,
  the three Wave 0 deliverables (partial-credit recording, the diff/click
  grader, Track XVI end-to-end), the exit gates, and what remains closed

## License

MIT — free forever, as intended.

## Found a bug?

If you hit a problem, a broken exercise, or something that just feels *weird*,
please report it. Bug reports from actual learners have caught genuinely
unanswerable exercises, unsolvable quizzes, and no-op buttons that shipped
before anyone said so — all of them fixed, and several pinned by a test so they
can't come back.

DM me on Discord — username **`xar.z_dom`**, display name **`XAR-𝒳𝒶𝓇𝓎𝒶𝓃`**.

Thank you, and please try your best! :)
