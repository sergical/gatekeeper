import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createSyncJob = mutation({
  args: {
    repositoryId: v.id("repositories"),
    type: v.union(v.literal("issues"), v.literal("pulls"), v.literal("all")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.insert("syncJobs", {
      repositoryId: args.repositoryId,
      userId: identity.subject,
      status: "pending",
      type: args.type,
      startedAt: Date.now(),
    });
  },
});

export const updateSyncJob = mutation({
  args: {
    jobId: v.id("syncJobs"),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed")
    ),
    error: v.optional(v.string()),
    itemsSynced: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { jobId, ...updates } = args;
    await ctx.db.patch(jobId, updates);
  },
});

export const getLatestSyncJob = query({
  args: {
    repositoryId: v.id("repositories"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db
      .query("syncJobs")
      .withIndex("by_repository", (q) =>
        q.eq("repositoryId", args.repositoryId)
      )
      .order("desc")
      .first();
  },
});

export const listSyncJobs = query({
  args: {
    repositoryId: v.id("repositories"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db
      .query("syncJobs")
      .withIndex("by_repository", (q) =>
        q.eq("repositoryId", args.repositoryId)
      )
      .order("desc")
      .collect();
  },
});
