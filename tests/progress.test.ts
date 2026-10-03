import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  loadProgress,
  saveProgress,
  recordProgress,
  recordLesson,
  scoreFor,
  lessonIdOf,
  resetLocalProgress,
  mergeProgress,
  subscribeProgress,
} from "../src/lib/progress";

// Minimal localStorage stub (jsdom-free)
const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
});

beforeEach(() => store.clear());

describe("progress", () => {
  it("returns empty progress when nothing stored", () => {
    expect(loadProgress()).toEqual({ completed: {} });
  });

  it("saves and loads round-trip", () => {
    saveProgress({ completed: { "web/html-semantic!2026-09-13": 1 } });
    expect(loadProgress().completed["web/html-semantic!2026-09-13"]).toBe(1);
  });

  it("handles corrupted storage gracefully", () => {
    store.set("clr-progress-v1", "{not json");
    expect(loadProgress()).toEqual({ completed: {} });
  });

  it("tolerates legacy no-date keys inside v2 storage (scoreFor still finds them)", () => {
    store.set("clr-progress-v2", JSON.stringify({ completed: { "web/old": 1 } }));
    expect(loadProgress().completed["web/old"]).toBe(1);
    expect(scoreFor(loadProgress(), "web/old")).toBe(1);
  });

  it("ignores a missing localStorage", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(() => saveProgress({ completed: { x: 1 } })).not.toThrow();
    expect(loadProgress()).toEqual({ completed: {} });
    // restore for other tests
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
  });
});

describe("lessonIdOf", () => {
  it("strips the date suffix from v2 keys", () => {
    expect(lessonIdOf("web/html!2026-09-01")).toBe("web/html");
    expect(lessonIdOf("web/html!")).toBe("web/html");
    expect(lessonIdOf("web/html")).toBe("web/html");
  });
});

describe("recordProgress / recordLesson", () => {
  it("records a lesson under today's date", () => {
    recordProgress("dsa/hash-maps", 1);
    const keys = Object.keys(loadProgress().completed);
    expect(keys).toHaveLength(1);
    expect(lessonIdOf(keys[0])).toBe("dsa/hash-maps");
    expect(keys[0]).toMatch(/^dsa\/hash-maps!\d{4}-\d{2}-\d{2}$/);
    expect(scoreFor(loadProgress(), "dsa/hash-maps")).toBe(1);
  });

  it("recordLesson accepts an explicit date key", () => {
    recordLesson("web/variables", 1, "2026-09-01");
    expect(loadProgress().completed["web/variables!2026-09-01"]).toBe(1);
  });

  it("keeps the best score across days, never regresses", () => {
    recordLesson("web/variables", 0.5, "2026-09-01");
    recordLesson("web/variables", 0.25, "2026-09-02"); // wouldn't improve 0.5 — write skipped
    recordLesson("web/variables", 1, "2026-09-03");
    expect(scoreFor(loadProgress(), "web/variables")).toBe(1);
    // Days that improved the score are kept separately — that's what powers
    // streaks — while scoreFor always returns the best across all of them.
    expect(Object.keys(loadProgress().completed)).toHaveLength(2);
    expect(loadProgress().completed["web/variables!2026-09-01"]).toBe(0.5);
    expect(loadProgress().completed["web/variables!2026-09-03"]).toBe(1);
  });

  it("skips writes entirely when the score would not change", () => {
    recordLesson("web/variables", 1, "2026-09-01");
    let notified = 0;
    const unsub = subscribeProgress(() => void notified++);
    recordLesson("web/variables", 1, "2026-09-02"); // best already 1 — no write
    expect(notified).toBe(0);
    recordLesson("web/variables", 0, "2026-09-03"); // max(1,0)=1 — still no change
    expect(notified).toBe(0);
    unsub();
  });

  it("notifies subscribers on change", () => {
    let calls = 0;
    const unsub = subscribeProgress(() => calls++);
    recordProgress("git/git-basics", 1);
    expect(calls).toBe(1);
    unsub();
  });
});

describe("resetLocalProgress", () => {
  it("clears the store and the legacy keys", () => {
    saveProgress({ completed: { "web/variables!2026-09-13": 1 } });
    store.set("clr-progress", '{"completed":{"old":1}}'); // pre-rename key
    resetLocalProgress();
    expect(loadProgress()).toEqual({ completed: {} });
    expect(store.has("clr-progress")).toBe(false);
    expect(store.has("clr-progress-v1")).toBe(false);
  });
});

describe("mergeProgress", () => {
  it("unions two progress objects keeping the best score", () => {
    const merged = mergeProgress(
      { completed: { "web/variables!2026-09-01": 1, "dsa/arrays!2026-09-01": 0.5 } },
      { completed: { "dsa/arrays!2026-09-01": 1, "git/git-basics!2026-09-02": 1 } }
    );
    expect(merged.completed).toEqual({
      "web/variables!2026-09-01": 1,
      "dsa/arrays!2026-09-01": 1,
      "git/git-basics!2026-09-02": 1,
    });
  });

  it("is safe when either side is empty", () => {
    expect(mergeProgress({ completed: {} }, { completed: { a: 1 } }).completed).toEqual({ a: 1 });
    expect(mergeProgress({ completed: { a: 1 } }, { completed: {} }).completed).toEqual({ a: 1 });
    expect(mergeProgress({ completed: {} }, { completed: {} }).completed).toEqual({});
  });

  it("does not mutate its inputs", () => {
    const a = { completed: { x: 0.5 } };
    const b = { completed: { x: 1 } };
    mergeProgress(a, b);
    expect(a.completed.x).toBe(0.5);
    expect(b.completed.x).toBe(1);
  });
});
