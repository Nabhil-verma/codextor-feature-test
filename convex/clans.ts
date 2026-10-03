import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
  MAX_GUILD_MEMBERS,
  guildTierFor,
  isoWeekKey,
  questDefForWeek,
  questTargetFor,
} from "../lib/guild";

/**
 * Guilds ("clans"): small teams whose pooled XP unlocks collective rewards and
 * turns solo grinding into team play. Membership lives on the profile row, so
 * leaving a guild can never orphan a member.
 */

const MAX_MEMBERS = MAX_GUILD_MEMBERS;
const MAX_NAME = 28;
const MAX_BLURB = 140;

/** `YYYY-MM-DD` in UTC — local copy so the server never imports the client data bundle. */
function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

async function postEvent(
  ctx: MutationCtx,
  clanId: Id<"clans">,
  actorId: Id<"users">,
  kind: "join" | "leave" | "level-up" | "quest-done" | "promotion" | "demotion" | "kick",
  text: string
): Promise<void> {
  await ctx.db.insert("clanEvents", {
    clanId,
    actorId,
    kind,
    text,
    createdAt: Date.now(),
  });
}

function roleOf(
  profile: Doc<"profiles">,
  clan: Doc<"clans">
): "owner" | "officer" | "member" {
  if (clan.ownerId === profile.userId) return "owner";
  return profile.memberRole === "officer" ? "officer" : "member";
}

/** Load (or lazily create) the signed-in learner's player card. */
async function ensureProfile(
  ctx: MutationCtx,
  userId: Id<"users">
): Promise<Doc<"profiles">> {
  const existing = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  if (existing) return existing;
  const user = await ctx.db.get(userId);
  const name =
    ((user?.name as string | undefined) || (user?.email as string | undefined) || "Learner")
      .slice(0, 40);
  const id = await ctx.db.insert("profiles", {
    userId,
    name,
    xp: 0,
    xpWeek: 0,
    xpMonth: 0,
    level: 1,
    ascension: "initiate",
    streakCurrent: 0,
    streakLongest: 0,
    lessonsDone: 0,
    updatedAt: Date.now(),
  });
  const created = await ctx.db.get(id);
  if (!created) throw new Error("Could not create your player card");
  return created;
}

async function membersOf(
  ctx: QueryCtx,
  clanId: Id<"clans">
): Promise<Doc<"profiles">[]> {
  return ctx.db
    .query("profiles")
    .withIndex("by_clan", (q) => q.eq("clanId", clanId))
    .take(MAX_MEMBERS + 5);
}

export type ClanRole = "owner" | "officer" | "member";

type ClanMember = {
  userId: Id<"users">;
  name: string;
  xp: number;
  level: number;
  ascension: string;
  role: ClanRole;
  isMe: boolean;
};

export type ClanView = {
  id: Id<"clans">;
  name: string;
  tag: string;
  blurb: string;
  memberCount: number;
  /** pooled all-time XP — what the guild tier and board sort on */
  totalXp: number;
  /** pooled XP since Monday */
  weekXp: number;
  tier: string;
  tierPerk: string;
  isMine: boolean;
  isOwner: boolean;
  /** the caller's role in THIS clan ("member" when just browsing) */
  myRole: ClanRole;
  members: ClanMember[];
};

function view(
  c: Doc<"clans">,
  members: Doc<"profiles">[],
  meId: Id<"users"> | null
): ClanView {
  const sorted = [...members].sort((a, b) => b.xp - a.xp);
  const totalXp = sorted.reduce((n, m) => n + m.xp, 0);
  const mine = meId === null ? undefined : sorted.find((m) => m.userId === meId);
  return {
    id: c._id,
    name: c.name,
    tag: c.tag,
    blurb: c.blurb,
    memberCount: sorted.length,
    totalXp,
    weekXp: sorted.reduce((n, m) => n + m.xpWeek, 0),
    tier: guildTierFor(totalXp).tier.name,
    tierPerk: guildTierFor(totalXp).tier.perk,
    isMine: meId !== null && sorted.some((m) => m.userId === meId),
    isOwner: meId !== null && c.ownerId === meId,
    myRole: mine ? roleOf(mine, c) : "member",
    members: sorted.slice(0, 12).map((m) => ({
      userId: m.userId,
      name: m.name,
      xp: m.xp,
      level: m.level,
      ascension: m.ascension,
      role: roleOf(m, c),
      isMe: meId !== null && m.userId === meId,
    })),
  };
}

