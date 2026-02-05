import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const addRepo = mutation({
  args: {
    owner: v.string(),
    repo: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject;

    const fullName = `${args.owner}/${args.repo}`;
    return await ctx.db.insert("repositories", {
      userId,
      owner: args.owner,
      repo: args.repo,
      fullName,
      syncStatus: "pending",
    });
  },
});

export const removeRepo = mutation({
  args: {
    repoId: v.id("repositories"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const repo = await ctx.db.get(args.repoId);
    if (!repo || repo.userId !== identity.subject) {
      throw new Error("Repository not found");
    }
    await ctx.db.delete(args.repoId);
  },
});

export const updateSyncStatus = mutation({
  args: {
    repoId: v.id("repositories"),
    status: v.string(),
    lastSyncedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.repoId, {
      syncStatus: args.status,
      ...(args.lastSyncedAt !== undefined
        ? { lastSyncedAt: args.lastSyncedAt }
        : {}),
    });
  },
});

export const listRepos = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db
      .query("repositories")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});

export const getRepo = query({
  args: {
    repoId: v.id("repositories"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const repo = await ctx.db.get(args.repoId);
    if (!repo || repo.userId !== identity.subject) {
      throw new Error("Repository not found");
    }
    return repo;
  },
});
