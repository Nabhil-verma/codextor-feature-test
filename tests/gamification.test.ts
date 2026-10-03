import { describe, it, expect } from "vitest";
import {
  totalXp,
  levelFor,
  computeStreak,
  computeBadges,
  finishedTracks,
  lessonsToday,
  activeDays,
  dayBuckets,
  lessonXpTotal,
  todayKey,
  previousDayKeys,
} from "../src/lib/gamification";
import type { Progress } from "../src/lib/progress";

/* helpers -------------------------------------------------------------- */

function progressWith(entries: Record<string, number>): Progress {
  return { completed: entries };
}

const T = "2026-09-13"; // a fixed "today" for deterministic tests

/* XP ------------------------------------------------------------------- */

describe("XP & levels", () => {
  it("awards 50 XP per lesson, +25 for a flawless quiz", () => {
    expect(totalXp(progressWith({ "web/html": 1 }))).toBe(75);
    expect(totalXp(progressWith({ "web/html": 0.5 }))).toBe(50);
    expect(
      totalXp(progressWith({ "web/html": 1, "dsa/arrays": 0.8 }))
    ).toBe(125);
  });

  it("returns 0 XP for empty progress", () => {
    expect(totalXp(progressWith({}))).toBe(0);
  });

  it("pays a lesson once, even when a partial score improves across days", () => {
    // Partial credit records a new day key each time the best score improves
    // (0.4 → 0.7 → 1.0). The lesson must still pay exactly one lesson's XP —
    // 75 at its best score, not 50 per recorded day — and it belongs to the
    // day the best score landed.
    const ladder = progressWith({
      "agents/verifying-agent-output!2026-09-13": 0.4,
      "agents/verifying-agent-output!2026-09-14": 0.7,
      "agents/verifying-agent-output!2026-09-15": 1,
    });
    expect(lessonXpTotal(ladder)).toBe(75);

    const buckets = dayBuckets(ladder);
    expect(buckets.get("2026-09-15")).toMatchObject({ lessons: 1, xp: 75, flawless: 1 });
    expect(buckets.has("2026-09-13")).toBe(false);
    expect(buckets.has("2026-09-14")).toBe(false);
  });

  it("levels up every 250 XP with correct progress within the level", () => {
    expect(levelFor(0)).toMatchObject({ level: 1, intoLevel: 0, toNext: 250, pct: 0 });
    expect(levelFor(249)).toMatchObject({ level: 1, toNext: 1 });
    expect(levelFor(250)).toMatchObject({ level: 2, intoLevel: 0 });
    expect(levelFor(375).pct).toBe(50);
    expect(levelFor(1000)).toMatchObject({ level: 5 });
  });
});

/* Streaks --------------------------------------------------------------- */

describe("streaks", () => {
  it("is empty when nothing was completed", () => {
    expect(computeStreak(progressWith({}), T, previousDayKeys(new Date(T)))).toEqual({
      current: 0,
      longest: 0,
      lastDay: null,
    });
  });

  it("counts consecutive days as a current streak ending today", () => {
    // Three days in a row up to T, one lesson per day.
    const entries: Record<string, number> = {};
    ["2026-09-11", "2026-09-12", "2026-09-13"].forEach((d, i) => {
      entries[`web/l${i}!${d}`] = 1;
    });
    const streak = computeStreak(progressWith(entries), T, previousDayKeys(new Date(T)));
    expect(streak.current).toBe(3);
    expect(streak.longest).toBe(3);
    expect(streak.lastDay).toBe("2026-09-13");
  });

  it("keeps yesterday's streak alive (grace day) but not older gaps", () => {
    const p = progressWith({ "web/a!2026-09-12": 1 });
    const streak = computeStreak(p, T, previousDayKeys(new Date(T)));
    expect(streak.current).toBe(1);

    const stale = progressWith({ "web/a!2026-09-10": 1 });
    expect(computeStreak(stale, T, previousDayKeys(new Date(T))).current).toBe(0);
  });

  it("tracks the longest streak even when the current one is broken", () => {
    const p = progressWith({
      "web/a!2026-09-01": 1,
      "web/a!2026-09-02": 1,
      "web/a!2026-09-03": 1,
      "web/a!2026-09-05": 1,
      "web/a!2026-09-13": 1,
    });
    const s = computeStreak(p, T, previousDayKeys(new Date(T)));
    expect(s.longest).toBe(3);
    expect(s.current).toBe(1);
  });
});

