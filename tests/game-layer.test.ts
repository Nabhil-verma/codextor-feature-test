import { describe, it, expect } from "vitest";
import {
  DAILY_QUESTS,
  STREAK_BONUS,
  TITLES,
  ascensionFor,
  bonusXpTotal,
  computeBadges,
  computeStreak,
  dailyQuests,
  dayBuckets,
  dayQuestBonus,
  defaultTitle,
  lessonXpTotal,
  monthStartKey,
  previousDayKeys,
  questsDoneToday,
  resolveAscension,
  totalXp,
  unlockedTitles,
  weekStartKey,
  xpInRange,
} from "../src/lib/gamification";
import { GUILD_TIERS, guildTierFor } from "../src/lib/guild";
import type { Progress } from "../src/lib/progress";

function p(entries: Record<string, number>): Progress {
  return { completed: entries };
}

const D1 = "2026-09-14"; // a Monday
const D2 = "2026-09-15"; // Tuesday of the same ISO week

const ALL_QUEST_BONUS = DAILY_QUESTS.reduce((n, q) => n + q.bonus, 0);

/* Day buckets ----------------------------------------------------------- */

describe("day buckets", () => {
  it("groups lesson XP by the day it was stamped", () => {
    const buckets = dayBuckets(
      p({ "web/a!2026-09-14": 1, "web/b!2026-09-14": 0.5 })
    );
    expect(buckets.get(D1)).toEqual({
      day: D1,
      lessons: 2,
      xp: 75 + 50,
      flawless: 1,
    });
  });

  it("treats undated legacy keys as their own bucket", () => {
    const buckets = dayBuckets(p({ "web/a": 1 }));
    expect(buckets.get("")?.xp).toBe(75);
  });
});

/* Quest bonuses --------------------------------------------------------- */

describe("daily quests", () => {
  it("pays First Blood and Flawless Run for one flawless lesson", () => {
    const progress = p({ "web/a!2026-09-14": 1 });
    // 75 lesson XP + 60 (1 lesson) + 75 (flawless), no consistency yet.
    expect(lessonXpTotal(progress)).toBe(75);
    expect(totalXp(progress)).toBe(75 + 60 + 75);
  });

  it("pays Triple Threat and XP Hunter once a day gets heavy", () => {
    const progress = p({
      "web/a!2026-09-14": 1,
      "web/b!2026-09-14": 1,
      "web/c!2026-09-14": 1,
    });
    // 3 × 75 lesson XP + 60 + 150 + 100 (≥200 XP) + 75 (flawless).
    expect(totalXp(progress)).toBe(225 + 385);
  });

  it("adds the consistency bonus only when the previous day was active", () => {
    const progress = p({ "web/a!2026-09-14": 1, "web/b!2026-09-15": 1 });
    const day2 = 75 + 60 + 75 + STREAK_BONUS;
    expect(xpInRange(progress, D2, D2)).toBe(day2);
    expect(xpInRange(progress, D1, D1)).toBe(75 + 60 + 75);
    expect(totalXp(progress)).toBe(210 + 235);
  });

  it("reports live progress for today's board", () => {
    const progress = p({ "web/a!2026-09-14": 1 });
    expect(questsDoneToday(progress, D1)).toBe(2);
    expect(questsDoneToday(progress, D2)).toBe(0);
    expect(dailyQuests(progress, D1).find((q) => q.id === "triple")).toMatchObject({
      progress: 1,
      target: 3,
      done: false,
    });
  });

  it("counts quest XP as bonus, not lesson XP", () => {
    const progress = p({ "web/a!2026-09-14": 1 });
    expect(bonusXpTotal(progress)).toBe(totalXp(progress) - lessonXpTotal(progress));
    expect(bonusXpTotal(progress)).toBe(135);
  });
});

/* Bracket windows ------------------------------------------------------- */

describe("bracket windows", () => {
  it("starts the week on Monday and the month on the 1st", () => {
    expect(weekStartKey("2026-09-14")).toBe("2026-09-14"); // Monday
    expect(weekStartKey("2026-09-16")).toBe("2026-09-14"); // Wednesday
    expect(weekStartKey("2026-09-20")).toBe("2026-09-14"); // Sunday closes the week
    expect(monthStartKey("2026-09-20")).toBe("2026-09-01");
  });

  it("excludes days outside the bracket and undated legacy keys", () => {
    const progress = p({
      "web/a": 1, // legacy, undated
      "web/b!2026-08-31": 1, // previous month
      "web/c!2026-09-14": 1,
    });
    expect(xpInRange(progress, "2026-09-01", "2026-09-30")).toBe(210);
    expect(xpInRange(progress, D1, D1)).toBe(210);
    expect(xpInRange(progress, "2026-08-01", "2026-08-31")).toBe(75 + 60 + 75);
    // Lifetime still counts the undated lesson XP.
    expect(lessonXpTotal(progress)).toBe(225);
  });
});

