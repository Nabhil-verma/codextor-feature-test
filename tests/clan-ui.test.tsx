// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { makeFunctionReference } from "convex/server";
import type { ClanView } from "../src/convex/clans";

/*
 * The three shared surfaces Feature 1 adds, rendered for real:
 *
 *   1. ClanQuestPanel — this week's pooled quest, contributors, claim button.
 *   2. ClanFeed       — the guild's live chronicle.
 *   3. the roster     — promote / demote / kick controls, gated by role.
 *
 * Convex is mocked at the hook boundary (the backend itself is covered by
 * `clan-quest-lifecycle.test.ts`), so these tests answer a different question:
 * does the right data produce the right, interactive UI — and can a member
 * without the role even see the controls?
 */

// jsdom ships neither observer, and framer-motion's whileInView/layout
// animations (used all over the guild page) need them to exist.
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
if (!("IntersectionObserver" in globalThis)) {
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = NoopObserver;
}
if (!("ResizeObserver" in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = NoopObserver;
}
if (typeof window.matchMedia !== "function") {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

// `api` is Convex's `anyApi`: every property access builds a fresh reference,
// so queries are keyed by their function path ("clans:questView") instead.
const PATH = Object.getOwnPropertySymbols(makeFunctionReference("probe:probe"))[0];
const pathOf = (ref: unknown): string => {
  const path = (ref as Record<symbol, unknown>)[PATH];
  return typeof path === "string" ? path : "";
};

const Q = {
  questView: "clans:questView",
  questClaims: "clans:questClaims",
  feed: "clans:feed",
  me: "profiles:me",
} as const;

const M = {
  claimQuestReward: "clans:claimQuestReward",
  setRole: "clans:setRole",
  kick: "clans:kick",
} as const;

const h = vi.hoisted(() => ({
  queries: new Map<string, unknown>(),
  mutations: new Map<string, ReturnType<typeof vi.fn>>(),
}));

// Keep every real export and swap only the two live-data hooks.
vi.mock("convex/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("convex/react")>();
  return {
    ...actual,
    useQuery: (ref: unknown) => h.queries.get(pathOf(ref)),
    useMutation: (ref: unknown) => {
      const key = pathOf(ref);
      let fn = h.mutations.get(key);
      if (!fn) {
        fn = vi.fn(() => Promise.resolve());
        h.mutations.set(key, fn);
      }
      return fn;
    },
  };
});

// Imported after the mock so the components pick up the mocked hooks.
import ClanQuestPanel from "../src/components/clan/ClanQuestPanel";
import ClanFeed from "../src/components/clan/ClanFeed";
import { MyGuild } from "../src/pages/Clans";

/* ------------------------------ fixtures ------------------------------ */

const WEEK = "2026-W39";

const activeQuest = {
  questId: "quest_war_party",
  title: "War Party",
  detail: "The guild clears lessons together — every member's completions count.",
  metric: "lessons" as const,
  target: 12,
  pooled: 7,
  status: "active" as const,
  rewardXp: 600,
  weekKey: WEEK,
  isComplete: false,
  contributors: [
    { userId: "u_ada", name: "Ada", level: 4, ascension: "adept", contribution: 4, isMe: true },
    { userId: "u_lin", name: "Lin", level: 2, ascension: "apprentice", contribution: 3, isMe: false },
  ],
};

const doneQuest = {
  ...activeQuest,
  pooled: 14,
  status: "complete" as const,
  isComplete: true,
};

const guild: ClanView = {
  id: "clan_nb" as ClanView["id"],
  name: "Nightly Builders",
  tag: "NB",
  blurb: "ship something every night",
  memberCount: 3,
  totalXp: 3200,
  weekXp: 900,
  tier: "Order",
  tierPerk: "Guild aura on the leaderboard",
  isMine: true,
  isOwner: true,
  myRole: "owner",
  members: [
    { userId: "u_ada" as never, name: "Ada", xp: 2200, level: 4, ascension: "adept", role: "owner", isMe: true },
    { userId: "u_lin" as never, name: "Lin", xp: 700, level: 2, ascension: "apprentice", role: "officer", isMe: false },
    { userId: "u_sam" as never, name: "Sam", xp: 300, level: 1, ascension: "initiate", role: "member", isMe: false },
  ],
};

/** The field ClanQuestPanel keys its "am I in a guild" effect on. */
const profile = {
  name: "Ada",
  clan: { id: "clan_nb", name: "Nightly Builders", tag: "NB" },
  clanRole: "owner" as const,
};

beforeEach(() => {
  h.queries.clear();
  h.mutations.clear();
  h.queries.set(Q.me, profile);
  h.queries.set(Q.questClaims, []);
  h.queries.set(Q.feed, []);
});

afterEach(cleanup);

/* ------------------------- 1 · clan quest panel ------------------------- */

describe("ClanQuestPanel", () => {
  it("shows the active quest with live pooled progress", async () => {
    h.queries.set(Q.questView, activeQuest);
    render(<ClanQuestPanel />);

    expect(await screen.findByText("War Party")).toBeTruthy();
    expect(screen.getByText(/clan quest · this week/)).toBeTruthy();
    expect(screen.getByText(/7 \/ 12 lessons/)).toBeTruthy();
    expect(screen.getByText("58%")).toBeTruthy();
    expect(screen.getByText("+600 XP")).toBeTruthy();
    expect(screen.getByText(/2 contributing/)).toBeTruthy();
    expect(screen.getByText(/every member's progress counts toward the pool/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Claim reward/ })).toBeNull();
  });

  it("flips to a claim button on completion and banks the share", async () => {
    h.queries.set(Q.questView, doneQuest);
    const claim = vi.fn(() => Promise.resolve(300));
    h.mutations.set(M.claimQuestReward, claim);

    render(<ClanQuestPanel />);
    expect(await screen.findByText(/Quest complete — your share awaits/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Claim reward/ }));
    await waitFor(() => expect(claim).toHaveBeenCalledTimes(1));

    // The claim log re-renders the panel as "banked", not as a second button.
    cleanup();
    h.queries.set(Q.questClaims, [{ weekKey: WEEK, xp: 300 }]);
    render(<ClanQuestPanel />);
    expect(await screen.findByText(/Quest complete — reward banked ✓/)).toBeTruthy();
    expect(screen.getByText(/\+300 XP banked/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Claim reward/ })).toBeNull();
  });

  it("renders nothing for a free agent", async () => {
    h.queries.set(Q.questView, null);
    const { container } = render(<ClanQuestPanel />);
    await waitFor(() => expect(screen.queryByText("War Party")).toBeNull());
    expect(container.innerHTML).toBe("");
  });
});

/* --------------------------- 2 · activity feed --------------------------- */

describe("ClanFeed", () => {
  it("renders recent guild events, newest first, with attribution", async () => {
    h.queries.set(Q.feed, [
      {
        _id: "e1",
        kind: "quest-done",
        text: "Ada completed the last leg of “War Party”",
        createdAt: Date.now(),
        actorName: "Ada",
        actorAscension: "adept",
        actorLevel: 4,
        isMe: true,
      },
      {
        _id: "e2",
        kind: "promotion",
        text: "Lin was promoted to officer",
        createdAt: Date.now() - 60_000,
        actorName: "Lin",
        actorAscension: "apprentice",
        actorLevel: 2,
        isMe: false,
      },
      {
        _id: "e3",
        kind: "kick",
        text: "Sam was removed from the guild",
        createdAt: Date.now() - 3_600_000,
        actorName: "Sam",
        actorAscension: "initiate",
        actorLevel: 1,
        isMe: false,
      },
    ]);

    render(<ClanFeed />);
    expect(await screen.findByText(/guild chronicle/)).toBeTruthy();
    expect(screen.getByText("Ada completed the last leg of “War Party”")).toBeTruthy();
    expect(screen.getByText("Lin was promoted to officer")).toBeTruthy();
    expect(screen.getByText("Sam was removed from the guild")).toBeTruthy();
    expect(screen.getByText("you")).toBeTruthy();
    expect(screen.getByText("now")).toBeTruthy();
    expect(screen.getByText("1m")).toBeTruthy();
    expect(screen.getByText("1h")).toBeTruthy();
  });

  it("explains the empty hall instead of showing a blank list", async () => {
    render(<ClanFeed />);
    expect(await screen.findByText(/Quiet in the hall/)).toBeTruthy();
  });
});

/* ------------------------ 3 · roster role controls ------------------------ */

function renderRoster(view: ClanView) {
  return render(
    <MemoryRouter>
      <MyGuild guild={view} />
    </MemoryRouter>
  );
}

describe("guild roster", () => {
  it("lets the founder promote a member to officer, and demote one back", async () => {
    const setRole = vi.fn(() => Promise.resolve());
    h.mutations.set(M.setRole, setRole);
    renderRoster(guild);

    expect(await screen.findByText("Nightly Builders")).toBeTruthy();
    expect(screen.getByText("founder")).toBeTruthy();
    expect(screen.getByText("officer")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Manage Sam" }));
    fireEvent.click(await screen.findByRole("button", { name: /^promote$/ }));
    await waitFor(() =>
      expect(setRole).toHaveBeenCalledWith({ userId: "u_sam", officer: true })
    );

    // An officer row demotes instead of promoting.
    fireEvent.click(screen.getByRole("button", { name: "Manage Lin" }));
    fireEvent.click(await screen.findByRole("button", { name: /^demote$/ }));
    await waitFor(() =>
      expect(setRole).toHaveBeenCalledWith({ userId: "u_lin", officer: false })
    );
  });

  it("arms a kick on the first tap and fires on the second", async () => {
    const kick = vi.fn(() => Promise.resolve());
    h.mutations.set(M.kick, kick);
    renderRoster(guild);

    fireEvent.click(await screen.findByRole("button", { name: "Manage Sam" }));
    fireEvent.click(screen.getByRole("button", { name: /^kick$/ }));
    expect(kick).not.toHaveBeenCalled(); // primed, not fired
    fireEvent.click(screen.getByRole("button", { name: /^sure\?$/ }));
    await waitFor(() => expect(kick).toHaveBeenCalledWith({ userId: "u_sam" }));
  });

  it("hides the controls from a plain member and never targets yourself", async () => {
    renderRoster({ ...guild, isOwner: false, myRole: "member" });
    await screen.findByText("Nightly Builders");
    expect(screen.queryByRole("button", { name: /Manage/ })).toBeNull();
  });

  it("gives officers removal power over members but not over each other", async () => {
    const kick = vi.fn(() => Promise.resolve());
    h.mutations.set(M.kick, kick);
    renderRoster({ ...guild, isOwner: false, myRole: "officer" });

    // Sam (member) can be removed…
    fireEvent.click(await screen.findByRole("button", { name: "Manage Sam" }));
    expect(screen.getByRole("button", { name: /^kick$/ })).toBeTruthy();
    // …and officers can't promote anyone.
    expect(screen.queryByRole("button", { name: /^promote$/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Close menu" }));

    // …but Lin (officer) and Ada (founder) have no menu at all.
    expect(screen.queryByRole("button", { name: "Manage Lin" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Manage Ada" })).toBeNull();
  });
});
