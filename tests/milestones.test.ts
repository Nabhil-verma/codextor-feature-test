import { describe, expect, it } from "vitest";
import { findLesson, lessonKey } from "../src/data";
import { EMPTY_PROGRESS, type Progress } from "../src/lib/progress";
import {
  MILESTONES,
  PORTFOLIO_XP,
  allMilestoneStatus,
  milestoneBadges,
  milestoneStatus,
  milestoneXpTotal,
  milestonesClaimed,
  type Claims,
} from "../src/lib/milestones";
import { evaluateCheck, runUserCode } from "../src/lib/runner";
import { playerXp } from "../src/lib/gamification";

/** A progress map where every lesson in the given milestones is complete. */
function progressFor(ids: string[]): Progress {
  const completed: Record<string, number> = {};
  for (const id of ids) {
    const m = MILESTONES.find((x) => x.id === id)!;
    for (const key of m.skills) completed[lessonKey(...(key.split("/") as [string, string])) + "!2026-01-01"] = 1;
  }
  return { completed };
}

const ALL_IDS = MILESTONES.map((m) => m.id);

describe("milestone definitions", () => {
  it("has unique ids", () => {
    expect(new Set(ALL_IDS).size).toBe(ALL_IDS.length);
  });

  it("has unique badge ids, namespaced away from lesson badges", () => {
    const badgeIds = MILESTONES.map((m) => m.badge.id);
    expect(new Set(badgeIds).size).toBe(badgeIds.length);
    for (const id of badgeIds) expect(id.startsWith("ms-")).toBe(true);
  });

  it("gates every milestone behind real lessons", () => {
    for (const m of MILESTONES) {
      expect(m.skills.length, `${m.id} has no skill gate`).toBeGreaterThan(0);
      for (const key of m.skills) {
        const [trackId, lessonId] = key.split("/");
        expect(
          findLesson(trackId, lessonId),
          `${m.id} references unknown lesson "${key}"`
        ).toBeDefined();
      }
    }
  });

  it("asks for real, substantial work", () => {
    for (const m of MILESTONES) {
      expect(m.deliverables.length, `${m.id} deliverable list`).toBeGreaterThanOrEqual(3);
      expect(m.xp, `${m.id} xp`).toBeGreaterThan(0);
      expect(m.brief.length, `${m.id} brief`).toBeGreaterThan(40);
      for (const d of m.deliverables) {
        expect(d.trim().length, `${m.id} empty deliverable`).toBeGreaterThan(10);
      }
    }
  });

  it("totals the advertised XP", () => {
    expect(PORTFOLIO_XP).toBe(MILESTONES.reduce((n, m) => n + m.xp, 0));
    expect(PORTFOLIO_XP).toBeGreaterThan(1000);
  });
});

describe("milestone gating", () => {
  it("locks a milestone until every gating lesson is complete", () => {
    const m = MILESTONES[0];
    const locked = milestoneStatus(m, EMPTY_PROGRESS, {});
    expect(locked.unlocked).toBe(false);
    expect(locked.missingKeys).toEqual(m.skills);
    expect(locked.missingSkills.length).toBe(m.skills.length);
  });

  it("unlocks once the skills are done, and reports whom it blocks on", () => {
    const m = MILESTONES[0];
    const partial: Progress = {
      completed: {
        [lessonKey(...(m.skills[0].split("/") as [string, string])) + "!2026-01-01"]: 1,
      },
    };
    const half = milestoneStatus(m, partial, {});
    expect(half.unlocked).toBe(false);
    expect(half.skillsDone).toBe(1);
    expect(half.missingKeys).toEqual(m.skills.slice(1));

    const full = milestoneStatus(m, progressFor([m.id]), {});
    expect(full.unlocked).toBe(true);
    expect(full.missingKeys).toEqual([]);
  });

  it("does not treat a stale claim as earned once progress is reset", () => {
    // Claims live in localStorage, so a cleared progress map must not leave a
    // milestone reading as shipped.
    const m = MILESTONES[0];
    const claims: Claims = { [m.id]: { at: "2026-01-01", deliverables: [0, 1, 2, 3] } };
    const stale = milestoneStatus(m, EMPTY_PROGRESS, claims);
    expect(stale.claimed).toBe(true);
    expect(stale.earned).toBe(false);
    expect(stale.unlocked).toBe(false);

    const real = milestoneStatus(m, progressFor([m.id]), claims);
    expect(real.earned).toBe(true);
    expect(real.deliverablesDone).toBe(4);
  });
});

describe("milestone rewards", () => {
  it("pays XP only for claimed milestones", () => {
    expect(milestoneXpTotal({})).toBe(0);
    const claims: Claims = { [MILESTONES[0].id]: { at: "2026-01-01", deliverables: [] } };
    expect(milestoneXpTotal(claims)).toBe(MILESTONES[0].xp);
    expect(milestonesClaimed(claims)).toBe(1);
  });

  it("pays the full project XP once everything is claimed", () => {
    const claims: Claims = Object.fromEntries(
      MILESTONES.map((m) => [m.id, { at: "2026-01-01", deliverables: [] }])
    );
    expect(milestoneXpTotal(claims)).toBe(PORTFOLIO_XP);
    expect(milestonesClaimed(claims)).toBe(MILESTONES.length);
    expect(allMilestoneStatus(EMPTY_PROGRESS, claims).every((s) => s.claimed)).toBe(true);
  });

  it("counts milestone XP toward the player total the leaderboard ranks on", () => {
    const claims: Claims = { [MILESTONES[0].id]: { at: "2026-01-01", deliverables: [] } };
    const progress = progressFor([MILESTONES[0].id]);
    expect(playerXp(progress, 0)).toBeLessThan(playerXp(progress, milestoneXpTotal(claims)));
    expect(playerXp(progress, milestoneXpTotal(claims))).toBe(
      playerXp(progress, 0) + MILESTONES[0].xp
    );
  });

  it("exposes a badge per milestone in the shared shape", () => {
    const badges = milestoneBadges({});
    expect(badges).toHaveLength(MILESTONES.length);
    expect(badges.every((b) => !b.earned)).toBe(true);
    const claims: Claims = { [MILESTONES[0].id]: { at: "2026-01-01", deliverables: [] } };
    expect(milestoneBadges(claims).filter((b) => b.earned)).toHaveLength(1);
  });
});

