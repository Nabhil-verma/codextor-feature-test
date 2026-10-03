/* ═══════════════════════════════════════════════════════════════
   Guild collective rewards. Kept in a plain module (no Convex or
   React imports) so both the backend aggregation and the UI read
   from exactly one ladder.
   ═══════════════════════════════════════════════════════════════ */

type GuildTier = {
  id: string;
  name: string;
  /** pooled all-time XP needed for the tier */
  minXp: number;
  perk: string;
};

export const GUILD_TIERS: GuildTier[] = [
  { id: "band", name: "Band", minXp: 0, perk: "Shared guild banner" },
  { id: "company", name: "Company", minXp: 500, perk: "+1 guild streak shield" },
  { id: "order", name: "Order", minXp: 2_000, perk: "Guild aura on the leaderboard" },
  { id: "coterie", name: "Coterie", minXp: 6_000, perk: "Custom guild reward tag" },
  { id: "legend", name: "Legend", minXp: 15_000, perk: "Gilded guild crest + title" },
];

export const MAX_GUILD_MEMBERS = 25;

export function guildTierFor(totalXp: number) {
  let tier = GUILD_TIERS[0];
  for (const t of GUILD_TIERS) if (totalXp >= t.minXp) tier = t;
  const idx = GUILD_TIERS.indexOf(tier);
  const next = GUILD_TIERS[idx + 1] ?? null;
  return {
    tier,
    next,
    toNext: next ? next.minXp - totalXp : 0,
    pct: next
      ? Math.round(((totalXp - tier.minXp) / (next.minXp - tier.minXp)) * 100)
      : 100,
  };
}

/* ═══════════════════════════════════════════════════════════
   Clan co-op quests. One quest per clan per ISO week, chosen by a
   deterministic hash of the week key — every member's client and the
   server agree on the rotation with zero coordination.
   ═══════════════════════════════════════════════════════════ */

export type ClanQuestDef = {
  id: string;
  title: string;
  detail: string;
  metric: "lessons" | "xp" | "flawless";
  /** flat part of the pooled target — keeps a solo founder guild playable */
  baseTarget: number;
  /** added per member, so a full guild of 25 gets a bigger mountain */
  perMember: number;
  /** total reward XP, split evenly across contributors on completion */
  rewardXp: number;
};

export const CLAN_QUESTS: ClanQuestDef[] = [
  {
    id: "war-party",
    title: "War Party",
    detail: "The guild clears lessons together — every member's completions count.",
    metric: "lessons",
    baseTarget: 6,
    perMember: 2,
    rewardXp: 600,
  },
  {
    id: "xp-tithe",
    title: "The Tithe",
    detail: "Pooled weekly XP. Quest bonuses and consistency XP count too.",
    metric: "xp",
    baseTarget: 600,
    perMember: 80,
    rewardXp: 800,
  },
  {
    id: "perfect-vanguard",
    title: "Perfect Vanguard",
    detail: "Flawless 100% quiz runs, pooled across the whole guild.",
    metric: "flawless",
    baseTarget: 3,
    perMember: 1,
    rewardXp: 900,
  },
  {
    id: "night-watch",
    title: "Night Watch",
    detail: "A long march: pooled lessons with a stretch goal for big guilds.",
    metric: "lessons",
    baseTarget: 10,
    perMember: 3,
    rewardXp: 1100,
  },
];

/** ISO-8601 week key ("2026-W39") for a `YYYY-MM-DD` day, UTC. */
export function isoWeekKey(day: string): string {
  const d = new Date(day + "T00:00:00Z");
  const dayNr = (d.getUTCDay() + 6) % 7; // Mon = 0 … Sun = 6
  const thursday = new Date(d);
  thursday.setUTCDate(d.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  const ftDayNr = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - ftDayNr + 3);
  const week =
    1 +
    Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
  return thursday.getUTCFullYear() + "-W" + String(week).padStart(2, "0");
}

/** The week's quest — stable for everyone, everywhere. */
export function questDefForWeek(weekKey: string): ClanQuestDef {
  let h = 0;
  for (let i = 0; i < weekKey.length; i++) {
    h = (h * 31 + weekKey.charCodeAt(i)) >>> 0;
  }
  return CLAN_QUESTS[h % CLAN_QUESTS.length];
}

/** Pooled target scaled to the roster — a solo founder is never locked out. */
export function questTargetFor(def: ClanQuestDef, memberCount: number): number {
  return def.baseTarget + def.perMember * Math.max(1, memberCount);
}
