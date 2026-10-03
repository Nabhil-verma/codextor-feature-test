/* ═══════════════════════════════════════════════════════════════
   Banked clan-quest rewards. The server enforces one claim per
   (user, week); this log records what was banked so the pushed
   player card can include it in all-time XP. Same shape as the
   milestone claim log — a store from localStore.ts.
   ═══════════════════════════════════════════════════════════════ */

import { createLocalStore, readRecord } from "./localStore";

const KEY = "clr-clan-rewards-v1";

/** weekKey → banked reward XP for that week's quest. */
type ClanClaims = Record<string, number>;

const store = createLocalStore<ClanClaims>(KEY, (raw) => {
  const out: ClanClaims = {};
  for (const [k, v] of Object.entries(readRecord(raw))) {
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n) && n > 0) out[k] = n;
  }
  return out;
});

/** Record a freshly banked weekly reward (server already validated it). */
export function bankClanReward(weekKey: string, xp: number) {
  const claims = store.get();
  if (claims[weekKey] !== undefined) return;
  store.set({ ...claims, [weekKey]: xp });
}

/** Total banked reward XP — added to the pushed all-time player card. */
export function clanRewardXp(): number {
  return Object.values(store.get()).reduce((n, v) => n + v, 0);
}

/** Drop every banked reward — part of a full local reset. */
export function resetClanRewards() {
  store.reset();
}
