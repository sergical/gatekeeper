"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Octokit } from "@octokit/rest";
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: "https://3038f7e4347fb96abe073b3fcb6c9aae@o4505994951065600.ingest.us.sentry.io/4510835171065856",
  tracesSampleRate: 1.0,
  debug: true,
});

export const syncRepository = action({
  args: {
    repositoryId: v.id("repositories"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; itemsSynced: number }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await Sentry.startSpan(
      { name: "syncRepository", op: "github.sync" },
      async () => {
        const repo = await ctx.runQuery(api.repositories.getRepo, {
          repoId: args.repositoryId,
        });
        if (!repo) throw new Error("Repository not found");

        const jobId = await ctx.runMutation(api.syncJobs.createSyncJob, {
          repositoryId: args.repositoryId,
          type: "all",
        });

        try {
          await ctx.runMutation(api.syncJobs.updateSyncJob, {
            jobId,
            status: "running",
          });

          await ctx.runMutation(api.repositories.updateSyncStatus, {
            repoId: args.repositoryId,
            status: "syncing",
          });

          const octokit = new Octokit({
            auth: process.env.GITHUB_TOKEN,
          });

          // Fetch issues (max 100)
          const { data: issuesResponse } = await octokit.issues.listForRepo({
            owner: repo.owner,
            repo: repo.repo,
            state: "all",
            per_page: 100,
          });

          const issues = issuesResponse
            .filter((item) => !item.pull_request)
            .map((issue) => ({
              githubId: issue.id,
              number: issue.number,
              title: issue.title,
              body: issue.body ?? undefined,
              state: issue.state,
              labels: issue.labels
                .map((l) => (typeof l === "string" ? l : (l.name ?? "")))
                .filter(Boolean),
              author: issue.user?.login ?? "unknown",
              createdAt: new Date(issue.created_at).getTime(),
              updatedAt: new Date(issue.updated_at).getTime(),
            }));

          // Batch upsert issues in chunks of 25
          for (let i = 0; i < issues.length; i += 25) {
            await ctx.runMutation(api.issues.upsertIssues, {
              repositoryId: args.repositoryId,
              issues: issues.slice(i, i + 25),
            });
          }

          // Fetch pull requests (max 100)
          const { data: prsResponse } = await octokit.pulls.list({
            owner: repo.owner,
            repo: repo.repo,
            state: "all",
            per_page: 100,
          });

          const pullRequests = prsResponse.map((pr) => ({
            githubId: pr.id,
            number: pr.number,
            title: pr.title,
            body: pr.body ?? undefined,
            state: pr.state,
            author: pr.user?.login ?? "unknown",
            createdAt: new Date(pr.created_at).getTime(),
            updatedAt: new Date(pr.updated_at).getTime(),
            draft: pr.draft ?? false,
            merged: pr.merged_at !== null,
          }));

          // Batch upsert PRs in chunks of 25
          for (let i = 0; i < pullRequests.length; i += 25) {
            await ctx.runMutation(api.pullRequests.upsertPullRequests, {
              repositoryId: args.repositoryId,
              pullRequests: pullRequests.slice(i, i + 25),
            });
          }

          const totalSynced = issues.length + pullRequests.length;

          await ctx.runMutation(api.syncJobs.updateSyncJob, {
            jobId,
            status: "completed",
            itemsSynced: totalSynced,
            completedAt: Date.now(),
          });

          await ctx.runMutation(api.repositories.updateSyncStatus, {
            repoId: args.repositoryId,
            status: "synced",
            lastSyncedAt: Date.now(),
          });

          return { success: true, itemsSynced: totalSynced };
        } catch (error) {
          Sentry.captureException(error);

          await ctx.runMutation(api.syncJobs.updateSyncJob, {
            jobId,
            status: "failed",
            error: error instanceof Error ? error.message : "Unknown error",
            completedAt: Date.now(),
          });

          await ctx.runMutation(api.repositories.updateSyncStatus, {
            repoId: args.repositoryId,
            status: "failed",
          });

          throw error;
        }
      }
    );
  },
});

export const syncAllRepositories = internalAction({
  args: {},
  handler: async (ctx) => {
    const repos = await ctx.runQuery(internal.internals.listAllRepos);
    for (const repo of repos) {
      try {
        await ctx.runAction(internal.github._syncRepoInternal, {
          repositoryId: repo._id,
          owner: repo.owner,
          repo: repo.repo,
        });
      } catch (error) {
        Sentry.captureException(error, {
          tags: { repository: repo.fullName },
        });
      }
    }
  },
});

export const _syncRepoInternal = internalAction({
  args: {
    repositoryId: v.id("repositories"),
    owner: v.string(),
    repo: v.string(),
  },
  handler: async (ctx, args) => {
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    const { data: issuesResponse } = await octokit.issues.listForRepo({
      owner: args.owner,
      repo: args.repo,
      state: "all",
      per_page: 100,
    });

    const issues = issuesResponse
      .filter((item) => !item.pull_request)
      .map((issue) => ({
        githubId: issue.id,
        number: issue.number,
        title: issue.title,
        body: issue.body ?? undefined,
        state: issue.state,
        labels: issue.labels
          .map((l) => (typeof l === "string" ? l : (l.name ?? "")))
          .filter(Boolean),
        author: issue.user?.login ?? "unknown",
        createdAt: new Date(issue.created_at).getTime(),
        updatedAt: new Date(issue.updated_at).getTime(),
      }));

    const { data: prsResponse } = await octokit.pulls.list({
      owner: args.owner,
      repo: args.repo,
      state: "all",
      per_page: 100,
    });

    const pullRequests = prsResponse.map((pr) => ({
      githubId: pr.id,
      number: pr.number,
      title: pr.title,
      body: pr.body ?? undefined,
      state: pr.state,
      author: pr.user?.login ?? "unknown",
      createdAt: new Date(pr.created_at).getTime(),
      updatedAt: new Date(pr.updated_at).getTime(),
      draft: pr.draft ?? false,
      merged: pr.merged_at !== null,
    }));

    for (let i = 0; i < issues.length; i += 25) {
      await ctx.runMutation(internal.internals.upsertIssuesInternal, {
        repositoryId: args.repositoryId,
        issues: issues.slice(i, i + 25),
      });
    }

    for (let i = 0; i < pullRequests.length; i += 25) {
      await ctx.runMutation(internal.internals.upsertPullRequestsInternal, {
        repositoryId: args.repositoryId,
        pullRequests: pullRequests.slice(i, i + 25),
      });
    }
  },
});
