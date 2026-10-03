import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import { api } from "../src/convex/_generated/api";
import schema from "../src/convex/schema";
import type { Id } from "../src/convex/_generated/dataModel";
import { MAX_GUILD_MEMBERS } from "../src/lib/guild";

/*
 * The guild guard rails nobody exercises on the happy path.
 *
 * The quest lifecycle suite walks a guild through a normal week. This one
 * opens the doors the happy path never touches, because each one is a way a
 * shared roster can go wrong silently: a guild founded twice under one name, a
 * 26th member slipping past the cap, a stale officer badge surviving a move
 * between guilds, a kick aimed at the wrong person, a freed member banking a
 * reward, or a repeat profile sync parking progress on a quest that isn't
 * running. Each guard already exists in `src/convex/clans.ts` — these tests
 * pin the exact failure (or the exact silence) so a refactor can't quietly
 * drop one.
 */

const modules = import.meta.glob("../src/convex/**/*.*s");

function server() {
  return convexTest(schema, modules);
}

type Server = ReturnType<typeof server>;

function as(t: Server, userId: Id<"users">) {
  return t.withIdentity({ subject: userId });
}

async function makeUser(t: Server, name: string) {
  return t.run((ctx) =>
    ctx.db.insert("users", { name, email: `${name.toLowerCase()}@codexter.test` })
  );
}

/** A learner with a player card but no guild. */
async function makeProfile(t: Server, userId: Id<"users">, name: string, clanId?: Id<"clans">) {
  return t.run((ctx) =>
    ctx.db.insert("profiles", {
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
      ...(clanId ? { clanId } : {}),
    })
  );
}

/** Fills a roster with synthetic members (faster than running the real join). */
async function addMembers(t: Server, clanId: Id<"clans">, count: number) {
  await t.run(async (ctx) => {
    for (let i = 0; i < count; i++) {
      const userId = await ctx.db.insert("users", {
        name: `Filler ${i}`,
        email: `filler${i}@codexter.test`,
      });
      await ctx.db.insert("profiles", {
        userId,
        name: `Filler ${i}`,
        xp: i,
        xpWeek: 0,
        xpMonth: 0,
        level: 1,
        ascension: "initiate",
        streakCurrent: 0,
        streakLongest: 0,
        lessonsDone: 0,
        clanId,
        updatedAt: Date.now(),
      });
    }
  });
}

describe("founding a guild", () => {
  it("refuses a name or tag that can't be told apart", async () => {
    const t = server();
    const ada = await makeUser(t, "Ada");
    const me = as(t, ada);

    await expect(
      me.mutation(api.clans.create, { name: "AB", tag: "AB", blurb: "" })
    ).rejects.toThrow(/at least 3 characters/);
    await expect(
      me.mutation(api.clans.create, { name: "   ", tag: "AB", blurb: "" })
    ).rejects.toThrow(/at least 3 characters/);
    await expect(
      me.mutation(api.clans.create, { name: "Nightly", tag: "A", blurb: "" })
    ).rejects.toThrow(/letters or numbers/);
    // "@@@" sanitizes to nothing at all.
    await expect(
      me.mutation(api.clans.create, { name: "Nightly", tag: "@@@", blurb: "" })
    ).rejects.toThrow(/letters or numbers/);

    // A valid submission is normalized, not rejected: whitespace is collapsed,
    // the tag is uppercased and stripped to letters/numbers, and an empty
    // blurb becomes the default motto.
    await me.mutation(api.clans.create, {
      name: "  Nightly   Builders  ",
      tag: "n.b!",
      blurb: "   ",
    });
    const mine = await me.query(api.clans.mine, {});
    expect(mine!.name).toBe("Nightly Builders");
    expect(mine!.tag).toBe("NB");
    expect(mine!.blurb).toBe("No motto yet — recruiting builders.");
  });

  it("keeps cleaned names and tags unique across guilds", async () => {
    const t = server();
    const ada = await makeUser(t, "Ada");
    const lin = await makeUser(t, "Lin");
    await as(t, ada).mutation(api.clans.create, {
      name: "Nightly Builders",
      tag: "NB",
      blurb: "ship nightly",
    });

    // Same name once whitespace is collapsed (the form the server stores).
    await expect(
      as(t, lin).mutation(api.clans.create, {
        name: "  Nightly   Builders ",
        tag: "XY",
        blurb: "",
      })
    ).rejects.toThrow(/name is taken/);

    // Different name, but the tag sanitizes to the same badge.
    await expect(
      as(t, lin).mutation(api.clans.create, { name: "Day Builders", tag: "n.b", blurb: "" })
    ).rejects.toThrow(/tag is taken/);
  });

  it("makes a founder leave the current guild before founding another", async () => {
    const t = server();
    const ada = await makeUser(t, "Ada");
    const me = as(t, ada);
    await me.mutation(api.clans.create, { name: "Nightly Builders", tag: "NB", blurb: "" });

    await expect(
      me.mutation(api.clans.create, { name: "Second Thoughts", tag: "ST", blurb: "" })
    ).rejects.toThrow(/Leave your current guild first/);
  });
});

