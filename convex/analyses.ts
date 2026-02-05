import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const saveAnalysis = mutation({
  args: {
    repositoryId: v.id("repositories"),
    targetType: v.union(v.literal("issue"), v.literal("pullRequest")),
    targetId: v.string(),
    summary: v.string(),
    category: v.string(),
    priority: v.number(),
    sentiment: v.string(),
    duplicateIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.insert("analyses", {
      ...args,
      userId: identity.subject,
      createdAt: Date.now(),
    });
  },
});

export const getAnalysis = query({
  args: {
    targetType: v.union(v.literal("issue"), v.literal("pullRequest")),
    targetId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db
      .query("analyses")
      .withIndex("by_target", (q) =>
        q.eq("targetType", args.targetType).eq("targetId", args.targetId)
      )
      .first();
  },
});

export const listAnalysesByRepo = query({
  args: {
    repositoryId: v.id("repositories"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db
      .query("analyses")
      .withIndex("by_repository", (q) =>
        q.eq("repositoryId", args.repositoryId)
      )
      .collect();
  },
});
