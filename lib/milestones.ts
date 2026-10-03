/* ------------------------------------------------------------------ */
/* Project milestones: one continuous portfolio, built across tracks.  */
/*                                                                     */
/* A milestone is not a quiz. It is a functional component of a real   */
/* project, gated behind the lessons that teach the skill and — where  */
/* it can be — graded by actually running the learner's own code.      */
/* ------------------------------------------------------------------ */

import { findLesson, lessonKey } from "../data";
import type { Check, PreviewSpec } from "../data/types";
import { scoreFor, type Progress } from "./progress";

/** The functional proof attached to a milestone, where one is possible. */
type MilestoneProof =
  | { kind: "preview"; brief: string; spec: PreviewSpec }
  | { kind: "code"; brief: string; starter: string; check: Check };

type MilestoneBadge = {
  id: string;
  icon: string;
  title: string;
  description: string;
};

export type Milestone = {
  id: string;
  title: string;
  /** Portfolio phase, shown as the chapter this milestone belongs to. */
  phase: string;
  icon: string;
  /** What the learner ships, in one or two sentences. */
  brief: string;
  /** Lesson keys (`trackId/lessonId`) that must be complete first. */
  skills: string[];
  /** The functional components that have to exist and work. */
  deliverables: string[];
  xp: number;
  badge: MilestoneBadge;
  proof?: MilestoneProof;
};

/** One claimed milestone: when, and which deliverables were ticked off. */
export type Claim = { at: string; deliverables: number[] };
export type Claims = Record<string, Claim>;

/* ═══════════════════════════════════════════════════════════════
   The capstone project. Six milestones that compose into a real,
   deployed portfolio site — each one reusing the lessons that came
   before it, so the project never becomes a separate assignment.
   ═══════════════════════════════════════════════════════════════ */

export const PORTFOLIO_PROJECT = {
  id: "portfolio",
  title: "The Continuous Portfolio",
  blurb:
    "One project, built across the whole curriculum. Every milestone adds a functional component to a site you actually deploy — nothing here is throwaway practice.",
  repoHint: "Name it portfolio — it becomes the first link on your CV.",
} as const;