describe("joining and leaving a guild", () => {
  it("refuses a join into a vanished or full guild, but lets a member re-join", async () => {
    const t = server();
    const owner = await makeUser(t, "Owner");
    const lin = await makeUser(t, "Lin");
    const rey = await makeUser(t, "Rey");
    const clanId = await as(t, owner).mutation(api.clans.create, {
      name: "Nightly Builders",
      tag: "NB",
      blurb: "",
    });

    // A clan id that used to exist: the row is gone but the id is well formed.
    const gone = await t.run(async (ctx) => {
      const id = await ctx.db.insert("clans", {
        name: "Ghost Guild",
        tag: "GG",
        blurb: "gone",
        ownerId: owner,
        createdAt: Date.now(),
      });
      await ctx.db.delete(id);
      return id;
    });
    await expect(as(t, rey).mutation(api.clans.join, { clanId: gone })).rejects.toThrow(
      /no longer exists/
    );

    // Fill the roster to exactly the cap: owner + 24 fillers = 25.
    await addMembers(t, clanId, MAX_GUILD_MEMBERS - 1);
    await expect(as(t, rey).mutation(api.clans.join, { clanId })).rejects.toThrow(/full/);

    // An existing member re-joining their own (now full) guild is a no-op,
    // never a "guild is full" error — the panel re-syncs freely.
    await expect(as(t, owner).mutation(api.clans.join, { clanId })).resolves.toBeNull();

    // One seat short of the cap, the same outsider gets in.
    const other = await as(t, lin).mutation(api.clans.create, {
      name: "Day Shift",
      tag: "DS",
      blurb: "",
    });
    await addMembers(t, other, MAX_GUILD_MEMBERS - 2);
    await as(t, rey).mutation(api.clans.join, { clanId: other });
    expect((await as(t, rey).query(api.clans.mine, {}))!.id).toBe(other);
  });

  it("disbands an empty guild when its founder walks out", async () => {
    const t = server();
    const ada = await makeUser(t, "Ada");
    const clanId = await as(t, ada).mutation(api.clans.create, {
      name: "Nightly Builders",
      tag: "NB",
      blurb: "",
    });

    await as(t, ada).mutation(api.clans.leave, {});

    expect(await t.run((ctx) => ctx.db.get(clanId))).toBeNull();
    expect(await as(t, ada).query(api.clans.mine, {})).toBeNull();
    expect(await as(t, ada).query(api.clans.list, {})).toEqual([]);
  });

  it("leaving with nothing to leave is a silent no-op", async () => {
    const t = server();
    const free = await makeUser(t, "Free");
    const noCard = await makeUser(t, "Ghost"); // not even a player card
    await makeProfile(t, free, "Free");

    await expect(as(t, free).mutation(api.clans.leave, {})).resolves.toBeNull();
    await expect(as(t, noCard).mutation(api.clans.leave, {})).resolves.toBeNull();
  });
});

