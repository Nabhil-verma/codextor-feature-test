import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import { api } from "../src/convex/_generated/api";
import schema from "../src/convex/schema";
import type { Id } from "../src/convex/_generated/dataModel";
import { isoWeekKey, questDefForWeek, questTargetFor } from "../src/lib/guild";

/*
 * The guild layer is the part of the game two people share, which makes it the
 * part where a quiet bug is most expensive: a double-counted contribution or a
 * reward claimed twice corrupts a whole roster, not one device. So the quest
 * lifecycle, the role rules and the activity feed are exercised end-to-end
 * against the real Convex functions (via convex-test), not just typechecked.
 *
 * One test = one week of a two/three-person guild: found → join → quest created
 * → contributions pooled → quest completed → reward banked once per member.
 */

const modules = import.meta.glob("../src/convex/**/*.*s");

function server() {
  return convexTest(schema, modules);
}

type Server = ReturnType<typeof server>;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** The week's quest, exactly as the server picks it. */
const weekKey = () => isoWeekKey(todayKey());
const questDef = () => questDefForWeek(weekKey());

/** The signed-in view of the backend for one learner. */
function as(t: Server, userId: Id<"users">) {
  return t.withIdentity({ subject: userId });
}

async function makeUsers(t: Server) {
  const [ada, lin, sam] = await Promise.all([
    t.run((ctx) => ctx.db.insert("users", { name: "Ada", email: "ada@edura.test" })),
    t.run((ctx) => ctx.db.insert("users", { name: "Lin", email: "lin@edura.test" })),
    t.run((ctx) => ctx.db.insert("users", { name: "Sam", email: "sam@edura.test" })),
  ]);
  return { ada, lin, sam };
}

/** Ada founds the guild, Lin and Sam join — returns the clan id. */
async function seedGuild(t: Server) {
  const { ada, lin, sam } = await makeUsers(t);
  const clanId = await as(t, ada).mutation(api.clans.create, {
    name: "Nightly Builders",
    tag: "NB",
    blurb: "ship something every night",
  });
  await as(t, lin).mutation(api.clans.join, { clanId });
  await as(t, sam).mutation(api.clans.join, { clanId });
  return { clanId, ada, lin, sam };
}

/**
 * Report a cumulative weekly value for whichever metric this week's quest
 * measures — the same "report all three counters, the server picks" contract
 * the QuestBridge uses.
 */
function countersFor(value: number) {
  const metric = questDef().metric;
  return {
    lessons: metric === "lessons" ? value : 0,
    xp: metric === "xp" ? value : 0,
    flawless: metric === "flawless" ? value : 0,
  };
}

