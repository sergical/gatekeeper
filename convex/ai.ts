"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText, Output, embed } from "ai";
import { z } from "zod";
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: "https://3038f7e4347fb96abe073b3fcb6c9aae@o4505994951065600.ingest.us.sentry.io/4510835171065856",
  tracesSampleRate: 1.0,
  debug: true,
});

console.log("[sentry-diag] Sentry.init complete, isInitialized:", Sentry.isInitialized());

export const generateEmbedding = action({
  args: {
    text: v.string(),
  },
  handler: async (_ctx, args): Promise<number[]> => {
    console.log("[sentry-diag] generateEmbedding called, Sentry initialized:", Sentry.isInitialized());
    return await Sentry.startSpan(
      {
        name: "request text-embedding-3-small",
        op: "gen_ai.request",
        attributes: { "gen_ai.request.model": "text-embedding-3-small" },
      },
      async (span) => {
        const { embedding, usage } = await embed({
          model: openai.embedding("text-embedding-3-small"),
          value: args.text,
        });
        span.setAttribute("gen_ai.usage.input_tokens", usage?.tokens ?? 0);
        await Sentry.flush(2000);
        return embedding;
      }
    );
  },
});

const analysisSchema = z.object({
  summary: z.string().describe("A concise summary of the issue/PR"),
  category: z
    .string()
    .describe(
      "Category: bug, feature, enhancement, documentation, refactor, test, ci, or other"
    ),
  priority: z.number().describe("Priority from 1 (lowest) to 5 (highest)"),
  sentiment: z
    .string()
    .describe("Overall sentiment: positive, negative, neutral, or urgent"),
  duplicateIds: z
    .array(z.string())
    .optional()
    .describe("IDs of potential duplicate items, if any"),
});

type AnalysisResult = z.infer<typeof analysisSchema>;

export const analyzeItem = action({
  args: {
    targetType: v.union(v.literal("issue"), v.literal("pullRequest")),
    targetId: v.string(),
  },
  handler: async (ctx, args): Promise<AnalysisResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    console.log("[sentry-diag] analyzeItem called, Sentry initialized:", Sentry.isInitialized());
    return await Sentry.startSpan(
      {
        name: "invoke_agent analyzeItem",
        op: "gen_ai.invoke_agent",
        attributes: {
          "gen_ai.agent.name": "analyzeItem",
          "gen_ai.request.model": "claude-sonnet-4-5-20250929",
        },
      },
      async (agentSpan) => {
        let item;
        if (args.targetType === "issue") {
          item = await ctx.runQuery(api.issues.getIssue, {
            issueId: args.targetId as any,
          });
        } else {
          item = await ctx.runQuery(api.pullRequests.getPullRequest, {
            prId: args.targetId as any,
          });
        }
        if (!item) throw new Error("Item not found");

        const content: string = `Title: ${item.title}\n\nBody: ${item.body ?? "No description"}`;
        const prompt: string = `Analyze this GitHub ${args.targetType === "issue" ? "issue" : "pull request"}:\n\n${content}`;

        const result = await Sentry.startSpan(
          {
            name: "request claude-sonnet-4-5-20250929",
            op: "gen_ai.request",
            attributes: {
              "gen_ai.request.model": "claude-sonnet-4-5-20250929",
              "gen_ai.request.messages": JSON.stringify([
                { role: "user", content: prompt },
              ]),
            },
          },
          async (span) => {
            const r = await generateText({
              model: anthropic("claude-sonnet-4-5-20250929"),
              output: Output.object({ schema: analysisSchema }),
              prompt,
            });
            span.setAttribute(
              "gen_ai.response.text",
              JSON.stringify(r.output)
            );
            if (r.usage) {
              span.setAttribute(
                "gen_ai.usage.input_tokens",
                r.usage.inputTokens ?? 0
              );
              span.setAttribute(
                "gen_ai.usage.output_tokens",
                r.usage.outputTokens ?? 0
              );
            }
            return r;
          }
        );

        const object = result.output;
        if (!object) throw new Error("Analysis failed to generate");

        const { embedding } = await Sentry.startSpan(
          {
            name: "request text-embedding-3-small",
            op: "gen_ai.request",
            attributes: { "gen_ai.request.model": "text-embedding-3-small" },
          },
          async (span) => {
            const r = await embed({
              model: openai.embedding("text-embedding-3-small"),
              value: content,
            });
            span.setAttribute(
              "gen_ai.usage.input_tokens",
              r.usage?.tokens ?? 0
            );
            return r;
          }
        );

        if (args.targetType === "issue") {
          await ctx.runMutation(internal.issues.updateEmbedding, {
            issueId: args.targetId as any,
            embedding,
          });
        } else {
          await ctx.runMutation(internal.pullRequests.updateEmbedding, {
            prId: args.targetId as any,
            embedding,
          });
        }

        await ctx.runMutation(api.analyses.saveAnalysis, {
          repositoryId: item.repositoryId,
          targetType: args.targetType,
          targetId: args.targetId,
          summary: object.summary,
          category: object.category,
          priority: object.priority,
          sentiment: object.sentiment,
          duplicateIds: object.duplicateIds,
        });

        agentSpan.setAttribute(
          "gen_ai.response.text",
          JSON.stringify(object)
        );
        await Sentry.flush(2000);
        return object;
      }
    );
  },
});