describe("roles and removal", () => {
  it("keeps role management founder-only even for officers", async () => {
    const t = server();
    const ada = await makeUser(t, "Ada");
    const lin = await makeUser(t, "Lin");
    const sam = await makeUser(t, "Sam");
    const clanId = await as(t, ada).mutation(api.clans.create, {
      name: "Nightly Builders",
      tag: "NB",
      blurb: "",
    });
    await as(t, lin).mutation(api.clans.join, { clanId });
    await as(t, sam).mutation(api.clans.join, { clanId });
    await as(t, ada).mutation(api.clans.setRole, { userId: lin, officer: true });

    await expect(
      as(t, lin).mutation(api.clans.setRole, { userId: sam, officer: true })
    ).rejects.toThrow(/Only the founder/);
    expect((await as(t, sam).query(api.clans.mine, {}))!.members.find((m) => m.userId === sam)?.role).toBe(
      "member"
    );
  });

  it("tells the founder to leave rather than kick themselves, and guards outsiders", async () => {
    const t = server();
    const ada = await makeUser(t, "Ada");
    const lin = await makeUser(t, "Lin");
    const rey = await makeUser(t, "Rey");
    const clanId = await as(t, ada).mutation(api.clans.create, {
      name: "Nightly Builders",
      tag: "NB",
      blurb: "",
    });
    await as(t, lin).mutation(api.clans.join, { clanId });

    await expect(as(t, ada).mutation(api.clans.kick, { userId: ada })).rejects.toThrow(
      /Leave guild/
    );

    // An outsider has no membership to remove — the founder is told, not obeyed.
    await expect(as(t, ada).mutation(api.clans.kick, { userId: rey })).rejects.toThrow(
      /isn't in your guild/
    );
    // An officer gets the same guard, before any role comparison.
    await as(t, ada).mutation(api.clans.setRole, { userId: lin, officer: true });
    await expect(as(t, lin).mutation(api.clans.kick, { userId: rey })).rejects.toThrow(
      /isn't in your guild/
    );

    // A free agent has no powers at all.
    await expect(as(t, rey).mutation(api.clans.kick, { userId: lin })).rejects.toThrow(
      /not in a guild/
    );
  });

  it("fails closed when a stale card points at a vanished guild", async () => {
    const t = server();
    const ada = await makeUser(t, "Ada");
    const ghost = await t.run(async (ctx) => {
      const id = await ctx.db.insert("clans", {
        name: "Ghost Guild",
        tag: "GG",
        blurb: "gone",
        ownerId: ada,
        createdAt: Date.now(),
      });
      await ctx.db.delete(id);
      return id;
    });
    await makeProfile(t, ada, "Ada", ghost);

    // The card still names a clan that no longer exists: the panel shows
    // nothing, and the two mutations refuse instead of operating on ghosts.
    expect(await as(t, ada).query(api.clans.mine, {})).toBeNull();
    await expect(
      as(t, ada).mutation(api.clans.setRole, { userId: ada, officer: false })
    ).rejects.toThrow(/no longer exists/);
    await expect(as(t, ada).mutation(api.clans.kick, { userId: ada })).rejects.toThrow(
      /no longer exists/
    );
  });
});

describe("quest guards", () => {
  it("refuses a reward claim for a learner with no guild", async () => {
    const t = server();
    const rey = await makeUser(t, "Rey");

    // No player card at all…
    await expect(as(t, rey).mutation(api.clans.claimQuestReward, {})).rejects.toThrow(
      /Join a guild first/
    );
    // …and a card with no clan are the same answer.
    await makeProfile(t, rey, "Rey");
    await expect(as(t, rey).mutation(api.clans.claimQuestReward, {})).rejects.toThrow(
      /Join a guild first/
    );
  });

  it("ignores contributions that can't move the bar", async () => {
    const t = server();
    const ada = await makeUser(t, "Ada");

    // Signed out, no clan, no quest: all silent no-ops rather than errors —
    // the QuestBridge pushes these on every profile sync.
    await t.mutation(api.clans.reportContribution, { lessons: 5, xp: 5, flawless: 5 });
    await as(t, ada).mutation(api.clans.reportContribution, { lessons: 5, xp: 5, flawless: 5 });
    await as(t, ada).mutation(api.clans.create, {
      name: "Nightly Builders",
      tag: "NB",
      blurb: "",
    });
    // A guild with no quest yet has nothing to report against — and nothing
    // to show.
    expect(await as(t, ada).query(api.clans.questView, {})).toBeNull();
    expect(await as(t, ada).query(api.clans.activeQuest, {})).toBeNull();
    await as(t, ada).mutation(api.clans.reportContribution, { lessons: 5, xp: 5, flawless: 5 });
    expect(await t.run((ctx) => ctx.db.query("clanQuestProgress").collect())).toEqual([]);

    // With the week's quest open, zero and negative reports write nothing…
    await as(t, ada).mutation(api.clans.ensureActiveQuest, {});
    await as(t, ada).mutation(api.clans.reportContribution, { lessons: 0, xp: 0, flawless: 0 });
    await as(t, ada).mutation(api.clans.reportContribution, { lessons: -4, xp: -4, flawless: -4 });
    expect(await t.run((ctx) => ctx.db.query("clanQuestProgress").collect())).toEqual([]);

    // …and a fractional total banks its whole part, not the fraction.
    await as(t, ada).mutation(api.clans.reportContribution, { lessons: 2.9, xp: 2.9, flawless: 2.9 });
    const rows = await t.run((ctx) => ctx.db.query("clanQuestProgress").collect());
    expect(rows).toHaveLength(1);
    expect(rows[0].contribution).toBe(2);
    const view = await as(t, ada).query(api.clans.questView, {});
    expect(view!.pooled).toBe(2);
  });
});
