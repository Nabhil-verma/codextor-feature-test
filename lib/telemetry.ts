/* ═══════════════════════════════════════════════════════════════
   Attempt-level telemetry.

   The progress map answers "what is this learner's best score?"
   (best-per-key, max-merged across days). It cannot answer the three
   questions the V2.1 pilot's gates actually ask:

     - what did they score on their *first* attempt? (best-score-only
       tracking converges on 1.0 for a persistent guesser, so it cannot
       measure a catch rate against chance)
     - how many attempts did the review take?
     - did the rubric pass while the quiz did not? (all graders write
       the same lesson key, so completion is not attributable)

   Every graded submission is appended here instead: element-attributed,
   day-stamped, capped, and never allowed to break the page (same
   storage contract as every other store — see `localStore.ts`).

   Local-first and additive: no Convex schema or function changes. The
   gate statistics are derived on read, so nothing has to be
   pre-aggregated and the raw log stays the source of truth.
   ═══════════════════════════════════════════════════════════════ */

import { createLocalStore, readRecord } from "./localStore";

const KEY = "clr-attempts-v1"; // additive local store; no Convex changes

/** Which grader produced a score. Sort/preview are pass-only, no score. */
export type AttemptElement = "quiz" | "debug" | "diff" | "repo" | "rubric";

export type Attempt = {
  /** lesson key: `${trackId}/${lessonId}` */
  key: string;
  element: AttemptElement;
  /** the submitted score, clamped to 0..1 */
  score: number;
  /** `YYYY-MM-DD` (UTC) the attempt was recorded on */
  day: string;
  /** epoch ms — ordering within a day */
  at: number;
};

export type Telemetry = {
  attempts: Attempt[];
  /**
   * Attempt aggregates pulled from the account (a second device's history).
   * Kept beside the raw log, never merged into it: the raw log is this
   * device's evidence, the remote map is the union the gates read.
   */
  remote?: AttemptAggs;
};

/** Bounded so one learner's log cannot grow without limit. */
export const MAX_ATTEMPTS = 2000;

export const EMPTY_TELEMETRY: Telemetry = { attempts: [] };

export type AttemptAgg = {
  first: number;
  best: number;
  attempts: number;
  at: number;
};
export type AttemptAggs = Record<string, AttemptAgg>;

function sanitizeAggs(raw: unknown): AttemptAggs | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const out: AttemptAggs = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    const { first, best, attempts, at } = value as Record<string, unknown>;
    const f = typeof first === "number" ? first : Number(first);
    const b = typeof best === "number" ? best : Number(best);
    const n = typeof attempts === "number" ? attempts : Number(attempts);
    if (!Number.isFinite(f) || !Number.isFinite(b) || !Number.isFinite(n) || n < 1) continue;
    out[key] = {
      first: Math.min(1, Math.max(0, f)),
      best: Math.min(1, Math.max(0, b)),
      attempts: Math.floor(n),
      at: Number.isFinite(at) ? Number(at) : 0,
    };
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

const ELEMENTS: AttemptElement[] = ["quiz", "debug", "diff", "repo", "rubric"];

function sanitizeAttempt(raw: unknown): Attempt | null {
  if (!raw || typeof raw !== "object") return null;
  const { key, element, score, day, at } = raw as Record<string, unknown>;
  if (typeof key !== "string" || key.length === 0 || key.length > 160) return null;
  if (typeof element !== "string" || !ELEMENTS.includes(element as AttemptElement)) {
    return null;
  }
  const n = typeof score === "number" ? score : Number(score);
  if (!Number.isFinite(n)) return null;
  return {
    key,
    element: element as AttemptElement,
    score: Math.min(1, Math.max(0, n)),
    day: typeof day === "string" ? day.slice(0, 10) : "",
    at: typeof at === "number" && Number.isFinite(at) ? at : 0,
  };
}

function parseTelemetry(raw: string | null): Telemetry {
  try {
    const stored = readRecord(raw);
    if (Array.isArray(stored.attempts)) {
      return {
        attempts: stored.attempts
          .map(sanitizeAttempt)
          .filter((a): a is Attempt => a !== null),
        remote: sanitizeAggs(stored.remote),
      };
    }
  } catch {
    // Unparseable JSON — fall through to empty state.
  }
  return EMPTY_TELEMETRY;
}

const store = createLocalStore<Telemetry>(KEY, parseTelemetry);

export function subscribeTelemetry(fn: () => void): () => void {
  return store.subscribe(fn);
}

export function loadTelemetry(): Telemetry {
  return store.get();
}

/** Pure append with the cap applied — exported so the cap is testable. */
export function appendAttempt(
  t: Telemetry,
  attempt: Attempt,
  cap: number = MAX_ATTEMPTS
): Telemetry {
  return { ...t, attempts: [...t.attempts, attempt].slice(-cap) };
}

/**
 * Record one graded submission. A zero score is kept: a failed first
 * attempt is exactly the datum the gates need, and the progress map
 * (which ignores 0) deliberately stays untouched by it.
 */
export function recordAttempt(input: {
  key: string;
  element: AttemptElement;
  score: number;
  day: string;
  at?: number;
}): Telemetry {
  const attempt = sanitizeAttempt({
    ...input,
    at: input.at ?? Date.now(),
  });
  if (!attempt) return loadTelemetry();
  const next = appendAttempt(loadTelemetry(), attempt);
  store.set(next);
  return next;
}

export function resetTelemetry() {
  store.reset();
}

/* ------------------------- Cloud sync ------------------------- */

/**
 * The shape that crosses the network: one aggregate per lesson, not the raw
 * log. The gates need first / best / count, and a bounded row beats a growing
 * one — `at` is what lets the server tell which device saw the first attempt.
 */