export const MILESTONES: Milestone[] = [
  {
    id: "m-shell",
    title: "Semantic Page Shell",
    phase: "Phase 1 · Structure",
    icon: "⬚",
    brief:
      "Start the project as a real document: landmarks, a heading hierarchy that makes sense, and no accessibility shortcuts.",
    skills: ["web/html-semantic", "web/box-model-deep"],
    deliverables: [
      "A working index.html with header, nav, main and footer landmarks",
      "Exactly one h1, with no skipped heading levels below it",
      "Descriptive alt text on every image and discernible text on every link",
      "Opens in a browser with an empty console",
    ],
    xp: 150,
    badge: {
      id: "ms-shell",
      icon: "⬚",
      title: "Foundation Layer",
      description: "Shipped a semantic page shell for the portfolio.",
    },
    proof: {
      kind: "preview",
      brief:
        "Build the document skeleton here first — it's graded on structure, so get the landmarks right before styling anything.",
      spec: {
        goal:
          "Write a header containing a nav, a main containing an h1, and a footer — all as direct children of the body.",
        brief:
          "The bones of your portfolio. Structure is verified; styling comes in the next milestone.",
        html: `<!-- Build the page shell:
       <header> with a <nav> inside
       <main> with one <h1>
       <footer>
     All three are direct children of <body>. -->

`,
        requires: ["body > header", "header > nav", "main > h1", "body > footer"],
      },
    },
  },
  {
    id: "m-style",
    title: "Design System Layer",
    phase: "Phase 2 · Style",
    icon: "◧",
    brief:
      "Style the shell with utilities and your own tokens: responsive from 320px up, legible in dark mode, and every interactive element visibly focusable.",
    skills: [
      "tailwind/utility-first",
      "tailwind/layout-flex-grid",
      "tailwind/responsive-dark",
      "tailwind/design-tokens",
    ],
    deliverables: [
      "Brand colours, fonts and shadows defined as tokens in tailwind.config",
      "A responsive card grid: one column on phones, three from md upward",
      "Every interactive element has a focus-visible treatment",
      "Dark mode is readable — AA contrast on body copy in both themes",
      "Spacing comes from the scale, with no one-off pixel values",
    ],
    xp: 250,
    badge: {
      id: "ms-style",
      icon: "◧",
      title: "Design System",
      description: "Styled the portfolio with a token-based utility system.",
    },
    proof: {
      kind: "preview",
      brief:
        "Rebuild your card grid in isolation and apply the layout, dark-mode and focus classes. The preview re-renders as you type.",
      spec: {
        goal:
          "Give .grid the classes grid, gap-6 and md:grid-cols-3, add at least two .card children, apply dark:bg-slate-900 to the cards, and focus-visible:ring-2 to the button.",
        brief:
          "The responsive, dark-mode-aware card grid — graded on the classes you actually apply.",
        framework: "tailwind",
        html: `<main class="min-h-screen bg-white p-8 dark:bg-slate-950">
  <div class="grid mx-auto max-w-4xl">
    <article class="card rounded-2xl border border-slate-200 bg-white p-6">
      <h2 class="font-semibold">Project one</h2>
      <p class="text-slate-600">What it does and why it exists.</p>
      <button class="mt-4 rounded-full px-4 py-2">View</button>
    </article>
    <article class="card rounded-2xl border border-slate-200 bg-white p-6">
      <h2 class="font-semibold">Project two</h2>
      <p class="text-slate-600">The stack you chose and why.</p>
      <button class="mt-4 rounded-full px-4 py-2">View</button>
    </article>
  </div>
</main>`,
        requires: [
          ".grid.md\\:grid-cols-3",
          ".grid.gap-6",
          ".card.dark\\:bg-slate-900",
          "button.focus-visible\\:ring-2",
        ],
      },
    },
  },
  {
    id: "m-interactive",
    title: "Interactive Component",
    phase: "Phase 3 · Interactivity",
    icon: "◈",
    brief:
      "Add the first piece of real behaviour: a stateful component the visitor can actually operate, with correct immutable updates underneath.",
    skills: [
      "react/jsx-vdom",
      "react/props-state",
      "react/hooks-effect",
      "web/dom-events",
    ],
    deliverables: [
      "One React component with local state",
      "A controlled input wired to value + onChange",
      "A list rendered with stable keys, not array indexes",
      "Every immutable update goes through a copied data structure",
      "No React warnings or key errors in the console",
    ],
    xp: 300,
    badge: {
      id: "ms-interactive",
      icon: "◈",
      title: "Interactive",
      description: "Built a stateful component with correct immutable updates.",
    },
    proof: {
      kind: "code",
      brief:
        "The logic inside that component, isolated. Immutable add / toggle / remove — the part that breaks in real apps.",
      starter: `// The data logic behind your interactive component.
// Every operation must return a NEW array and leave the input untouched.
function add(todos, text) {
  // TODO: return a new array with { id, text, done: false } appended
  return todos;
}

function toggle(todos, id) {
  // TODO: return a new array with the matching todo's done flipped
  return todos;
}

function remove(todos, id) {
  // TODO: return a new array with the matching todo removed
  return todos;
}

const start = [{ id: 1, text: "read", done: false }];

const added = add(start, "ship");
console.log("after add:", added.length, added[1] && added[1].text);
console.log("original untouched:", start.length);

const toggled = toggle(added, 1);
console.log("toggled:", toggled[0].done, "untouched:", added[0].done);

const removed = remove(toggled, 1);
console.log("after remove:", removed.length, removed.map((t) => t.text).join(","));`,
      check: {
        expr: 'output.includes("after add: 2 ship") && output.includes("original untouched: 1") && output.includes("toggled: true untouched: false") && output.includes("after remove: 1 ship")',
        hint: "Spread the array for add, map for toggle, filter for remove. The original array must never change.",
        hints: [
          { tier: 1, text: "Returning the input means nothing changed. Each function hands back a brand-new array." },
          { tier: 2, text: "add → `[...todos, newTodo]`. toggle → `map` with a spread on the match. remove → `filter` by id." },
          { tier: 3, text: "toggle: `todos.map((t) => t.id === id ? { ...t, done: !t.done } : t)`." },
        ],
      },
    },
  },
  {
    id: "m-data",
    title: "Live Data Layer",
    phase: "Phase 4 · Data",
    icon: "◉",
    brief:
      "Make the portfolio dynamic: pull real content from an API and handle every state a network can put you in.",
    skills: [
      "api/http-verbs",
      "api/fetch-async",
      "api/loading-errors",
      "api/abort-races",
    ],
    deliverables: [
      "Data loaded with fetch, with res.ok checked before parsing",
      "All four states handled: loading, error, empty and ready",
      "Cached content stays on screen when a background refetch fails",
      "In-flight requests aborted on unmount",
      "Failures show human copy with a retry, never a raw error string",
    ],
    xp: 300,
    badge: {
      id: "ms-data",
      icon: "◉",
      title: "Live Data",
      description: "Wired the portfolio to a real API with all four states handled.",
    },
    proof: {
      kind: "code",
      brief:
        "The render decision for your data-backed view. Getting the order right is what stops a failed refetch from blanking the screen.",
      starter: `// Decide what a data-backed view should render.
// Return exactly one of: "loading" | "error" | "empty" | "ready".
//
// Rules:
//  - no data yet + an error        → "error"
//  - no data yet + still loading   → "loading"
//  - data present but empty ([])   → "empty"
//  - data present and non-empty    → "ready"
//  - a background refetch (loading OR error) with data already
//    present must still render "ready" — never blank the screen.
function viewState({ loading, error, data }) {
  // TODO
  return "ready";
}

console.log("first load:", viewState({ loading: true, error: null, data: null }));
console.log("hard error:", viewState({ loading: false, error: "boom", data: null }));
console.log("empty result:", viewState({ loading: false, error: null, data: [] }));
console.log("ready:", viewState({ loading: false, error: null, data: [1] }));

const cached = [1];
console.log("refetching, cached:", viewState({ loading: true, error: null, data: cached }));
console.log("refetch failed, cached:", viewState({ loading: false, error: "boom", data: cached }));`,
      check: {
        expr: 'output.includes("first load: loading") && output.includes("hard error: error") && output.includes("empty result: empty") && output.includes("ready: ready") && output.includes("refetching, cached: ready") && output.includes("refetch failed, cached: ready")',
        hint: "Check `data` first: with no data, an error wins over loading. With data, only an empty array changes the answer — a failed refetch keeps showing what you have.",
        hints: [
          { tier: 1, text: "The presence of `data` is the first fork. Everything else branches from there." },
          { tier: 2, text: "No data: return \"error\" if there's an error, otherwise \"loading\". Data present: \"empty\" when the length is 0, otherwise \"ready\"." },
          { tier: 3, text: "`if (!data) return error ? \"error\" : \"loading\"; return data.length ? \"ready\" : \"empty\";`" },
        ],
      },
    },
  },
  {
    id: "m-persist",
    title: "Persistent State",
    phase: "Phase 5 · State",
    icon: "⟳",
    brief:
      "Give the visitor something that survives a refresh — theme choice, saved items, a draft — via a store you control rather than prop-drilling.",
    skills: [
      "state/state-shapes",
      "state/usereducer",
      "state/external-stores",
    ],
    deliverables: [
      "An external store exposing getState / setState / subscribe",
      "State persisted to localStorage and restored on load",
      "setState bails out when nothing actually changed",
      "Components unsubscribe on unmount — no leaked listeners",
      "A refresh leaves the UI exactly as the visitor left it",
    ],
    xp: 350,
    badge: {
      id: "ms-persist",
      icon: "⟳",
      title: "Persistent",
      description: "Built an external store that survives a refresh.",
    },
    proof: {
      kind: "code",
      brief:
        "The store underneath your persistence layer: merge, persist, notify — and only when something genuinely changed.",
      starter: `// A store that persists through an injected storage adapter.
function createStore(initial, storage) {
  let state = initial;
  const listeners = new Set();

  return {
    getState: () => state,

    setState(partial) {
      // TODO: merge \`partial\` into state, write it through storage.set,
      // and notify listeners ONLY when a value actually changed.
    },

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

const writes = [];
const storage = { set: (json) => writes.push(json) };

const store = createStore({ count: 0 }, storage);
let notifications = 0;
const unsubscribe = store.subscribe(() => {
  notifications += 1;
});

store.setState({ count: 1 });
store.setState({ count: 1 }); // identical — must not notify or persist
store.setState({ count: 2 });

unsubscribe();
store.setState({ count: 3 }); // nobody is listening now

console.log("notifications:", notifications);
console.log("storage writes:", writes.length);
console.log("final count:", store.getState().count);`,
      check: {
        expr: 'output.includes("notifications: 2") && output.includes("storage writes: 3") && output.includes("final count: 3")',
        hint: "Two real changes call the listeners twice. Every real change persists, including the last one — it has no listener, but it still belongs in storage, so expect three writes. The identical write touches neither.",
        hints: [
          { tier: 1, text: "Build the next state, compare it with the current one, and only then do the storing and notifying." },
          { tier: 2, text: "Compare the merged result against the existing state before committing: if every field matches, return early." },
          { tier: 3, text: "`const next = { ...state, ...partial }; if (JSON.stringify(next) === JSON.stringify(state)) return; state = next; storage.set(JSON.stringify(next)); for (const fn of listeners) fn();`" },
        ],
      },
    },
  },
  {
    id: "m-ship",
    title: "Ship It",
    phase: "Phase 6 · Delivery",
    icon: "▲",
    brief:
      "Publish it. A public repository with a history that reads like a professional's, a README a stranger can follow, and a live URL you can send to anyone.",
    skills: ["git/git-basics", "git/git-branches", "git/git-workflow-lab"],
    deliverables: [
      "A public repository with a real commit history, not one bulk commit",
      "Work done on a feature branch and merged — not straight to main",
      "A README covering what it is, why it exists and how to run it",
      "Deployed at a live URL that loads without errors",
      "That URL is on your CV, your GitHub profile and your LinkedIn",
    ],
    xp: 400,
    badge: {
      id: "ms-ship",
      icon: "▲",
      title: "Shipped",
      description: "Deployed the portfolio project and published the repo.",
    },
    proof: {
      kind: "code",
      brief:
        "Your commit history is part of the work you're showing. Grade a sample the way a reviewer would.",
      starter: `// A reviewer skims your log before they read your code.
// A message is WELL-FORMED when it has at least 3 space-separated
// words AND contains no placeholder word (case-insensitive, ignoring
// a trailing colon) from PLACEHOLDERS.
const PLACEHOLDERS = [
  "wip", "update", "final", "stuff", "temp", "asdf", "asdfasdf",
  "todo", "misc", "changes", "fixes",
];

const COMMITS = [
  "add hero section markup",
  "fix: guard against empty data in the list",
  "wip",
  "update",
  "feat: add project milestones page",
  "final final v2",
];

function qualityCount(messages) {
  // TODO: count how many messages are well-formed.
  return 0;
}

console.log("well-formed commits:", qualityCount(COMMITS));
console.log("of total:", COMMITS.length);`,
      check: {
        expr: 'output.includes("well-formed commits: 3") && output.includes("of total: 6")',
        hint: "Exactly three of the six read like a professional history: two are placeholders and one is too short.",
        hints: [
          { tier: 1, text: "Two independent conditions: word count, and placeholder-free. A message must satisfy both." },
          { tier: 2, text: "Split on whitespace for the word count. For placeholders, lowercase each word and strip a trailing colon before comparing." },
          { tier: 3, text: "`messages.filter((m) => { const words = m.trim().split(/\\s+/); if (words.length < 3) return false; return !words.some((w) => PLACEHOLDERS.includes(w.toLowerCase().replace(/:$/, \"\"))); }).length`" },
        ],
      },
    },
  },
];

