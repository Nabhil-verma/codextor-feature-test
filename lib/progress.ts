import { createLocalStore, readRecord, useLocalStore } from "./localStore";

const KEY = "clr-progress-v2";
/** Pre-v2 keys had no date suffix — migrated once on load. */
const LEGACY_KEYS = ["clr-progress-v1", "clr-progress"];

export type Progress = {
  /** lesson key `${trackId}/${lessonId}!${YYYY-MM-DD}` -> best quiz score (0..1) */
  completed: Record<string, number>;
};

export const EMPTY_PROGRESS: Progress = { completed: {} };


/** Stable part of a stored key: `web/html!2026-09-01` → `web/html`. */
export function lessonIdOf(key: string): string {
  return key.split("!")[0];
}

/* ------------------------------------------------------------------ */
/* Validation: the stored map is the one input to every XP number, so   */
/* a hand-edited or half-written entry must not be able to poison it.  */
/* Values are coerced to a finite 0..1 score (the same rule the Convex  */
/* layer applies before a map touches the database); keys are kept as   */
/* written, because pre-v2 keys legitimately have no date suffix.       */
/* ------------------------------------------------------------------ */

function sanitizeScores(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const n = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(n)) out[key] = Math.min(1, Math.max(0, n));
  }
  return out;
}

/** Migration: v1 keys (`track/lesson`) → v2 (`track/lesson!date`). */
function migrateV1(completed: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(completed)) {
    out[k.includes("!") ? k : k + "!"] = v;
  }
  return out;
}

/** One raw value, or `null` when there is no storage to read from. */
function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Read the stored progress, migrating a pre-v2 key the first time it's seen.
 * An old score keeps its value; the completion day is unknowable, so migrated
 * keys count as completed without fabricating streak days.
 *
 * Never throws: a half-written entry in any of the three keys is a corrupt
 * cache, not a reason to lose the page.
 */
function parseProgress(raw: string | null): Progress {
  try {
    if (raw !== null) {
      const stored = readRecord(raw);
      if (stored.completed !== undefined) return { completed: sanitizeScores(stored.completed) };
    }
    for (const legacy of LEGACY_KEYS) {
      const old = readRaw(legacy);
      if (old === null) continue;
      const stored = readRecord(old);
      if (stored.completed !== undefined) {
        return { completed: migrateV1(sanitizeScores(stored.completed)) };
      }
    }
  } catch {
    // Unparseable JSON — fall through to fresh state.
  }
  return { completed: {} };
}

const store = createLocalStore<Progress>(KEY, parseProgress);

/* ------------------------------------------------------------------ */
/* Pub/sub — every view re-renders when progress changes.              */
/* ------------------------------------------------------------------ */

export function subscribeProgress(fn: () => void): () => void {
  return store.subscribe(fn);
}

/* ------------------------------------------------------------------ */
/* Core store                                                          */
/* ------------------------------------------------------------------ */

export function loadProgress(): Progress {
  return store.get();
}

export function saveProgress(p: Progress) {
  store.set(p);
}

/**
 * Record a lesson completion under today's date key.
 * `score` is the best quiz score (0..1); the best score per lesson wins.
 */
export function recordLesson(key: string, score: number, dateKey: string): Progress {
  const p = loadProgress();
  const best = scoreFor(p, key);
  if (score <= best) return p;
  p.completed[key + "!" + dateKey] = score;
  saveProgress(p);
  return p;
}

/** Best score a learner has for a lesson key, across all days. */
export function scoreFor(p: Progress, key: string): number {
  let best = 0;
  for (const [k, v] of Object.entries(p.completed)) {
    if (lessonIdOf(k) === key) best = Math.max(best, v);
  }
  return best;
}

/**
 * Record helper compatible with callers/tests that don't care about dates:
 * stamps today's date automatically. Prefer `recordLesson(key, score, day)`
 * when the day is meaningful (e.g. backfilling history).
 */
export function recordProgress(key: string, score: number): Progress {
  return recordLesson(key, score, todayKey());
}

function todayKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function resetLocalProgress() {
  store.reset();
  for (const legacy of LEGACY_KEYS) {
    try {
      localStorage.removeItem(legacy);
    } catch {
      // ignore
    }
  }
}

/** Union of two progress objects, keeping the best score per (lesson, day). */
export function mergeProgress(a: Progress, b: Progress): Progress {
  const merged: Progress = { completed: { ...a.completed } };
  for (const [k, v] of Object.entries(b.completed)) {
    merged.completed[k] = Math.max(merged.completed[k] ?? 0, v);
  }
  return merged;
}

/* ------------------------------------------------------------------ */
/* React bindings                                                      */
/* ------------------------------------------------------------------ */

export function useProgressState(): Progress {
  return useLocalStore(store);
}

export function useProgress() {
  return {
    get: loadProgress,
    record: recordLesson,
    reset: resetLocalProgress,
  };
}