/** Every guild, ranked by pooled XP. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const meId = await getAuthUserId(ctx);
    const clans = await ctx.db.query("clans").take(40);
    const out: ClanView[] = [];
    for (const c of clans) {
      out.push(view(c, await membersOf(ctx, c._id), meId));
    }
    out.sort((a, b) => b.totalXp - a.totalXp || b.weekXp - a.weekXp);
    return out;
  },
});

/** The caller's own guild, or null when they're a free agent. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const meId = await getAuthUserId(ctx);
    if (!meId) return null;
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", meId))
      .unique();
    if (!profile?.clanId) return null;
    const clan = await ctx.db.get(profile.clanId);
    if (!clan) return null;
    return view(clan, await membersOf(ctx, clan._id), meId);
  },
});

function cleanText(raw: string, max: number): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, max);
}

/** Found a guild. One guild per learner. */
export const create = mutation({
  args: { name: v.string(), tag: v.string(), blurb: v.string() },
  handler: async (ctx, { name, tag, blurb }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");

    const cleanName = cleanText(name, MAX_NAME);
    const cleanTag = cleanText(tag, 5).toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (cleanName.length < 3) throw new Error("Guild name needs at least 3 characters");
    if (cleanTag.length < 2) throw new Error("Guild tag needs 2–5 letters or numbers");

    const profile = await ensureProfile(ctx, userId);
    if (profile.clanId) throw new Error("Leave your current guild first");

    const nameTaken = await ctx.db
      .query("clans")
      .withIndex("by_name", (q) => q.eq("name", cleanName))
      .first();
    if (nameTaken) throw new Error("That guild name is taken");
    const tagTaken = await ctx.db
      .query("clans")
      .withIndex("by_tag", (q) => q.eq("tag", cleanTag))
      .first();
    if (tagTaken) throw new Error("That guild tag is taken");

    const clanId = await ctx.db.insert("clans", {
      name: cleanName,
      tag: cleanTag,
      blurb: cleanText(blurb, MAX_BLURB) || "No motto yet — recruiting builders.",
      ownerId: userId,
      createdAt: Date.now(),
    });
    await ctx.db.patch(profile._id, { clanId });
    await postEvent(ctx, clanId, userId, "join", profile.name + " founded the guild");
    return clanId;
  },
});

/** Join a guild (capacity-checked). */
export const join = mutation({
  args: { clanId: v.id("clans") },
  handler: async (ctx, { clanId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const clan = await ctx.db.get(clanId);
    if (!clan) throw new Error("That guild no longer exists");

    const profile = await ensureProfile(ctx, userId);
    if (profile.clanId === clanId) return;

    const members = await membersOf(ctx, clanId);
    if (members.length >= MAX_MEMBERS) throw new Error("That guild is full");
    await ctx.db.patch(profile._id, { clanId, memberRole: undefined });
    await postEvent(ctx, clanId, userId, "join", profile.name + " joined the guild");
  },
});

/**
 * Leave the current guild. If the owner leaves, the highest-XP remaining
 * member is promoted; an empty guild is disbanded.
 */
export const leave = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!profile?.clanId) return;
    const clan = await ctx.db.get(profile.clanId);
    await ctx.db.patch(profile._id, { clanId: undefined, memberRole: undefined });
    if (!clan) return;
    await postEvent(ctx, clan._id, userId, "leave", profile.name + " left the guild");

    const remaining = (await membersOf(ctx, clan._id)).filter(
      (m) => m.userId !== userId
    );
    if (remaining.length === 0) {
      await ctx.db.delete(clan._id);
      return;
    }
    if (clan.ownerId === userId) {
      const heir = [...remaining].sort((a, b) => b.xp - a.xp)[0];
      await ctx.db.patch(clan._id, { ownerId: heir.userId });
      await ctx.db.patch(heir._id, { memberRole: undefined });
    }
  },
});