/** XP available from the project — the reward for shipping, not just reading. */
export const PORTFOLIO_XP = MILESTONES.reduce((sum, m) => sum + m.xp, 0);

/* --------------------------- Derivation --------------------------- */

type MilestoneStatus = {
  milestone: Milestone;
  /** Every gating lesson is complete. */
  unlocked: boolean;
  skillsDone: number;
  skillsTotal: number;
  /** Lesson keys still standing in the way. */
  missingKeys: string[];
  /** Human-readable titles of the lessons still standing in the way. */
  missingSkills: string[];
  /** A claim exists in the local claim log. */
  claimed: boolean;
  /**
   * Claimed *and* still backed by its lessons. This is what the UI renders as
   * shipped — a stale claim whose progress was reset reads as not earned.
   */
  earned: boolean;
  claimedAt: string | null;
  /** Deliverables ticked off so far (0 when unclaimed). */
  deliverablesDone: number;
};

/**
 * Everything the UI needs about one milestone, derived from progress plus the
 * claim log. `unlocked` comes only from real lesson completion, so the gate
 * can't be bypassed by the claim log alone.
 */
export function milestoneStatus(
  m: Milestone,
  progress: Progress,
  claims: Claims
): MilestoneStatus {
  const missing: string[] = [];
  const missingKeys: string[] = [];
  for (const key of m.skills) {
    const [trackId, lessonId] = key.split("/");
    if (scoreFor(progress, lessonKey(trackId, lessonId)) < 1) {
      missingKeys.push(key);
      missing.push(findLesson(trackId, lessonId)?.title ?? key);
    }
  }
  const claim = claims[m.id];
  const unlocked = missing.length === 0;
  return {
    milestone: m,
    unlocked,
    skillsDone: m.skills.length - missing.length,
    skillsTotal: m.skills.length,
    missingKeys,
    missingSkills: missing,
    claimed: Boolean(claim),
    earned: Boolean(claim) && unlocked,
    claimedAt: claim?.at ?? null,
    deliverablesDone: claim ? claim.deliverables.length : 0,
  };
}

