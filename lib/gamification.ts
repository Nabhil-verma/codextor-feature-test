/* ------------------------------------------------------------------ */
/* XP, daily streak, and badges — all derived from the progress store  */
/* so nothing new needs to be persisted.                               */
/* ------------------------------------------------------------------ */

import { tracks } from "../data";
import { lessonIdOf, scoreFor, type Progress } from "./progress";

/* ---------------------------- XP ---------------------------- */

/** XP for one lesson: base 50, +25 for a flawless (100%) quiz. */
function lessonXp(score: number): number {
  return 50 + (score >= 1 ? 25 : 0);
}

/* ---------------- Day buckets: XP grouped by calendar day ---------------- */

type DayBucket = {
  /** `YYYY-MM-DD`, or "" for legacy keys with no date stamp */
  day: string;
  /** lessons whose best score landed on this day */
  lessons: number;
  /** raw lesson XP earned this day (before quest bonuses) */
  xp: number;
  /** keys completed flawlessly on this day */
  flawless: number;
};

/**
 * The best score for one lesson, and the day that score landed. Partial
 * credit records a new day key every time a best score improves, so the map
 * can hold several keys for the same lesson (0.4 on Monday, 0.7 on Tuesday,
 * 1.0 on Wednesday). Everything below is computed per *lesson*, from this
 * single entry — otherwise one lesson pays its XP once per improving day.
 */
function lessonBests(progress: Progress): Map<string, { score: number; day: string }> {
  const bests = new Map<string, { score: number; day: string }>();
  for (const [key, score] of Object.entries(progress.completed)) {
    const id = lessonIdOf(key);
    const day = key.split("!")[1] ?? "";
    const prev = bests.get(id);
    if (!prev || score > prev.score) bests.set(id, { score, day });
  }
  return bests;
}

/**
 * Group the progress map by the day each lesson's best score landed. A
 * lesson counts once: on the day its current best was achieved (ties keep
 * the earliest day, so history is stable), which is also the day its XP and
 * flawless credit belong to.
 */
export function dayBuckets(progress: Progress): Map<string, DayBucket> {
  const map = new Map<string, DayBucket>();
  for (const best of lessonBests(progress).values()) {
    const b = map.get(best.day) ?? { day: best.day, lessons: 0, xp: 0, flawless: 0 };
    b.lessons += 1;
    b.xp += lessonXp(best.score);
    if (best.score >= 1) b.flawless += 1;
    map.set(best.day, b);
  }
  return map;
}

/** Sum of lesson XP only — exactly one payment per lesson, at its best score. */
export function lessonXpTotal(progress: Progress): number {
  let sum = 0;
  for (const { score } of lessonBests(progress).values()) sum += lessonXp(score);
  return sum;
}

/* ------------------ Daily quests + consistency bonus ------------------ */

/**
 * Quests are computed, not stored: every day's completion is replayed from
 * the progress map, so bonus XP is deterministic across devices and never
 * awarded twice. `bonus` is the real XP paid for finishing the quest.
 */
type QuestDef = {
  id: string;
  icon: string;
  title: string;
  detail: string;
  target: number;
  /** which per-day counter the target is measured against */
  metric: "lessons" | "xp" | "flawless";
  bonus: number;
};

export const DAILY_QUESTS: QuestDef[] = [
  {
    id: "show-up",
    icon: "⚔️",
    title: "First Blood",
    detail: "Finish 1 lesson today",
    target: 1,
    metric: "lessons",
    bonus: 60,
  },
  {
    id: "triple",
    icon: "🔥",
    title: "Triple Threat",
    detail: "Finish 3 lessons today",
    target: 3,
    metric: "lessons",
    bonus: 150,
  },
  {
    id: "xp-hunter",
    icon: "✦",
    title: "XP Hunter",
    detail: "Earn 200 XP today",
    target: 200,
    metric: "xp",
    bonus: 100,
  },
  {
    id: "flawless",
    icon: "◎",
    title: "Flawless Run",
    detail: "Score 100% on any lesson today",
    target: 1,
    metric: "flawless",
    bonus: 75,
  },
];