/* Ascension ------------------------------------------------------------- */

describe("ascension tiers", () => {
  it("maps levels onto the tier ladder", () => {
    expect(ascensionFor(1).current.id).toBe("initiate");
    expect(ascensionFor(3).current.id).toBe("apprentice");
    expect(ascensionFor(9).current.name).toBe("Archon");
    expect(ascensionFor(16).current.id).toBe("mythic");
  });

  it("reports progress toward the next tier", () => {
    expect(ascensionFor(2).next?.id).toBe("adept");
    expect(ascensionFor(2).levelsToNext).toBe(2);
    expect(ascensionFor(16).next).toBeNull();
    expect(ascensionFor(99).pct).toBe(100);
  });

  it("falls back to the level-derived tier for unknown or stale ids", () => {
    expect(resolveAscension("archon", 1).id).toBe("archon");
    expect(resolveAscension("nonsense", 4).id).toBe("adept");
    expect(resolveAscension(null, 1).id).toBe("initiate");
  });

  it("unlocks titles as levels rise, newest first", () => {
    expect(unlockedTitles(1).map((t) => t.id)).toEqual(["novice"]);
    expect(unlockedTitles(4)[0].id).toBe("slinger");
    expect(defaultTitle(1)).toBe("novice");
    expect(defaultTitle(16)).toBe("mythic");
    expect(TITLES.every((t) => t.minLevel >= 1)).toBe(true);
  });
});

/* Badges with context --------------------------------------------------- */

describe("badges with context", () => {
  const fourLessons = p({
    "web/a!2026-09-14": 1,
    "web/b!2026-09-14": 1,
    "web/c!2026-09-14": 1,
    "web/d!2026-09-14": 1,
  });
  const streak = computeStreak(fourLessons, D1, previousDayKeys(new Date(D1)));

  it("awards Perfect Day only when every quest lands in one day", () => {
    expect(ALL_QUEST_BONUS).toBe(385);
    expect(dayQuestBonus(dayBuckets(fourLessons).get(D1))).toBe(ALL_QUEST_BONUS);
    expect(
      computeBadges(fourLessons, streak).find((b) => b.id === "perfect-day")?.earned
    ).toBe(true);

    const single = p({ "web/a!2026-09-14": 1 });
    expect(
      computeBadges(single, computeStreak(single, D1, previousDayKeys(new Date(D1)))).find(
        (b) => b.id === "perfect-day"
      )?.earned
    ).toBe(false);
  });

  it("unlocks the guild badges only with a real guild role", () => {
    const plain = computeBadges(fourLessons, streak);
    expect(plain.find((b) => b.id === "guildmate")?.earned).toBe(false);

    const guilded = computeBadges(fourLessons, streak, {
      level: 5,
      clanRole: "owner",
    });
    expect(guilded.find((b) => b.id === "guildmate")?.earned).toBe(true);
    expect(guilded.find((b) => b.id === "guild-founder")?.earned).toBe(true);
    expect(guilded.find((b) => b.id === "level-5")?.earned).toBe(true);
  });
});

/* Guild tiers ----------------------------------------------------------- */

describe("guild tiers", () => {
  it("ranks pooled XP into the collective reward ladder", () => {
    expect(GUILD_TIERS[0].minXp).toBe(0);
    expect(guildTierFor(0).tier.name).toBe("Band");
    expect(guildTierFor(499).tier.name).toBe("Band");
    expect(guildTierFor(500).tier.name).toBe("Company");
    expect(guildTierFor(15_000).tier.name).toBe("Legend");
  });

  it("measures progress toward the next collective reward", () => {
    expect(guildTierFor(250).toNext).toBe(250);
    expect(guildTierFor(250).pct).toBe(50);
    expect(guildTierFor(15_000).next).toBeNull();
    expect(guildTierFor(15_000).pct).toBe(100);
  });
});