/* ═══════════════════════════════════════════════════════════════
   Co-op clan quests, roles and the activity feed.
   ═════════════════════════CLAN-SECTION-BREAK════════════════════ */

/** Load this week's quest + per-member progress + contributor cards. */
export const activeQuest = query({
  args: {},
  handler: async (ctx) => {
    const meId = await getAuthUserId(ctx);
    if (!meId) return null;
    const me = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", meId))
      .unique();
    if (!me?.clanId) return null;
    return questViewFor(ctx, me.clanId, meId);
  },
});

/**
 * Queries can't write, so lazy quest creation is a mutation. The panel calls
 * it on mount; it's a no-op whenever this week's quest already exists, and
 * rotates deterministically off the week key — same choice on every member's
 * client and the server.
 */
export const ensureActiveQuest = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const me = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!me?.clanId) return null;
    const clanId = me.clanId;
    const weekKey = isoWeekKey(todayKey());
    const existing = await ctx.db
      .query("clanQuests")
      .withIndex("by_clan_week", (q) => q.eq("clanId", clanId).eq("weekKey", weekKey))
      .first();
    if (existing) return existing._id;
    const def = questDefForWeek(weekKey);
    const clan = await ctx.db.get(me.clanId);
    if (!clan) return null;
    const memberCount = (await membersOf(ctx, clanId)).length;
    return await ctx.db.insert("clanQuests", {
      clanId,
      weekKey,
      title: def.title,
      detail: def.detail,
      metric: def.metric,
      target: questTargetFor(def, memberCount),
      rewardXp: def.rewardXp,
      status: "active",
      createdBy: userId,
      createdAt: Date.now(),
    });
  },
});

/** This week's quest with pooled progress and the top contributor cards. */
export const questView = query({
  args: {},
  handler: async (ctx) => {
    const meId = await getAuthUserId(ctx);
    if (!meId) return null;
    const me = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", meId))
      .unique();
    if (!me?.clanId) return null;
    return questViewFor(ctx, me.clanId, meId);
  },
});

type QuestViewData = {
  questId: Id<"clanQuests">;
  title: string;
  detail: string;
  metric: "lessons" | "xp" | "flawless";
  target: number;
  pooled: number;
  status: "active" | "complete";
  rewardXp: number;
  weekKey: string;
  isComplete: boolean;
  /** contributor cards, biggest first */
  contributors: {
    userId: Id<"users">;
    name: string;
    level: number;
    ascension: string;
    contribution: number;
    isMe: boolean;
  }[];
};

async function questViewFor(
  ctx: QueryCtx,
  clanId: Id<"clans">,
  meId: Id<"users">
): Promise<QuestViewData | null> {
  const weekKey = isoWeekKey(todayKey());
  const quest = await ctx.db
    .query("clanQuests")
    .withIndex("by_clan_week", (q) => q.eq("clanId", clanId).eq("weekKey", weekKey))
    .first();
  if (!quest) return null;
  const rows = await ctx.db
    .query("clanQuestProgress")
    .withIndex("by_quest_user", (q) => q.eq("questId", quest._id))
    .collect();
  const contributors = rows
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 12)
    .map((r) => ({
      userId: r.userId,
      name: r.userName,
      level: r.userLevel,
      ascension: r.userAscension,
      contribution: r.contribution,
      isMe: r.userId === meId,
    }));
  const pooled = rows.reduce((n, r) => n + r.contribution, 0);
  return {
    questId: quest._id,
    title: quest.title,
    detail: quest.detail,
    metric: quest.metric,
    target: quest.target,
    pooled,
    status: quest.status,
    rewardXp: quest.rewardXp,
    weekKey: quest.weekKey,
    isComplete: quest.status === "complete",
    contributors,
  };
}