export function aggregateAttempts(t: Telemetry): AttemptAggs {
  const out: AttemptAggs = {};
  for (const a of t.attempts) {
    const cur = out[a.key];
    if (!cur) {
      out[a.key] = { first: a.score, best: a.score, attempts: 1, at: a.at };
      continue;
    }
    const isEarlier = a.at < cur.at;
    out[a.key] = {
      first: isEarlier ? a.score : cur.first,
      best: Math.max(cur.best, a.score),
      attempts: cur.attempts + 1,
      at: Math.max(cur.at, a.at),
    };
  }
  return out;
}

/**
 * Merge a cloud aggregate map into the local log's view. Used on sign-in and
 * on every pull: the server may know about attempts this device never saw
 * (a second machine), so the UI reads the union while the raw log stays local.
 */
export function mergeAggregates(
  local: AttemptAggs,
  remote: AttemptAggs
): AttemptAggs {
  const out: AttemptAggs = { ...local };
  for (const [key, next] of Object.entries(remote)) {
    const mine = out[key];
    if (!mine) {
      out[key] = next;
      continue;
    }
    out[key] = {
      first: next.at < mine.at ? next.first : mine.first,
      best: Math.max(mine.best, next.best),
      attempts: Math.max(mine.attempts, next.attempts),
      at: Math.max(mine.at, next.at),
    };
  }
  return out;
}

/**
 * Record the account's aggregates on this device (sign-in and every pull).
 * Merged, never overwritten: this device may hold attempts the account has
 * not seen yet, and the union is what the gates should read.
 */
export function applyCloudAttempts(remote: AttemptAggs): Telemetry {
  const local = loadTelemetry();
  const merged = mergeAggregates(local.remote ?? {}, remote);
  const next: Telemetry = { ...local, remote: merged };
  store.set(next);
  return next;
}

/**
 * What the gate readouts should read: this device's log plus the account's
 * aggregates. Falls back to the local log alone when signed out.
 */
export function loadMergedAggs(): AttemptAggs {
  const t = loadTelemetry();
  const local = aggregateAttempts(t);
  return t.remote ? mergeAggregates(local, t.remote) : local;
}

/** Gate A's statistics over an aggregate map (works for local or merged). */
export function reviewGateFromAggs(
  aggs: AttemptAggs,
  key: string
): {
  attempts: number;
  first: number | null;
  best: number;
  firstClearedLine: boolean;
  firstFullCredit: boolean;
} {
  const agg = aggs[key];
  if (!agg) {
    return {
      attempts: 0,
      first: null,
      best: 0,
      firstClearedLine: false,
      firstFullCredit: false,
    };
  }
  return {
    attempts: agg.attempts,
    first: agg.first,
    best: agg.best,
    firstClearedLine: agg.first >= 0.7,
    firstFullCredit: agg.first >= 1,
  };
}

/* ------------------------- Aggregates ------------------------- */

/** Attempts for one lesson (optionally one element), oldest first. */
export function attemptsFor(
  t: Telemetry,
  key: string,
  element?: AttemptElement
): Attempt[] {
  return t.attempts.filter(
    (a) => a.key === key && (element === undefined || a.element === element)
  );
}

/** The score of the earliest recorded attempt, or null if there is none. */
export function firstScore(
  t: Telemetry,
  key: string,
  element?: AttemptElement
): number | null {
  const list = attemptsFor(t, key, element);
  if (list.length === 0) return null;
  return list.reduce((first, a) => (a.at < first.at ? a : first)).score;
}

/** The best recorded score, or 0 when nothing was attempted. */
export function bestScore(
  t: Telemetry,
  key: string,
  element?: AttemptElement
): number {
  return attemptsFor(t, key, element).reduce((best, a) => Math.max(best, a.score), 0);
}

export function attemptCount(
  t: Telemetry,
  key: string,
  element?: AttemptElement
): number {
  return attemptsFor(t, key, element).length;
}

/**
 * Gate B's input: did this element itself ever reach full credit? The
 * progress map cannot answer this because the quiz writes the same lesson
 * key as the rubric.
 */
export function elementCompleted(
  t: Telemetry,
  key: string,
  element: AttemptElement
): boolean {
  return attemptsFor(t, key, element).some((a) => a.score >= 1);
}

/**
 * Gate A's inputs for a review exercise, per learner: first-attempt score,
 * best score, attempt count, and whether the first attempt cleared the line
 * tier (0.7) or full credit (1.0).
 */
export function reviewGate(
  t: Telemetry,
  key: string
): {
  attempts: number;
  first: number | null;
  best: number;
  firstClearedLine: boolean;
  firstFullCredit: boolean;
} {
  const first = firstScore(t, key, "diff");
  return {
    attempts: attemptCount(t, key, "diff"),
    first,
    best: bestScore(t, key, "diff"),
    firstClearedLine: first !== null && first >= 0.7,
    firstFullCredit: first !== null && first >= 1,
  };
}

/**
 * The null model the diff ladder has to beat: a learner who picks a file and
 * a line uniformly at random scores 0.4 when the file is right and 0.7 when
 * file *and* line are right (the category is unguessable in a 10-code space).
 * For the shipped 5-file / 101-line exercise that is ≈ 0.081 — two orders of
 * magnitude below the 1.0 a real reviewer earns, which is why the gate must
 * be measured on first attempts and not on best-ever scores.
 */
export function chanceLadderMean(files: number, lines: number): number {
  if (files < 1 || lines < 1) return 0;
  return 0.4 / files + 0.7 / (files * lines);
}