/* Badges ---------------------------------------------------------------- */

describe("badges", () => {
  it("awards First Steps after one lesson", () => {
    const p = progressWith({ "web/html!2026-09-13": 1 });
    const badges = computeBadges(p, computeStreak(p, T, previousDayKeys(new Date(T))));
    const first = badges.find((b) => b.id === "first-steps");
    expect(first?.earned).toBe(true);
    const flawless = badges.find((b) => b.id === "flawless");
    expect(flawless?.earned).toBe(true); // score 1 == flawless
  });

  it("awards Explorer at 5 distinct tracks and Polyglot only at all 10", () => {
    const entries: Record<string, number> = {};
    ["web", "react", "backend", "dsa", "python"].forEach((t) => {
      entries[`${t}/l!2026-09-13`] = 1;
    });
    const five = progressWith(entries);
    const s5 = computeStreak(five, T, previousDayKeys(new Date(T)));
    expect(computeBadges(five, s5).find((b) => b.id === "explorer")?.earned).toBe(true);
    expect(computeBadges(five, s5).find((b) => b.id === "polyglot")?.earned).toBe(false);
  });

  it("awards the XP badge at 1,000 XP", () => {
    // 14 flawless lessons = 14 × 75 = 1050 XP
    const entries: Record<string, number> = {};
    for (let i = 0; i < 14; i++) entries[`web/l${i}!2026-09-13`] = 1;
    const p = progressWith(entries);
    const badges = computeBadges(p, computeStreak(p, T, previousDayKeys(new Date(T))));
    expect(badges.find((b) => b.id === "xp-1000")?.earned).toBe(true);
  });
});

/* Certificates ---------------------------------------------------------- */

describe("finishedTracks", () => {
  it("lists a track only when every lesson scores 100%", async () => {
    const { tracks } = await import("../src/data");
    const web = tracks[0];
    const entries: Record<string, number> = {};
    for (const l of web.lessons) entries[`${web.id}/${l.id}!2026-09-13`] = 1;
    const p = progressWith(entries);
    expect(finishedTracks(p).map((t) => t.id)).toContain(web.id);

    // Knock one lesson below 100% — the track leaves the list.
    entries[`${web.id}/${web.lessons[0].id}!2026-09-13`] = 0.5;
    expect(finishedTracks(progressWith(entries)).map((t) => t.id)).not.toContain(web.id);
  });
});

/* Small utilities -------------------------------------------------------- */

describe("date utilities", () => {
  it("todayKey formats as UTC YYYY-MM-DD", () => {
    expect(todayKey(new Date("2026-09-13T23:30:00Z"))).toBe("2026-09-13");
  });

  it("previousDayKeys includes the two days before today (weekend grace)", () => {
    const keys = previousDayKeys(new Date(T));
    expect(keys.has("2026-09-12")).toBe(true);
    expect(keys.has("2026-09-11")).toBe(true);
    expect(keys.has("2026-09-10")).toBe(false);
  });

  it("lessonsToday and activeDays read date-suffixed keys", () => {
    const p = progressWith({
      "web/a!2026-09-13": 1,
      "web/b!2026-09-13": 1,
      "web/c!2026-09-12": 1,
    });
    expect(lessonsToday(p, T)).toBe(2);
    expect(activeDays(p)).toEqual(["2026-09-12", "2026-09-13"]);
  });
});