/**
 * Report the caller's cumulative weekly number for the active metric (merged
 * max per user per quest). Idempotent: reporting the same value twice changes
 * nothing, so repeat profile-sync pushes can never double-count. When the
 * pooled sum crosses the target the quest completes — guarded server-side,
 * so the completion feed event fires exactly once.
 */
export const reportContribution = mutation({
  args: {
    lessons: v.optional(v.number()),
    xp: v.optional(v.number()),
    flawless: v.optional(v.number()),
  },
  handler: async (ctx, { lessons, xp, flawless }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const me = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!me?.clanId) return;
    const clanId = me.clanId;
    const weekKey = isoWeekKey(todayKey());
    const quest = await ctx.db
      .query("clanQuests")
      .withIndex("by_clan_week", (q) => q.eq("clanId", clanId).eq("weekKey", weekKey))
      .first();
    if (!quest || quest.status !== "active") return;
    // The quest's metric decides which counter counts — the client reports
    // all three weekly totals and the server picks. Values are cumulative
    // for the week, so the max-merge keeps this idempotent.
    const amount = Math.max(
      0,
      Math.floor(
        (quest.metric === "lessons" ? lessons : quest.metric === "xp" ? xp : flawless) ?? 0
      )
    );
    if (amount <= 0) return;
    const existing = await ctx.db
      .query("clanQuestProgress")
      .withIndex("by_quest_user", (q) => q.eq("questId", quest._id).eq("userId", userId))
      .first();
    if (existing && existing.contribution >= amount) return;
    if (existing) {
      await ctx.db.patch(existing._id, {
        contribution: amount,
        userLevel: me.level,
        userAscension: me.ascension,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("clanQuestProgress", {
        questId: quest._id,
        userId,
        contribution: amount,
        userLevel: me.level,
        userAscension: me.ascension,
        userName: me.name,
        updatedAt: Date.now(),
      });
    }
    const rows = await ctx.db
      .query("clanQuestProgress")
      .withIndex("by_quest_user", (q) => q.eq("questId", quest._id))
      .collect();
    const pooled = rows.reduce((n, r) => n + r.contribution, 0);
    if (pooled >= quest.target) {
      await ctx.db.patch(quest._id, {
        status: "complete",
        completedAt: Date.now(),
      });
      await postEvent(
        ctx,
        clanId,
        userId,
        "quest-done",
        me.name + " completed the last leg of \u201c" + quest.title + "\u201d"
      );
    }
  },
});

/** Weekly quest rewards the signed-in learner has already banked. */
export const questClaims = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [] as { weekKey: string; xp: number }[];
    const rows = await ctx.db
      .query("clanQuestClaims")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(60);
    return rows.map((r) => ({ weekKey: r.weekKey, xp: r.xp }));
  },
});

/**
 * Bank the reward XP for a completed weekly quest. One claim per
 * (user, weekKey) — enforced server-side. The returned share is added to
 * local XP by the caller via the existing derived-economy claim log.
 */
export const claimQuestReward = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const me = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!me?.clanId) throw new Error("Join a guild first");
    const clanId = me.clanId;
    const weekKey = isoWeekKey(todayKey());
    const quest = await ctx.db
      .query("clanQuests")
      .withIndex("by_clan_week", (q) => q.eq("clanId", clanId).eq("weekKey", weekKey))
      .first();
    if (!quest || quest.status !== "complete") {
      throw new Error("This week's quest is not complete yet");
    }
    const claimed = await ctx.db
      .query("clanQuestClaims")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(60);
    if (claimed.some((c) => c.weekKey === weekKey)) {
      throw new Error("You already claimed this reward");
    }
    const contributors = await ctx.db
      .query("clanQuestProgress")
      .withIndex("by_quest_user", (q) => q.eq("questId", quest._id))
      .collect();
    const share = Math.floor(quest.rewardXp / Math.max(1, contributors.length));
    await ctx.db.insert("clanQuestClaims", {
      userId,
      weekKey,
      xp: share,
      claimedAt: Date.now(),
    });
    return share;
  },
});

