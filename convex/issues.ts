import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { mutation, query, internalMutation } from "./_generated/server";

export const upsertIssues = mutation({
  args: {
    repositoryId: v.id("repositories"),
    issues: v.array(
      v.object({
        githubId: v.number(),
        number: v.number(),
        title: v.string(),
        body: v.optional(v.string()),
        state: v.string(),
        labels: v.array(v.string()),
        author: v.string(),
        createdAt: v.number(),
        updatedAt: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject;

    for (const issue of args.issues) {
      const existing = await ctx.db
        .query("issues")
        .withIndex("by_repository_and_github_id", (q) =>
          q.eq("repositoryId", args.repositoryId).eq("githubId", issue.githubId)
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          ...issue,
          userId,
          repositoryId: args.repositoryId,
        });
      } else {
        await ctx.db.insert("issues", {
          ...issue,
          userId,
          repositoryId: args.repositoryId,
        });
      }
    }
  },
});

export const listIssues = query({
  args: {
    repositoryId: v.id("repositories"),
    state: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    if (args.state) {
      return await ctx.db
        .query("issues")
        .withIndex("by_repository_and_state", (q) =>
          q.eq("repositoryId", args.repositoryId).eq("state", args.state!)
        )
        .collect();
    }
    return await ctx.db
      .query("issues")
      .withIndex("by_repository", (q) =>
        q.eq("repositoryId", args.repositoryId)
      )
      .collect();
  },
});

export const getIssue = query({
  args: {
    issueId: v.id("issues"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.get(args.issueId);
  },
});

export const getIssueByNumber = query({
  args: {
    repositoryId: v.id("repositories"),
    number: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db
      .query("issues")
      .withIndex("by_repository_and_number", (q) =>
        q.eq("repositoryId", args.repositoryId).eq("number", args.number)
      )
      .first();
  },
});

export const listIssuesPaginated = query({
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
        .query("issues")
        .withIndex("by_repository_and_state", (q) =>
          q.eq("repositoryId", args.repositoryId).eq("state", args.state!)
        )
        .paginate(args.paginationOpts);
    }
    return await ctx.db
      .query("issues")
      .withIndex("by_repository", (q) =>
        q.eq("repositoryId", args.repositoryId)
      )
      .paginate(args.paginationOpts);
  },
});

export const updateEmbedding = internalMutation({
  args: {
    issueId: v.id("issues"),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.issueId, { embedding: args.embedding });
  },
});
