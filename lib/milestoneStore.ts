/* ------------------------------------------------------------------ */
/* Milestone claims — a localStorage claim log (see localStore.ts).    */
/*                                                                     */
/* Kept deliberately separate from `progress`: the progress map is a   */
/* numeric score map, while a project claim is a dated attestation     */
/* that merges by its own rule. The task is stored on the same Convex  */
/* row but in its own field, so neither merge can corrupt the other.   */
/* Local storage stays the source of truth while signed out.          */
/* ------------------------------------------------------------------ */

import { createLocalStore, readRecord, useLocalStore } from "./localStore";
import {
  mergeClaims,
  milestoneXpTotal,
  type Claim,
  type Claims,
} from "./milestones";

const KEY = "clr-milestones-v1";

/**
 * Only a dated tick list is a claim; anything else is dropped. The same rule
 * the backend enforces, applied on the way in, so a hand-edited entry can't
 * reach the "shipped" tiles and break their rendering.
 */
function sanitizeClaims(raw: unknown): Claims {
  const out: Claims = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    const { at, deliverables } = value as { at?: unknown; deliverables?: unknown };
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

const store = createLocalStore<Claims>(KEY, (raw) => sanitizeClaims(readRecord(raw)));

export function subscribeClaims(fn: () => void): () => void {
  return store.subscribe(fn);
}

export function loadClaims(): Claims {
  return store.get();
}

export function saveClaims(claims: Claims) {
  store.set(claims);
}

/**
 * Merge a cloud claim log into the local one and persist. Used by the account
 * sync on pull; the merged log is also what gets pushed back, so both sides
 * converge rather than one overwriting the other.
 */
export function applyCloudClaims(cloud: Claims): Claims {
  const merged = mergeClaims(loadClaims(), cloud);
  saveClaims(merged);
  return merged;
}

/**
 * Record a milestone as shipped. The skill gate is enforced by the caller
 * (`milestoneStatus().unlocked`) and re-checked in the UI, so a stale claim
 * can never render as earned without its lessons behind it.
 */
export function claimMilestone(
  id: string,
  deliverables: number[],
  day: string
): Claims {
  const claims = loadClaims();
  const existing: Claim | undefined = claims[id];
  // Never downgrade a completed claim to a partial one.
  if (existing && existing.deliverables.length >= deliverables.length) return claims;
  const next: Claims = {
    ...claims,
    [id]: { at: day, deliverables: [...deliverables].sort((a, b) => a - b) },
  };
  saveClaims(next);
  return next;
}

export function resetClaims() {
  store.reset();
}

/* --------------------------- React bindings --------------------------- */

export function useClaims(): Claims {
  return useLocalStore(store);
}

/**
 * Non-hook reader for code that runs outside render — the profile sync in
 * `AccountProvider` publishes this to the leaderboard.
 */
export function currentMilestoneXp(): number {
  return milestoneXpTotal(loadClaims());
}