export const searchSimilar = action({
  args: {
    repositoryId: v.id("repositories"),
    query: v.string(),
    targetType: v.optional(
      v.union(v.literal("issue"), v.literal("pullRequest"))
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await Sentry.startSpan(
      {
        name: "invoke_agent searchSimilar",
        op: "gen_ai.invoke_agent",
        attributes: {
          "gen_ai.agent.name": "searchSimilar",
          "gen_ai.request.model": "text-embedding-3-small",
        },
      },
      async () => {
        const { embedding } = await Sentry.startSpan(
          {
            name: "request text-embedding-3-small",
            op: "gen_ai.request",
            attributes: { "gen_ai.request.model": "text-embedding-3-small" },
          },
          async (span) => {
            const r = await embed({
              model: openai.embedding("text-embedding-3-small"),
              value: args.query,
            });
            span.setAttribute(
              "gen_ai.usage.input_tokens",
              r.usage?.tokens ?? 0
            );
            return r;
          }
        );

        const issueResults =
          !args.targetType || args.targetType === "issue"
            ? await ctx.vectorSearch("issues", "by_embedding", {
                vector: embedding,
                limit: 10,
                filter: (q) => q.eq("repositoryId", args.repositoryId),
              })
            : [];

        const prResults =
          !args.targetType || args.targetType === "pullRequest"
            ? await ctx.vectorSearch("pullRequests", "by_embedding", {
                vector: embedding,
                limit: 10,
                filter: (q) => q.eq("repositoryId", args.repositoryId),
              })
            : [];

        await Sentry.flush(2000);
        return { issues: issueResults, pullRequests: prResults };
      }
    );
  },
});

export const batchAnalyze = action({
  args: {
    repositoryId: v.id("repositories"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await Sentry.startSpan(
      {
        name: "invoke_agent batchAnalyze",
        op: "gen_ai.invoke_agent",
        attributes: {
          "gen_ai.agent.name": "batchAnalyze",
          "gen_ai.request.model": "claude-sonnet-4-5-20250929",
        },
      },
      async () => {
          const issues = await ctx.runQuery(api.issues.listIssues, {
            repositoryId: args.repositoryId,
          });

          const pullRequests = await ctx.runQuery(
            api.pullRequests.listPullRequests,
            {
              repositoryId: args.repositoryId,
            }
          );

          const existingAnalyses = await ctx.runQuery(
            api.analyses.listAnalysesByRepo,
            { repositoryId: args.repositoryId }
          );

          const analyzedTargets = new Set(
            existingAnalyses.map(
              (a: { targetType: string; targetId: string }) =>
                `${a.targetType}:${a.targetId}`
            )
          );

          let analyzed = 0;

          for (const issue of issues) {
            if (!analyzedTargets.has(`issue:${issue._id}`)) {
              try {
                await ctx.runAction(api.ai.analyzeItem, {
                  targetType: "issue",
                  targetId: issue._id,
                });
                analyzed++;
              } catch (error) {
                Sentry.captureException(error, {
                  tags: { targetType: "issue", targetId: issue._id },
                });
              }
            }
          }

          for (const pr of pullRequests) {
            if (!analyzedTargets.has(`pullRequest:${pr._id}`)) {
              try {
                await ctx.runAction(api.ai.analyzeItem, {
                  targetType: "pullRequest",
                  targetId: pr._id,
                });
                analyzed++;
              } catch (error) {
                Sentry.captureException(error, {
                  tags: { targetType: "pullRequest", targetId: pr._id },
                });
              }
            }
          }

          await Sentry.flush(2000);
          return { analyzed };
        }
      );
  },
});
