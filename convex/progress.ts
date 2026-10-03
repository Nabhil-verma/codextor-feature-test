import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/** One shipped milestone: the day it was claimed and what was ticked off. */
type Claim = { at: string; deliverables: number[] };
type Claims = Record<string, Claim>;

/*
 * A signed-in client is still a trust boundary: `data` and `claims` arrive as
 * `v.any()`, so both maps are capped before they can be stored. Real maps are
 * ~86 lesson keys and 6 milestones, so these ceilings are only ever hit by a
 * bug or a hostile client — and they stop one row from growing unbounded.
 */
const MAX_PROGRESS_ENTRIES = 2_000;
const MAX_CLAIMS = 64;
const MAX_ATTEMPTS = 2_000;
const MAX_KEY_LENGTH = 120;

/**
 * One lesson's aggregated attempt record. The client owns the first-attempt
 * score (it is the only side that sees attempts in order); the server's job is
 * to keep the *earliest* first, the *highest* best and the *largest* count, so
 * a second device can only ever add information — never rewind it.
 */
type AttemptAgg = {
  first: number;
  best: number;
  attempts: number;
  at: number;
};
type Attempts = Record<string, AttemptAgg>;

/**
 * Claims, validated the way `sanitize` validates scores: a malformed client
 * must not be able to store junk that breaks every later merge. The date is
 * normalised to a day key and the deliverables to a sorted set of integers.
 */
function sanitizeClaims(raw: unknown): Claims {
  const out: Claims = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (Object.keys(out).length >= MAX_CLAIMS) break;
    if (id.length > MAX_KEY_LENGTH) continue;
    if (!value || typeof value !== "object") continue;
    const { at, deliverables } = value as {
      at?: unknown;
      deliverables?: unknown;
    };
    if (typeof at !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(at)) continue;
    if (!Array.isArray(deliverables)) continue;
    const ticks = [
      ...new Set(
        deliverables
          .map((n) => (typeof n === "number" ? n : Number(n)))
          .filter((n) => Number.isInteger(n) && n >= 0)
      ),
    ].sort((a, b) => a - b);
    if (ticks.length === 0) continue;
    out[id] = { at, deliverables: ticks };
  }
  return out;
}

/**
 * Union of two claim logs, matching `mergeClaims` in `src/lib/milestones.ts`
 * exactly: the claim with more ticked deliverables wins, ties go to the
 * earlier date. Commutative and associative, so a push and a pull converging
 * from either side land on the same log.
 */
function mergeClaims(a: Claims, b: Claims): Claims {
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

/**
 * Attempts arrive as `v.any()`, so they get the same treatment as scores: a
 * malformed entry is dropped, values are clamped to 0..1, counts are coerced
 * to non-negative integers, and the whole map is capped.
 */
function sanitizeAttempts(raw: unknown): Attempts {
  const out: Attempts = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (Object.keys(out).length >= MAX_ATTEMPTS) break;
    if (key.length === 0 || key.length > MAX_KEY_LENGTH) continue;
    if (!value || typeof value !== "object") continue;
    const { first, best, attempts, at } = value as Record<string, unknown>;
    const f = typeof first === "number" ? first : Number(first);
    const b = typeof best === "number" ? best : Number(best);
    const n = typeof attempts === "number" ? attempts : Number(attempts);
    const t = typeof at === "number" ? at : Number(at);
    if (!Number.isFinite(f) || !Number.isFinite(b)) continue;
    if (!Number.isFinite(n) || n < 1) continue;
    out[key] = {
      first: Math.min(1, Math.max(0, f)),
      best: Math.min(1, Math.max(0, b)),
      attempts: Math.min(100_000, Math.floor(n)),
      at: Number.isFinite(t) ? t : 0,
    };
  }
  return out;
}

/**
 * Union of two attempt maps. `first` keeps the value from the record with the
 * earlier `at` (the genuinely first attempt wins, whichever device saw it),
 * `best` takes the max, `attempts` the max, `at` the max. Commutative and
 * idempotent in both copies, exactly like the score and claim merges.
 */