/** Status for every milestone, in project order. */
export function allMilestoneStatus(
  progress: Progress,
  claims: Claims
): MilestoneStatus[] {
  return MILESTONES.map((m) => milestoneStatus(m, progress, claims));
}

/**
 * Union of two claim logs. "Best claim wins" per milestone: the one with more
 * ticked deliverables, ties going to the earlier date. Commutative and
 * associative, so a local claim and a cloud pull converge on the same log no
 * matter which order they arrive in — and re-merging is always idempotent.
 */
export function mergeClaims(a: Claims, b: Claims): Claims {
  const out: Claims = { ...a };
  for (const [id, claim] of Object.entries(b)) {
    const mine = out[id];
    if (!mine || claim.deliverables.length > mine.deliverables.length) {
      out[id] = claim;
    } else if (
      claim.deliverables.length === mine.deliverables.length &&
      claim.at < mine.at
    ) {
      out[id] = claim;
    }
  }
  return out;
}

/** Total XP earned from claimed milestones. */
export function milestoneXpTotal(claims: Claims): number {
  let xp = 0;
  for (const m of MILESTONES) {
    if (claims[m.id]) xp += m.xp;
  }
  return xp;
}

/** How many milestones are claimed, out of the total — the "3/6" pill. */
export function milestonesClaimed(claims: Claims): number {
  return MILESTONES.filter((m) => claims[m.id]).length;
}

/**
 * Milestone badges in the same shape `computeBadges` returns, so the profile
 * can render one unified badge wall without knowing where they came from.
 */
export function milestoneBadges(
  claims: Claims
): (MilestoneBadge & { earned: boolean })[] {
  return MILESTONES.map((m) => ({ ...m.badge, earned: Boolean(claims[m.id]) }));
}