describe("clan quest lifecycle", () => {
  it("creates this week's quest once, scaled to the roster", async () => {
    const t = server();
    const { ada } = await seedGuild(t);

    const questId = await as(t, ada).mutation(api.clans.ensureActiveQuest, {});
    expect(questId).toBeTruthy();

    // Asking again is a no-op — the panel calls this on every mount.
    const again = await as(t, ada).mutation(api.clans.ensureActiveQuest, {});
    expect(again).toBe(questId);

    const rows = await t.run((ctx) => ctx.db.query("clanQuests").collect());
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("active");
    expect(rows[0].target).toBe(questTargetFor(questDef(), 3));

    const view = await as(t, ada).query(api.clans.questView, {});
    expect(view).not.toBeNull();
    expect(view!.title).toBe(questDef().title);
    expect(view!.metric).toBe(questDef().metric);
    expect(view!.target).toBe(questTargetFor(questDef(), 3));
    expect(view!.pooled).toBe(0);
    expect(view!.isComplete).toBe(false);
    expect(view!.contributors).toEqual([]);
  });

  it("pools contributions with a max-merge per member", async () => {
    const t = server();
    const { ada, lin } = await seedGuild(t);
    await as(t, ada).mutation(api.clans.ensureActiveQuest, {});

    await as(t, lin).mutation(api.clans.reportContribution, countersFor(2));
    let view = await as(t, ada).query(api.clans.questView, {});
    expect(view!.pooled).toBe(2);

    // Same number again: idempotent, so repeat syncs can't double-count.
    await as(t, lin).mutation(api.clans.reportContribution, countersFor(2));
    view = await as(t, ada).query(api.clans.questView, {});
    expect(view!.pooled).toBe(2);

    // A stale, lower report must not roll a member's contribution back.
    await as(t, lin).mutation(api.clans.reportContribution, countersFor(1));
    view = await as(t, ada).query(api.clans.questView, {});
    expect(view!.pooled).toBe(2);

    // A newer, higher one replaces it.
    await as(t, lin).mutation(api.clans.reportContribution, countersFor(2));
    await as(t, ada).mutation(api.clans.reportContribution, countersFor(3));
    view = await as(t, ada).query(api.clans.questView, {});
    expect(view!.pooled).toBe(5);
    expect(view!.contributors.map((c) => c.name)).toEqual(["Ada", "Lin"]);
    expect(view!.contributors[0].isMe).toBe(true);
    expect(view!.contributors[0].contribution).toBe(3);
  });

  it("completes when the pool crosses the target, then pays once per member", async () => {
    const t = server();
    const { ada, lin, sam } = await seedGuild(t);
    await as(t, ada).mutation(api.clans.ensureActiveQuest, {});
    const def = questDef();

    // Nothing to claim while the quest is still open.
    await expect(as(t, sam).mutation(api.clans.claimQuestReward, {})).rejects.toThrow(
      /not complete yet/i
    );

    await as(t, lin).mutation(api.clans.reportContribution, countersFor(1));
    await as(t, ada).mutation(api.clans.reportContribution, countersFor(def.baseTarget));

    // The flat base target alone never finishes a multi-member quest.
    const open = await as(t, ada).query(api.clans.questView, {});
    expect(open!.isComplete).toBe(false);

    // One member pushes the pool past the target — so the roster size > 1
    // means the last push has to be big enough to carry everyone.
    const target = open!.target;
    await as(t, ada).mutation(api.clans.reportContribution, countersFor(target));
    const done = await as(t, ada).query(api.clans.questView, {});
    expect(done!.isComplete).toBe(true);
    expect(done!.status).toBe("complete");
    expect(done!.pooled).toBeGreaterThanOrEqual(target);

    // The completion event is celebrated exactly once.
    const questEvents = await t.run((ctx) =>
      ctx.db.query("clanEvents").withIndex("by_clan_time").collect()
    );
    expect(questEvents.filter((e) => e.kind === "quest-done")).toHaveLength(1);

    // Reward split: even share across the members who contributed.
    const contributors = done!.contributors.length;
    const share = Math.floor(def.rewardXp / contributors);
    expect(await as(t, lin).mutation(api.clans.claimQuestReward, {})).toBe(share);
    expect(await as(t, sam).mutation(api.clans.claimQuestReward, {})).toBe(share);

    // One claim per (user, week) — the second attempt is refused.
    await expect(as(t, lin).mutation(api.clans.claimQuestReward, {})).rejects.toThrow(
      /already claimed/i
    );

    const claims = await as(t, lin).query(api.clans.questClaims, {});
    expect(claims).toEqual([{ weekKey: weekKey(), xp: share }]);
  });

  it("keeps the activity feed ordered, attributed and private to the guild", async () => {
    const t = server();
    const { ada, lin } = await seedGuild(t);
    const outcast = await t.run((ctx) =>
      ctx.db.insert("users", { name: "Rey", email: "rey@edura.test" })
    );

    // A learner outside the guild sees nothing of it.
    expect(await as(t, outcast).query(api.clans.feed, {})).toEqual([]);

    const feed = await as(t, ada).query(api.clans.feed, {});
    const texts = feed.map((e) => e.text);
    expect(texts).toContain("Lin joined the guild");
    expect(texts).toContain("Sam joined the guild");
    expect(texts).toContain("Ada founded the guild");
    // Newest first.
    expect(feed[0].createdAt).toBeGreaterThanOrEqual(feed[feed.length - 1].createdAt);
    expect(feed.find((e) => e.text === "Lin joined the guild")!.actorName).toBe("Lin");
    expect(feed.find((e) => e.text === "Sam joined the guild")!.isMe).toBe(false);

    // Profile syncs land in the feed as level-ups, for guild members only.
    await as(t, ada).mutation(api.profiles.sync, {
      xp: 420,
      xpWeek: 420,
      xpMonth: 420,
      level: 3,
      ascension: "apprentice",
      streakCurrent: 2,
      streakLongest: 2,
      lastActiveDay: todayKey(),
      lessonsDone: 5,
      sourceDay: todayKey(),
    });
    const afterLevel = await as(t, lin).query(api.clans.feed, {});
    const levelUp = afterLevel.find((e) => e.kind === "level-up");
    expect(levelUp?.text).toBe("Ada reached level 3");
  });

  it("enforces the role ladder for promotion and removal", async () => {
    const t = server();
    const { clanId, ada, lin, sam } = await seedGuild(t);
    const rey = await t.run((ctx) =>
      ctx.db.insert("users", { name: "Rey", email: "rey@edura.test" })
    );
    await as(t, rey).mutation(api.clans.join, { clanId });

    // A regular member can neither promote nor remove anyone.
    await expect(
      as(t, sam).mutation(api.clans.setRole, { userId: lin, officer: true })
    ).rejects.toThrow(/Only the founder/i);
    await expect(as(t, sam).mutation(api.clans.kick, { userId: lin })).rejects.toThrow(
      /founder or an officer/i
    );

    // The founder promotes Lin to officer.
    await as(t, ada).mutation(api.clans.setRole, { userId: lin, officer: true });
    const mine = await as(t, lin).query(api.clans.mine, {});
    expect(mine!.myRole).toBe("officer");
    expect(mine!.members.find((m) => m.userId === lin)?.role).toBe("officer");
    expect(mine!.members.find((m) => m.userId === ada)?.role).toBe("owner");

    // A progress push must never clear a server-granted role: the sync
    // payload has no memberRole field, so officers keep their badge (and no
    // client can mint one by spoofing the push).
    await as(t, lin).mutation(api.profiles.sync, {
      xp: 420,
      xpWeek: 420,
      xpMonth: 420,
      level: 3,
      ascension: "apprentice",
      streakCurrent: 1,
      streakLongest: 1,
      lastActiveDay: todayKey(),
      lessonsDone: 5,
      sourceDay: todayKey(),
    });
    expect((await as(t, lin).query(api.clans.mine, {}))!.myRole).toBe("officer");

    // An officer may remove a regular member…
    await as(t, lin).mutation(api.clans.kick, { userId: sam });
    expect(await as(t, sam).query(api.clans.mine, {})).toBeNull();
    expect(await as(t, sam).query(api.clans.feed, {})).toEqual([]);

    // …but not another officer, and never the founder.
    await as(t, ada).mutation(api.clans.setRole, { userId: rey, officer: true });
    await expect(as(t, lin).mutation(api.clans.kick, { userId: rey })).rejects.toThrow(
      /regular members/i
    );
    await expect(as(t, lin).mutation(api.clans.kick, { userId: ada })).rejects.toThrow(
      /regular members/i
    );

    // Demoted officers lose their powers, and a non-member can't be managed.
    await as(t, ada).mutation(api.clans.setRole, { userId: lin, officer: false });
    const demoted = await as(t, lin).query(api.clans.mine, {});
    expect(demoted!.myRole).toBe("member");
    await expect(as(t, lin).mutation(api.clans.kick, { userId: rey })).rejects.toThrow(
      /founder or an officer/i
    );
    await expect(
      as(t, ada).mutation(api.clans.setRole, { userId: sam, officer: false })
    ).rejects.toThrow(/isn't in your guild/i);
    await expect(
      as(t, ada).mutation(api.clans.setRole, { userId: ada, officer: false })
    ).rejects.toThrow(/already own/i);

    // Kick + promotion both left a trace for the whole guild.
    const feed = await as(t, ada).query(api.clans.feed, {});
    expect(feed.some((e) => e.kind === "promotion" && e.text === "Lin was promoted to officer")).toBe(true);
    expect(feed.some((e) => e.kind === "kick" && e.text === "Sam was removed from the guild")).toBe(true);
  });

  it("moves the founder's crown to the highest-XP member when they leave", async () => {
    const t = server();
    const { ada, lin } = await seedGuild(t);

    await as(t, lin).mutation(api.profiles.sync, {
      xp: 900,
      xpWeek: 900,
      xpMonth: 900,
      level: 4,
      ascension: "adept",
      streakCurrent: 3,
      streakLongest: 3,
      lastActiveDay: todayKey(),
      lessonsDone: 8,
    });
    await as(t, ada).mutation(api.clans.leave, {});

    const mine = await as(t, lin).query(api.clans.mine, {});
    expect(mine!.isOwner).toBe(true);
    expect(mine!.myRole).toBe("owner");
    const feed = await as(t, lin).query(api.clans.feed, {});
    expect(feed.some((e) => e.kind === "leave" && e.text === "Ada left the guild")).toBe(true);
  });
});
