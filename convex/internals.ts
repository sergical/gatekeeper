import { v } from "convex/values";
import { internalQuery, internalMutation } from "./_generated/server";

export const listAllRepos = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("repositories").collect();
  },
});

export const upsertIssuesInternal = internalMutation({
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
    const repo = await ctx.db.get(args.repositoryId);
    if (!repo) throw new Error("Repository not found");

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
          repositoryId: args.repositoryId,
          userId: repo.userId,
        });
      } else {
        await ctx.db.insert("issues", {
          ...issue,
          repositoryId: args.repositoryId,
          userId: repo.userId,
        });
      }
    }
  },
});

export const upsertPullRequestsInternal = internalMutation({
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
    const repo = await ctx.db.get(args.repositoryId);
    if (!repo) throw new Error("Repository not found");

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
          repositoryId: args.repositoryId,
          userId: repo.userId,
        });
      } else {
        await ctx.db.insert("pullRequests", {
          ...pr,
          repositoryId: args.repositoryId,
          userId: repo.userId,
        });
      }
    }
  },
});
