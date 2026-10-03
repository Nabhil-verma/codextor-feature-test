import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/** Who am I? Returns the signed-in user's name/email, or null. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return {
      name: (user.name as string | undefined) ?? "",
      email: (user.email as string | undefined) ?? "",
    };
  },
});

/** Called once right after sign-up to persist the learner's display name. */
export const setName = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    await ctx.db.patch(userId, { name: name.trim().slice(0, 60) });
  },
});
