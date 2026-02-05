import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { mutation, query, internalMutation } from "./_generated/server";

export const upsertPullRequests = mutation({
  args: {
    repositoryId: v.id("repositories"),
    pullRequests: v.array(
      v.object({
        githubId: v.number(),
        number: v.number(),
        title: v.string(),
        body: v.optional(v.string()),
        state: v.string(),
        author: v.string(),
        createdAt: v.number(),
        updatedAt: v.number(),
        draft: v.boolean(),
        merged: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject;

    for (const pr of args.pullRequests) {
      const existing = await ctx.db
        .query("pullRequests")
        .withIndex("by_repository_and_github_id", (q) =>
          q.eq("repositoryId", args.repositoryId).eq("githubId", pr.githubId)
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          ...pr,
          userId,
          repositoryId: args.repositoryId,
        });
      } else {
        await ctx.db.insert("pullRequests", {
          ...pr,
          userId,
          repositoryId: args.repositoryId,
        });
      }
    }
  },
});

export const listPullRequests = query({
  args: {
    repositoryId: v.id("repositories"),
    state: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    if (args.state) {
      return await ctx.db
        .query("pullRequests")
        .withIndex("by_repository_and_state", (q) =>
          q.eq("repositoryId", args.repositoryId).eq("state", args.state!)
        )
        .collect();
    }
    return await ctx.db
      .query("pullRequests")
      .withIndex("by_repository", (q) =>
        q.eq("repositoryId", args.repositoryId)
      )
      .collect();
  },
});

export const getPullRequest = query({
  args: {
    prId: v.id("pullRequests"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.get(args.prId);
  },
});

export const getPullRequestByNumber = query({
  args: {
    repositoryId: v.id("repositories"),
    number: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db
      .query("pullRequests")
      .withIndex("by_repository_and_number", (q) =>
        q.eq("repositoryId", args.repositoryId).eq("number", args.number)
      )
      .first();
  },
});

export const listPullRequestsPaginated = query({
  args: {
    repositoryId: v.id("repositories"),
    state: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    if (args.state) {
      return await ctx.db
        .query("pullRequests")
        .withIndex("by_repository_and_state", (q) =>
          q.eq("repositoryId", args.repositoryId).eq("state", args.state!)
        )
        .paginate(args.paginationOpts);
    }
    return await ctx.db
      .query("pullRequests")
      .withIndex("by_repository", (q) =>
        q.eq("repositoryId", args.repositoryId)
      )
      .paginate(args.paginationOpts);
  },
});

export const updateEmbedding = internalMutation({
  args: {
    prId: v.id("pullRequests"),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.prId, { embedding: args.embedding });
  },
});
