import { describe, it, expect } from "vitest";
import {
  isoWeekKey,
  questDefForWeek,
  questTargetFor,
  CLAN_QUESTS,
  type ClanQuestDef,
} from "../src/lib/guild";

describe("isoWeekKey", () => {
  it("matches the ISO week for known dates", () => {
    // Tuesday of the current week at the time of writing.
    expect(isoWeekKey("2026-09-22")).toBe("2026-W39");
  });

  it("handles year boundaries per ISO 8601 (weeks belong to their Thursday's year)", () => {
    // Mon 2024-12-30 → Thursday 2025-01-02 → week 1 of 2025.
    expect(isoWeekKey("2024-12-30")).toBe("2025-W01");
    // Mon 2025-12-29 → Thursday 2026-01-01 → week 1 of 2026.
    expect(isoWeekKey("2025-12-29")).toBe("2026-W01");
    // Fri 2021-01-01 → its Thursday is 2020-12-31 → week 53 of 2020.
    expect(isoWeekKey("2021-01-01")).toBe("2020-W53");
  });

  it("is stable across the week and jumps on Monday", () => {
    expect(isoWeekKey("2026-09-21")).toBe(isoWeekKey("2026-09-27"));
    expect(isoWeekKey("2026-09-27")).not.toBe(isoWeekKey("2026-09-28"));
  });
});

describe("questDefForWeek", () => {
  it("always returns a quest from the library, deterministically", () => {
    for (const day of [
      "2026-09-22",
      "2026-09-23",
      "2026-01-01",
      "2027-05-04",
    ]) {
      const def = questDefForWeek(isoWeekKey(day));
      expect(CLAN_QUESTS).toContain(def);
      expect(def).toBe(questDefForWeek(isoWeekKey(day))); // stable
    }
  });

  it("rotates across weeks", () => {
    const keys = [
      isoWeekKey("2026-09-21"),
      isoWeekKey("2026-09-28"),
      isoWeekKey("2026-10-05"),
      isoWeekKey("2026-10-12"),
    ];
    const defs = new Set(keys.map(questDefForWeek));
    expect(defs.size).toBeGreaterThan(1);
  });
});

describe("questTargetFor", () => {
  const def: ClanQuestDef = {
    id: "t",
    title: "T",
    detail: "",
    metric: "lessons",
    baseTarget: 6,
    perMember: 2,
    rewardXp: 100,
  };

  it("scales with roster size but never below one member", () => {
    expect(questTargetFor(def, 0)).toBe(8); // max(1, 0) = 1
    expect(questTargetFor(def, 1)).toBe(8);
    expect(questTargetFor(def, 25)).toBe(56);
  });
});