/* ------------------------------------------------------------------ */
/* The proofs are executable content, so they get executed.            */
/* ------------------------------------------------------------------ */

const SOLUTIONS: Record<string, string> = {
  "m-interactive": `function add(todos, text) {
  const id = todos.length ? Math.max(...todos.map((t) => t.id)) + 1 : 1;
  return [...todos, { id, text, done: false }];
}

function toggle(todos, id) {
  return todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
}

function remove(todos, id) {
  return todos.filter((t) => t.id !== id);
}

const start = [{ id: 1, text: "read", done: false }];

const added = add(start, "ship");
console.log("after add:", added.length, added[1] && added[1].text);
console.log("original untouched:", start.length);

const toggled = toggle(added, 1);
console.log("toggled:", toggled[0].done, "untouched:", added[0].done);

const removed = remove(toggled, 1);
console.log("after remove:", removed.length, removed.map((t) => t.text).join(","));`,

  "m-data": `function viewState({ loading, error, data }) {
  if (!data) return error ? "error" : "loading";
  return data.length ? "ready" : "empty";
}

console.log("first load:", viewState({ loading: true, error: null, data: null }));
console.log("hard error:", viewState({ loading: false, error: "boom", data: null }));
console.log("empty result:", viewState({ loading: false, error: null, data: [] }));
console.log("ready:", viewState({ loading: false, error: null, data: [1] }));

const cached = [1];
console.log("refetching, cached:", viewState({ loading: true, error: null, data: cached }));
console.log("refetch failed, cached:", viewState({ loading: false, error: "boom", data: cached }));`,

  "m-persist": `function createStore(initial, storage) {
  let state = initial;
  const listeners = new Set();

  return {
    getState: () => state,

    setState(partial) {
      const next = { ...state, ...partial };
      if (JSON.stringify(next) === JSON.stringify(state)) return;
      state = next;
      storage.set(JSON.stringify(next));
      for (const fn of listeners) fn();
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
store.setState({ count: 1 });
store.setState({ count: 2 });

unsubscribe();
store.setState({ count: 3 });

console.log("notifications:", notifications);
console.log("storage writes:", writes.length);
console.log("final count:", store.getState().count);`,

  "m-ship": `const PLACEHOLDERS = [
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
  return messages.filter((m) => {
    const words = m.trim().split(/\\s+/);
    if (words.length < 3) return false;
    return !words.some((w) =>
      PLACEHOLDERS.includes(w.toLowerCase().replace(/:$/, ""))
    );
  }).length;
}

console.log("well-formed commits:", qualityCount(COMMITS));
console.log("of total:", COMMITS.length);`,
};

const codeProofs = MILESTONES.filter((m) => m.proof?.kind === "code");
const previewProofs = MILESTONES.filter((m) => m.proof?.kind === "preview");

describe("milestone proofs", () => {
  it("gives every milestone a functional proof", () => {
    for (const m of MILESTONES) {
      expect(m.proof, `${m.id} has no proof`).toBeDefined();
    }
    expect(codeProofs.length).toBeGreaterThanOrEqual(3);
    expect(previewProofs.length).toBeGreaterThanOrEqual(1);
  });

  it("is not already satisfied by the starter code", async () => {
    for (const m of codeProofs) {
      const proof = m.proof as Extract<typeof m.proof, { kind: "code" }>;
      const r = await runUserCode(proof.starter);
      expect(r.error, `${m.id} proof starter threw: ${r.error}`).toBe(null);
      expect(
        evaluateCheck(proof.check.expr, r.logs.join("\n")),
        `${m.id} proof is pre-solved — the starter already passes`
      ).toBe(false);
    }
  }, 30_000);

  it("accepts an independently written solution", async () => {
    for (const m of codeProofs) {
      const proof = m.proof as Extract<typeof m.proof, { kind: "code" }>;
      const solution = SOLUTIONS[m.id];
      expect(solution, `no reference solution for ${m.id}`).toBeTruthy();
      const r = await runUserCode(solution);
      expect(r.error, `${m.id} reference solution threw: ${r.error}`).toBe(null);
      expect(
        evaluateCheck(proof.check.expr, r.logs.join("\n")),
        `${m.id} proof is unsatisfiable — the reference solution fails it`
      ).toBe(true);
    }
  }, 30_000);

  it("grades preview proofs on structure the learner controls", () => {
    for (const m of previewProofs) {
      const proof = m.proof as Extract<typeof m.proof, { kind: "preview" }>;
      expect(proof.spec.requires?.length, `${m.id} preview has no assertions`).toBeGreaterThan(0);
      expect(proof.spec.html.length, `${m.id} preview has no starter`).toBeGreaterThan(20);
      expect(proof.brief.length, `${m.id} preview has no brief`).toBeGreaterThan(20);
    }
  });
});
