import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  /** One row per user: the same `completed` map the app keeps in localStorage. */
  progress: defineTable({
    userId: v.id("users"),
    data: v.any(),
    /**
     * Milestone claims: `{ [milestoneId]: { at: "YYYY-MM-DD", deliverables: number[] } }`.
     * Optional, so rows written before the project layer existed keep working
     * without a migration. Separate from `data` because that map is a numeric
     * score map — claims are dated attestations and merge by a different rule.
     */
    claims: v.optional(v.any()),
    /**
     * Attempt log: `{ [key]: { first, best, attempts, at } }` where `key` is
     * `${track}/${lesson}` and `at` is the epoch ms of the last attempt.
     * Optional, so rows written before the pilot's telemetry existed keep
     * working without a migration. Aggregated client-side (first / best /
     * count) rather than storing every attempt, because the gates need the
     * summary and the row must stay bounded.
     */
    attempts: v.optional(v.any()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"]),

  /**
   * The public, ranked view of a learner. Everything here is derived from the
   * progress map plus the guild they belong to; the client recomputes and
   * pushes it so the leaderboard can sort server-side without walking every
   * user's whole progress blob.
   */
  profiles: defineTable({
    userId: v.id("users"),
    name: v.string(),
    /** all-time XP (lessons + quest bonuses + consistency) */
    xp: v.number(),
    /** XP earned since Monday — the weekly bracket */
    xpWeek: v.number(),
    /** XP earned since the 1st — the monthly bracket */
    xpMonth: v.number(),
    level: v.number(),
    /** ascension tier id, e.g. "archon" */
    ascension: v.string(),
    /** chosen display title, e.g. "bugslayer" */
    title: v.optional(v.string()),
    streakCurrent: v.number(),
    streakLongest: v.number(),
    lastActiveDay: v.optional(v.string()),
    memberRole: v.optional(v.literal("officer")),
    lessonsDone: v.number(),
    clanId: v.optional(v.id("clans")),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_xp", ["xp"])
    .index("by_xpWeek", ["xpWeek"])
    .index("by_xpMonth", ["xpMonth"])
    .index("by_clan", ["clanId"]),

  /** A guild: a named group whose members' XP pools into a shared score. */
  clans: defineTable({
    name: v.string(),
    /** short uppercase badge, 2–5 chars, unique */
    tag: v.string(),
    blurb: v.string(),
    ownerId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_tag", ["tag"])
    .index("by_owner", ["ownerId"]),

  /**
   * One co-op quest per clan per ISO week. Created lazily by
   * `clans.ensureActiveQuest` (queries can't write), rotated by week key.
   */
  clanQuests: defineTable({
    clanId: v.id("clans"),
    /** ISO week key, e.g. "2026-W39" — one row per (clan, week) */
    weekKey: v.string(),
    title: v.string(),
    detail: v.string(),
    metric: v.union(v.literal("lessons"), v.literal("xp"), v.literal("flawless")),
    /** pooled guild-wide goal (scaled to roster size at creation) */
    target: v.number(),
    /** total reward XP, split evenly across contributors on completion */
    rewardXp: v.number(),
    status: v.union(v.literal("active"), v.literal("complete")),
    createdBy: v.id("users"),
    createdAt: v.number(),
    /** set when the quest completes — the "celebrated" flag lives server-side */
    completedAt: v.optional(v.number()),
  })
    .index("by_clan_week", ["clanId", "weekKey"]),

  /** Per-member, per-quest contribution. Merged max, like progress scores. */
  clanQuestProgress: defineTable({
    questId: v.id("clanQuests"),
    userId: v.id("users"),
    contribution: v.number(),
    updatedAt: v.number(),
    /** de-normalized so the panel can render contributor avatars in one read */
    userName: v.string(),
    userLevel: v.number(),
    userAscension: v.string(),
  })
    .index("by_quest_user", ["questId", "userId"]),

  /** One banked weekly-quest reward per (user, week) — server-enforced. */
  clanQuestClaims: defineTable({
    userId: v.id("users"),
    weekKey: v.string(),
    /** reward share that was banked */
    xp: v.number(),
    claimedAt: v.number(),
  })
    .index("by_user", ["userId"]),

  /** Guild activity feed. Written by profile sync, quest completion, join/leave. */
  clanEvents: defineTable({
    clanId: v.id("clans"),
    actorId: v.id("users"),
    kind: v.union(
      v.literal("join"),
      v.literal("leave"),
      v.literal("level-up"),
      v.literal("quest-done"),
      v.literal("promotion"),
      v.literal("demotion"),
      v.literal("kick")
    ),
    text: v.string(),
    createdAt: v.number(),
  })
    .index("by_clan_time", ["clanId", "createdAt"]),
});