function mergeAttempts(a: Attempts, b: Attempts): Attempts {
  const out: Attempts = { ...a };
  for (const [key, next] of Object.entries(b)) {
    const mine = out[key];
    if (!mine) {
      out[key] = next;
      continue;
    }
    const firstWins = next.at < mine.at ? next.first : mine.first;
    out[key] = {
      first: firstWins,
      best: Math.max(mine.best, next.best),
      attempts: Math.max(mine.attempts, next.attempts),
      at: Math.max(mine.at, next.at),
    };
  }
  return out;
}

/**
 * Progress is a flat `"${track}/${lesson}!${YYYY-MM-DD}" -> 0..1` map. Every
 * value is coerced to a finite number in [0,1] before it touches the database:
 * `Math.max` against a non-number yields NaN, which would then poison the whole
 * map for every future read and merge.
 */
function sanitize(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (Object.keys(out).length >= MAX_PROGRESS_ENTRIES) break;
    if (key.length > MAX_KEY_LENGTH) continue;
    const n = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(n)) out[key] = Math.min(1, Math.max(0, n));
  }
  return out;
}

/** Load the signed-in user's saved progress map, or null when signed out. */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const row = await ctx.db
      .query("progress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    return sanitize(row?.data);
  },
});

/**
 * Upsert the signed-in user's progress map. Merges with whatever is already
 * stored (best score per key wins) so a second device never erases the first.
 */
export const save = mutation({
  args: { data: v.any() },
  handler: async (ctx, { data }) => {
    const userId = await getAuthUserId(ctx);
    // Signed out (e.g. a debounced push that lands after sign-out): drop it.
    // Progress stays local, and there is no account to merge into.
    if (!userId) return;
    const incoming = sanitize(data);
    const row = await ctx.db
      .query("progress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (row) {
      const merged = sanitize(row.data);
      for (const [key, score] of Object.entries(incoming)) {
        merged[key] = Math.max(merged[key] ?? 0, score);
      }
      await ctx.db.patch(row._id, { data: merged, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("progress", {
        userId,
        data: incoming,
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Load the signed-in user's milestone claims, or null when signed out.
 * Kept beside `get` rather than folded into it so the two maps keep their own
 * merge rules (best score per key vs. best claim per milestone).
 */
export const getClaims = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const row = await ctx.db
      .query("progress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    return sanitizeClaims(row?.claims);
  },
});

/**
 * Upsert the signed-in user's milestone claims, merged with whatever is
 * already stored so shipping on a second device never erases the first.
 */
export const saveClaims = mutation({
  args: { claims: v.any() },
  handler: async (ctx, { claims }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const incoming = sanitizeClaims(claims);
    if (Object.keys(incoming).length === 0) return;
    const row = await ctx.db
      .query("progress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (row) {
      await ctx.db.patch(row._id, {
        claims: mergeClaims(sanitizeClaims(row.claims), incoming),
        updatedAt: Date.now(),
      });
    } else {
      // A learner can claim a milestone before any lesson score has synced,
      // so the row has to be created here too — with an empty score map.
      await ctx.db.insert("progress", {
        userId,
        data: {},
        claims: incoming,
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Load the signed-in user's attempt aggregates, or null when signed out.
 * Kept beside `get`/`getClaims` so each map keeps its own merge rule.
 */
export const getAttempts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const row = await ctx.db
      .query("progress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    return sanitizeAttempts(row?.attempts);
  },
});

/**
 * Upsert attempt aggregates, merged with whatever is stored so a second
 * device's history is folded in rather than overwritten.
 */
export const saveAttempts = mutation({
  args: { attempts: v.any() },
  handler: async (ctx, { attempts }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const incoming = sanitizeAttempts(attempts);
    if (Object.keys(incoming).length === 0) return;
    const row = await ctx.db
      .query("progress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (row) {
      await ctx.db.patch(row._id, {
        attempts: mergeAttempts(sanitizeAttempts(row.attempts), incoming),
        updatedAt: Date.now(),
      });
    } else {
      // Attempts can land before any score or claim has synced.
      await ctx.db.insert("progress", {
        userId,
        data: {},
        attempts: incoming,
        updatedAt: Date.now(),
      });
    }
  },
});

/** Wipe the signed-in user's cloud progress (local reset is client-side). */
export const wipe = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const row = await ctx.db
      .query("progress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (row) await ctx.db.delete(row._id);
  },
});