/* ───────────────────────── roles ───────────────────────── */

/** Owner grants or revokes the officer role. */
export const setRole = mutation({
  args: { userId: v.id("users"), officer: v.boolean() },
  handler: async (ctx, { userId, officer }) => {
    const meId = await getAuthUserId(ctx);
    if (!meId) throw new Error("Not signed in");
    const me = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", meId))
      .unique();
    if (!me?.clanId) throw new Error("You're not in a guild");
    const clan = await ctx.db.get(me.clanId);
    if (!clan) throw new Error("That guild no longer exists");
    if (clan.ownerId !== meId) throw new Error("Only the founder can manage roles");
    if (userId === meId) throw new Error("You already own this guild");
    const target = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!target || target.clanId !== clan._id) {
      throw new Error("That learner isn't in your guild");
    }
    if (officer) {
      await ctx.db.patch(target._id, { memberRole: "officer" });
      await postEvent(ctx, clan._id, meId, "promotion", target.name + " was promoted to officer");
    } else {
      await ctx.db.patch(target._id, { memberRole: undefined });
      await postEvent(ctx, clan._id, meId, "demotion", target.name + " is a member again");
    }
  },
});

/** Owner or an officer removes a member (officers can only remove members). */
export const kick = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const meId = await getAuthUserId(ctx);
    if (!meId) throw new Error("Not signed in");
    const me = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", meId))
      .unique();
    if (!me?.clanId) throw new Error("You're not in a guild");
    const clan = await ctx.db.get(me.clanId);
    if (!clan) throw new Error("That guild no longer exists");
    const myRole = roleOf(me, clan);
    if (myRole === "member") throw new Error("Only the founder or an officer can do that");
    const target = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!target || target.clanId !== clan._id) {
      throw new Error("That learner isn't in your guild");
    }
    if (userId === meId) throw new Error("Use \u201cLeave guild\u201d instead");
    const targetRole = roleOf(target, clan);
    if (targetRole !== "member" && myRole !== "owner") {
      throw new Error("Officers can only remove regular members");
    }
    await ctx.db.patch(target._id, { clanId: undefined, memberRole: undefined });
    await postEvent(ctx, clan._id, meId, "kick", target.name + " was removed from the guild");
  },
});

/* ───────────────────────── feed ───────────────────────── */

export type FeedEvent = {
  _id: string;
  kind: "join" | "leave" | "level-up" | "quest-done" | "promotion" | "demotion" | "kick";
  text: string;
  createdAt: number;
  actorName: string;
  actorAscension: string | null;
  actorLevel: number;
  isMe: boolean;
};

/** The guild's recent activity, newest first. */
export const feed = query({
  args: {},
  handler: async (ctx) => {
    const meId = await getAuthUserId(ctx);
    if (!meId) return [] as FeedEvent[];
    const me = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", meId))
      .unique();
    if (!me?.clanId) return [] as FeedEvent[];
    const clanId = me.clanId;
    const events = await ctx.db
      .query("clanEvents")
      .withIndex("by_clan_time", (q) => q.eq("clanId", clanId))
      .order("desc")
      .take(15);
    const actors = new Map<string, { name: string; ascension: string | null; level: number }>();
    const out: FeedEvent[] = [];
    for (const e of events) {
      let actor = actors.get(e.actorId);
      if (!actor) {
        const p = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", e.actorId))
          .first();
        actor = p
          ? { name: p.name, ascension: p.ascension, level: p.level }
          : { name: "A former member", ascension: null, level: 1 };
        actors.set(e.actorId, actor);
      }
      out.push({
        _id: e._id,
        kind: e.kind,
        text: e.text,
        createdAt: e.createdAt,
        actorName: actor.name,
        actorAscension: actor.ascension,
        actorLevel: actor.level,
        isMe: e.actorId === meId,
      });
    }
    return out;
  },
});
