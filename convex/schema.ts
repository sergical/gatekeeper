import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  repositories: defineTable({
    userId: v.string(),
    owner: v.string(),
    repo: v.string(),
    fullName: v.string(),
    description: v.optional(v.string()),
    lastSyncedAt: v.optional(v.number()),
    syncStatus: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_fullName", ["fullName"]),

  issues: defineTable({
    repositoryId: v.id("repositories"),
    userId: v.string(),
    githubId: v.number(),
    number: v.number(),
    title: v.string(),
    body: v.optional(v.string()),
    state: v.string(),
    labels: v.array(v.string()),
    author: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    embedding: v.optional(v.array(v.float64())),
  })
    .index("by_repository", ["repositoryId"])
    .index("by_repository_and_state", ["repositoryId", "state"])
    .index("by_repository_and_github_id", ["repositoryId", "githubId"])
    .index("by_repository_and_number", ["repositoryId", "number"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["repositoryId", "state"],
    }),

  pullRequests: defineTable({
    repositoryId: v.id("repositories"),
    userId: v.string(),
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
    embedding: v.optional(v.array(v.float64())),
  })
    .index("by_repository", ["repositoryId"])
    .index("by_repository_and_state", ["repositoryId", "state"])
    .index("by_repository_and_github_id", ["repositoryId", "githubId"])
    .index("by_repository_and_number", ["repositoryId", "number"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["repositoryId", "state"],
    }),

  analyses: defineTable({
    repositoryId: v.id("repositories"),
    userId: v.string(),
    targetType: v.union(v.literal("issue"), v.literal("pullRequest")),
    targetId: v.string(),
    summary: v.string(),
    category: v.string(),
    priority: v.number(),
    sentiment: v.string(),
    duplicateIds: v.optional(v.array(v.string())),
    createdAt: v.number(),
  })
    .index("by_target", ["targetType", "targetId"])
    .index("by_repository", ["repositoryId"]),

  syncJobs: defineTable({
    repositoryId: v.id("repositories"),
    userId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed")
    ),
    type: v.union(
      v.literal("issues"),
      v.literal("pulls"),
      v.literal("all")
    ),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    error: v.optional(v.string()),
    itemsSynced: v.optional(v.number()),
  })
    .index("by_repository", ["repositoryId"])
    .index("by_status", ["status"]),
});
