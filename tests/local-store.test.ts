// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalStore, migrateStorageKey, readRecord } from "../src/lib/localStore";
import { claimMilestone, loadClaims, resetClaims } from "../src/lib/milestoneStore";
import { bankClanReward, clanRewardXp, resetClanRewards } from "../src/lib/clanRewards";

/*
 * One storage primitive backs progress, milestone claims, guild rewards, AI
 * settings and the theme, so its failure modes are the app's failure modes:
 * corrupt JSON, a missing localStorage (private mode) and a hand-edited entry
 * all have to degrade to the default instead of throwing inside a render.
 */

const realLocalStorage = globalThis.localStorage;

beforeEach(() => localStorage.clear());
afterEach(() => {
  vi.unstubAllGlobals();
  if (realLocalStorage) vi.stubGlobal("localStorage", realLocalStorage);
});

describe("the local store primitive", () => {
  it("round-trips a value through storage", () => {
    const store = createLocalStore<string[]>("test-round-trip", (raw) =>
      raw === null ? [] : (JSON.parse(raw) as string[])
    );
    expect(store.get()).toEqual([]);
    store.set(["a", "b"]);
    expect(store.get()).toEqual(["a", "b"]);
    expect(JSON.parse(localStorage.getItem("test-round-trip")!)).toEqual(["a", "b"]);
  });

  it("notifies subscribers until they unsubscribe", () => {
    const store = createLocalStore<number>("test-subscribe", (raw) =>
      raw === null ? 0 : Number(raw)
    );
    let calls = 0;
    const unsubscribe = store.subscribe(() => calls++);
    store.set(1);
    expect(calls).toBe(1);
    unsubscribe();
    store.set(2);
    expect(calls).toBe(1);
  });

  it("falls back to the default when the stored value is corrupt", () => {
    localStorage.setItem("test-corrupt", "{not json");
    // The parser owns validation and may throw; the store retries it with
    // `null`, which every parser must accept as "nothing stored".
    const store = createLocalStore<string>("test-corrupt", (raw) =>
      raw === null ? "default" : (JSON.parse(raw) as { name: string }).name
    );
    expect(store.get()).toBe("default");
  });

  it("survives a missing localStorage in both directions", () => {
    vi.stubGlobal("localStorage", undefined);
    const store = createLocalStore<number>("test-no-storage", (raw) =>
      raw === null ? 7 : Number(raw)
    );
    expect(store.get()).toBe(7);
    expect(() => store.set(1)).not.toThrow();
    expect(() => store.reset()).not.toThrow();
  });

  it("reads only JSON objects as records", () => {
    expect(readRecord(null)).toEqual({});
    expect(readRecord("[]")).toEqual({});
    expect(readRecord("3")).toEqual({});
    expect(readRecord('{"a":1}')).toEqual({ a: 1 });
  });
});

describe("stores built on it keep their own validation", () => {
  it("drops malformed milestone claims and keeps well-formed ones", () => {
    localStorage.setItem(
      "clr-milestones-v1",
      JSON.stringify({
        "m-good": { at: "2026-05-01", deliverables: [2, 0] },
        "m-bad-date": { at: "yesterday", deliverables: [0] },
        "m-no-ticks": { at: "2026-05-01", deliverables: [] },
        "m-not-object": 7,
      })
    );
    expect(loadClaims()).toEqual({ "m-good": { at: "2026-05-01", deliverables: [0, 2] } });
  });

  it("never downgrades a claim that is already recorded", () => {
    claimMilestone("m-1", [0, 1, 2], "2026-05-01");
    claimMilestone("m-1", [0], "2026-05-02");
    expect(loadClaims()["m-1"]).toEqual({ at: "2026-05-01", deliverables: [0, 1, 2] });
  });

  it("clears claims on reset — a full reset must not leave rewards behind", () => {
    claimMilestone("m-1", [0], "2026-05-01");
    resetClaims();
    expect(loadClaims()).toEqual({});
  });

  it("banked guild rewards add up, ignore junk, and clear on reset", () => {
    localStorage.setItem(
      "clr-clan-rewards-v1",
      JSON.stringify({ "2026-W39": 600, "2026-W40": "not a number", "2026-W41": -5 })
    );
    expect(clanRewardXp()).toBe(600);
    bankClanReward("2026-W41", 800);
    expect(clanRewardXp()).toBe(1400);
    // One claim per week: a second bank for the same week is ignored.
    bankClanReward("2026-W41", 900);
    expect(clanRewardXp()).toBe(1400);
    resetClanRewards();
    expect(clanRewardXp()).toBe(0);
  });
});

describe("legacy key migration", () => {
  it("copies the old value onto the new key, then deletes the old one", () => {
    localStorage.setItem("old-key", JSON.stringify({ a: 1 }));
    migrateStorageKey("old-key", "new-key");
    expect(JSON.parse(localStorage.getItem("new-key")!)).toEqual({ a: 1 });
    expect(localStorage.getItem("old-key")).toBeNull();
  });

  it("leaves both keys alone when the new key already has data", () => {
    localStorage.setItem("old-key", "stale");
    localStorage.setItem("new-key", "live");
    migrateStorageKey("old-key", "new-key");
    expect(localStorage.getItem("new-key")).toBe("live");
    expect(localStorage.getItem("old-key")).toBe("stale");
  });

  it("no-ops when nothing is stored under either key", () => {
    migrateStorageKey("absent-old", "absent-new");
    expect(localStorage.getItem("absent-new")).toBeNull();
  });

  it("stays silent when storage is unavailable", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(() => migrateStorageKey("old-key", "new-key")).not.toThrow();
  });

  // The generic helper above only matters if the app's own keys actually use
  // it — importing the component runs the migration exactly as a page load
  // does, so this fails if the wiring is ever dropped.
  it("renames the solution feed's unversioned keys on import", async () => {
    const solutions = {
      "web/hello": [{ id: "s1", author: "You", code: "console.log(1)", votes: 2 }],
    };
    localStorage.setItem("cl_solutions", JSON.stringify(solutions));
    localStorage.setItem("cl_votes", JSON.stringify(["s1"]));
    vi.resetModules();
    await import("../src/components/SolutionFeed");
    expect(localStorage.getItem("cl_solutions")).toBeNull();
    expect(localStorage.getItem("cl_votes")).toBeNull();
    expect(JSON.parse(localStorage.getItem("clr_solutions")!)).toEqual(solutions);
    expect(JSON.parse(localStorage.getItem("clr_votes")!)).toEqual(["s1"]);
  });
});