/** Bonus XP paid for whatever is left open on the day's quest list. */
export const STREAK_BONUS = 25;

function metricValue(b: DayBucket, metric: QuestDef["metric"]): number {
  if (metric === "lessons") return b.lessons;
  if (metric === "xp") return b.xp;
  return b.flawless;
}

/** Bonus from the daily quests on one day (quest completion only). */
export function dayQuestBonus(bucket: DayBucket | undefined): number {
  if (!bucket) return 0;
  let bonus = 0;
  for (const q of DAILY_QUESTS) {
    if (metricValue(bucket, q.metric) >= q.target) bonus += q.bonus;
  }
  return bonus;
}

/** `YYYY-MM-DD` for the previous calendar day. */
function prevDayKey(day: string): string {
  const d = new Date(day + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** XP paid for showing up two days running — the habit reward. */
function consistencyBonus(activeDays: Set<string>, day: string): number {
  return activeDays.has(prevDayKey(day)) ? STREAK_BONUS : 0;
}

function activeSet(buckets: Map<string, DayBucket>): Set<string> {
  return new Set([...buckets.keys()].filter((d) => d !== ""));
}

/** Every XP source on a single day: lessons + quests + consistency. */
function dayXp(buckets: Map<string, DayBucket>, days: Set<string>, day: string): number {
  const b = buckets.get(day);
  if (!b) return 0;
  return b.xp + dayQuestBonus(b) + consistencyBonus(days, day);
}

/**
 * XP earned between two `YYYY-MM-DD` days inclusive — the engine behind the
 * weekly and monthly leaderboard brackets.
 */
export function xpInRange(progress: Progress, fromDay: string, toDay: string): number {
  const buckets = dayBuckets(progress);
  const days = activeSet(buckets);
  let xp = 0;
  for (const key of days) {
    if (key < fromDay || key > toDay) continue;
    xp += dayXp(buckets, days, key);
  }
  return xp;
}

/** Lesson XP + quests + consistency, across all of history. */
export function totalXp(progress: Progress): number {
  const buckets = dayBuckets(progress);
  const days = activeSet(buckets);
  let xp = 0;
  for (const [key, b] of buckets) {
    // Legacy keys carry no date, so they only contribute their lesson XP.
    xp += key === "" ? b.xp : dayXp(buckets, days, key);
  }
  return xp;
}

/** Quest bonuses + consistency XP, lifetime. Shown as its own stat. */
export function bonusXpTotal(progress: Progress): number {
  return totalXp(progress) - lessonXpTotal(progress);
}

/**
 * The total the public player card publishes: everything the progress map
 * earns, plus XP banked outside it (shipped milestones, clan-quest rewards).
 * The leaderboard ranks on this number, so it lives behind one helper instead
 * of being re-derived at every call site.
 */
export function playerXp(progress: Progress, bonusXp = 0): number {
  return totalXp(progress) + Math.max(0, Math.floor(bonusXp));
}

/* ------------------ Daily quest board (today's view) ------------------ */

type QuestView = {
  id: string;
  icon: string;
  title: string;
  detail: string;
  progress: number;
  target: number;
  bonus: number;
  done: boolean;
};

/** Today's quests with live progress — drives the quest board UI. */
export function dailyQuests(progress: Progress, today: string): QuestView[] {
  const buckets = dayBuckets(progress);
  const bucket = buckets.get(today);
  return DAILY_QUESTS.map((q) => {
    const raw = bucket ? metricValue(bucket, q.metric) : 0;
    return {
      id: q.id,
      icon: q.icon,
      title: q.title,
      detail: q.detail,
      progress: Math.min(raw, q.target),
      target: q.target,
      bonus: q.bonus,
      done: raw >= q.target,
    };
  });
}

/** Quests finished today, out of the total — the "2/4" pill. */
export function questsDoneToday(progress: Progress, today: string): number {
  return dailyQuests(progress, today).filter((q) => q.done).length;
}

/* ------------------------- Bracket windows ------------------------- */

/** Monday of the current ISO week, as `YYYY-MM-DD`. */
export function weekStartKey(today: string): string {
  const d = new Date(today + "T00:00:00Z");
  const dow = (d.getUTCDay() + 6) % 7; // Mon = 0 … Sun = 6
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

/** First day of the current month, as `YYYY-MM-DD`. */
export function monthStartKey(today: string): string {
  return today.slice(0, 8) + "01";
}

/** 250 XP ≈ 4 lessons — one level. */
export const XP_PER_LEVEL = 250;

export function levelFor(xp: number) {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const intoLevel = xp % XP_PER_LEVEL;
  return {
    level,
    intoLevel,
    toNext: XP_PER_LEVEL - intoLevel,
    pct: Math.round((intoLevel / XP_PER_LEVEL) * 100),
  };
}

/* ------------------------- Daily streak ------------------------- */

export type Streak = { current: number; longest: number; lastDay: string | null };

/**
 * Streaks are computed from the sorted list of distinct days on which any
 * lesson was first-completed. `prevDays` is the set of "the day before X"
 * strings so the function stays pure and testable.
 */
export function computeStreak(
  progress: Progress,
  today: string,
  prevDays: Set<string>
): Streak {
  const daySet = new Set(
    Object.keys(progress.completed)
      .map((k) => k.split("!")[1])
      .filter((d): d is string => Boolean(d))
  );
  const days = [...daySet].sort();
  if (!days.length) return { current: 0, longest: 0, lastDay: null };

  // Longest run of consecutive calendar days, ever.
  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    if (days[i] === nextDayKey(days[i - 1])) {
      run += 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
  }

  // The current streak must reach today or yesterday, or it's broken.
  const last = days[days.length - 1];
  let current = 0;
  if (last === today || prevDays.has(last)) {
    current = 1;
    for (let i = days.length - 1; i > 0; i--) {
      if (days[i] === nextDayKey(days[i - 1])) current += 1;
      else break;
    }
  }
  return { current, longest, lastDay: last };
}

function nextDayKey(day: string): string {
  const d = new Date(day + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Distinct days with at least one first completion. */
export function activeDays(progress: Progress): string[] {
  return [...new Set(
    Object.keys(progress.completed)
      .map((k) => k.split("!")[1])
      .filter((d): d is string => Boolean(d))
  )].sort();
}

/** Lessons completed today (by best-score day), for the "N today" pill. */
export function lessonsToday(progress: Progress, today: string): number {
  return Object.keys(progress.completed).filter(
    (k) => k.split("!")[1] === today
  ).length;
}

/* ------------------------- Ascension tiers ------------------------- */

/**
 * RPG progression above plain levels. Every tier changes how a learner is
 * framed on the leaderboard — the flex has to be visible to matter.
 */
export type Ascension = {
  id: string;
  name: string;
  roman: string;
  minLevel: number;
  /** Tailwind gradient for the avatar frame / rank medallion */
  frame: string;
  /** Tailwind text color for the tier name */
  accent: string;
  /** What the tier unlocks, written for the player */
  perk: string;
};

export const ASCENSIONS: Ascension[] = [
  {
    id: "initiate",
    name: "Initiate",
    roman: "I",
    minLevel: 1,
    frame: "from-ink-300 to-ink-200",
    accent: "text-ink-600",
    perk: "Your name on the board",
  },
  {
    id: "apprentice",
    name: "Apprentice",
    roman: "II",
    minLevel: 2,
    frame: "from-emerald-400 to-emerald-200",
    accent: "text-emerald-600",
    perk: "Emerald frame + first titles",
  },
  {
    id: "adept",
    name: "Adept",
    roman: "III",
    minLevel: 4,
    frame: "from-sky-400 to-cyan-200",
    accent: "text-sky-600",
    perk: "Aurora frame + animated streak flame",
  },
  {
    id: "veteran",
    name: "Veteran",
    roman: "IV",
    minLevel: 6,
    frame: "from-violet-500 to-fuchsia-300",
    accent: "text-violet-600",
    perk: "Violet frame + guild banner slot",
  },
  {
    id: "archon",
    name: "Archon",
    roman: "V",
    minLevel: 9,
    frame: "from-gold-500 to-gold-300",
    accent: "text-gold-600",
    perk: "Gilded frame + glowing rank row",
  },
  {
    id: "ascendant",
    name: "Ascendant",
    roman: "VI",
    minLevel: 12,
    frame: "from-rose-500 via-fuchsia-400 to-gold-300",
    accent: "text-rose-600",
    perk: "Tri-color frame + rare titles",
  },
  {
    id: "mythic",
    name: "Mythic",
    roman: "VII",
    minLevel: 16,
    frame: "from-gold-300 via-paper-50 to-gold-500",
    accent: "text-gold-700",
    perk: "Living prism frame + Mythic titles",
  },
];

export function ascensionFor(level: number) {
  let idx = 0;
  for (let i = 0; i < ASCENSIONS.length; i++) {
    if (level >= ASCENSIONS[i].minLevel) idx = i;
  }
  const current = ASCENSIONS[idx];
  const next = ASCENSIONS[idx + 1] ?? null;
  const span = next ? next.minLevel - current.minLevel : 0;
  const into = next ? level - current.minLevel : 0;
  return {
    current,
    next,
    levelsToNext: next ? next.minLevel - level : 0,
    pct: next ? Math.round((into / span) * 100) : 100,
  };
}

/**
 * Trust the stored tier id, but fall back to deriving one from the level so a
 * stale or unknown id still renders a frame instead of crashing the board.
 */
export function resolveAscension(
  id: string | null | undefined,
  level: number
): Ascension {
  return ASCENSIONS.find((a) => a.id === id) ?? ascensionFor(level).current;
}

/* --------------------------- Titles --------------------------- */

export type Title = { id: string; label: string; minLevel: number };

export const TITLES: Title[] = [
  { id: "novice", label: "Novice", minLevel: 1 },
  { id: "cadet", label: "Code Cadet", minLevel: 2 },
  { id: "slinger", label: "Syntax Slinger", minLevel: 4 },
  { id: "bugslayer", label: "Bug Slayer", minLevel: 6 },
  { id: "refactorer", label: "The Refactorer", minLevel: 8 },
  { id: "architect", label: "Systems Architect", minLevel: 11 },
  { id: "ascendant", label: "Ascendant", minLevel: 14 },
  { id: "mythic", label: "Mythic Mind", minLevel: 16 },
];

/** Titles the learner has unlocked and may display. */
export function unlockedTitles(level: number): Title[] {
  return TITLES.filter((t) => t.minLevel <= level).reverse();
}

/** Resolve a stored title id back to its label (falls back to the id). */
export function titleLabel(id: string | undefined | null): string | null {
  if (!id) return null;
  return TITLES.find((t) => t.id === id)?.label ?? id;
}

/** The highest title a level grants — the default flex. */
export function defaultTitle(level: number): string {
  return unlockedTitles(level)[0]?.id ?? TITLES[0].id;
}

/* --------------------------- Badges --------------------------- */

export type Badge = {
  id: string;
  icon: string;
  title: string;
  description: string;
};

type EarnedBadge = Badge & { earned: boolean };

const ALL_BADGES: Badge[] = [
  { id: "first-steps", icon: "①", title: "First Steps", description: "Complete your first lesson." },
  { id: "flawless", icon: "◎", title: "Flawless", description: "Score 100% on any lesson quiz." },
  { id: "streak-3", icon: "③", title: "Three-Day Streak", description: "Learn something 3 days in a row." },
  { id: "streak-7", icon: "⑦", title: "Week Warrior", description: "Learn something 7 days in a row." },
  { id: "xp-1000", icon: "✦", title: "1,000 XP", description: "Earn 1,000 XP across all lessons." },
  { id: "track-finisher", icon: "❖", title: "Track Finisher", description: "Complete every lesson in a track." },
  { id: "explorer", icon: "❂", title: "Explorer", description: "Finish a lesson in 5 different tracks." },
  { id: "polyglot", icon: "✺", title: "Polyglot", description: "Finish a lesson in every track." },
  { id: "level-5", icon: "♛", title: "Seasoned", description: "Reach level 5." },
  { id: "perfect-day", icon: "🏅", title: "Perfect Day", description: "Clear every daily quest in a single day." },
  { id: "ascended", icon: "❈", title: "Archon Ascendant", description: "Ascend to the Archon tier." },
  { id: "guildmate", icon: "⚔", title: "Guildmate", description: "Join a guild." },
  { id: "guild-founder", icon: "⚑", title: "Guild Founder", description: "Found your own guild." },
];

/** Context the progress map can't express on its own. */
type BadgeContext = {
  level?: number;
  clanRole?: "none" | "member" | "officer" | "owner";
};

export function computeBadges(
  progress: Progress,
  streak: Streak,
  ctx: BadgeContext = {}
): EarnedBadge[] {
  const level = ctx.level ?? 0;
  const clanRole = ctx.clanRole ?? "none";
  const hasPerfectDay = (() => {
    const buckets = dayBuckets(progress);
    const days = activeSet(buckets);
    for (const day of days) {
      // Consistency XP is deliberately excluded — a Perfect Day is quests only.
      if (dayQuestBonus(buckets.get(day)) === DAILY_QUESTS.reduce((n, q) => n + q.bonus, 0)) return true;
    }
    return false;
  })();
  const doneKeys = Object.keys(progress.completed).filter(
    (k) => (progress.completed[k] ?? 0) >= 1
  );
  const doneLessons = doneKeys.map(lessonIdOf);
  const doneTrackIds = new Set(doneLessons.map((k) => k.split("/")[0]));
  const anyFlawless = doneKeys.some((k) => progress.completed[k] >= 1);

  const trackFinished = (trackId: string) => {
    const track = tracks.find((t) => t.id === trackId);
    if (!track) return false;
    return track.lessons.every((l) => scoreFor(progress, trackId + "/" + l.id) >= 1);
  };

  return ALL_BADGES.map((b) => {
    let earned = false;
    switch (b.id) {
      case "first-steps": earned = doneLessons.length >= 1; break;
      case "flawless": earned = anyFlawless; break;
      case "streak-3": earned = streak.current >= 3 || streak.longest >= 3; break;
      case "streak-7": earned = streak.current >= 7 || streak.longest >= 7; break;
      case "xp-1000": earned = totalXp(progress) >= 1000; break;
      case "track-finisher": earned = tracks.some((t) => trackFinished(t.id)); break;
      case "explorer": earned = doneTrackIds.size >= 5; break;
      case "polyglot": earned = doneTrackIds.size >= tracks.length; break;
      case "level-5": earned = level >= 5; break;
      case "perfect-day": earned = hasPerfectDay; break;
      case "ascended": earned = level >= ascensionFor(level).current.minLevel && ascensionFor(level).current.id === "archon"; break;
      case "guildmate": earned = clanRole !== "none"; break;
      case "guild-founder": earned = clanRole === "owner"; break;
    }
    return { ...b, earned };
  });
}

/* ------------------------- Certificates ------------------------- */

/** Fully-completed tracks, newest-first by position in the curriculum. */
export function finishedTracks(progress: Progress) {
  return tracks.filter((t) =>
    t.lessons.every((l) => scoreFor(progress, t.id + "/" + l.id) >= 1)
  );
}

/* ----------------------- Date helpers (UTC) ----------------------- */

/** `YYYY-MM-DD` in UTC — stable across timezones for a global audience. */
export function todayKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** Set of "the day before today" and "two days before" — keeps weekend streaks alive. */
export function previousDayKeys(d: Date = new Date()): Set<string> {
  const one = new Date(d);
  one.setUTCDate(one.getUTCDate() - 1);
  const two = new Date(d);
  two.setUTCDate(two.getUTCDate() - 2);
  return new Set([todayKey(one), todayKey(two)]);
}
