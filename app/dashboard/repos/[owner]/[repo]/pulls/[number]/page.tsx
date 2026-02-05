"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useAction } from "convex/react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import * as Sentry from "@sentry/nextjs";
import { api } from "@/convex/_generated/api";
import { AuthGuard } from "@/components/auth-guard";
import { NavHeader } from "@/components/nav-header";
import { AnalysisPanel } from "@/components/analysis-panel";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeftIcon } from "lucide-react";

function PrDetailContent() {
  const params = useParams<{
    owner: string;
    repo: string;
    number: string;
  }>();
  const { owner, repo, number: numberStr } = params;
  const prNumber = parseInt(numberStr, 10);

  const repos = useQuery(api.repositories.listRepos);
  const repoData = repos?.find(
    (r) => r.owner === owner && r.repo === repo
  );

  const pr = useQuery(
    api.pullRequests.getPullRequestByNumber,
    repoData ? { repositoryId: repoData._id, number: prNumber } : "skip"
  );

  const analysis = useQuery(
    api.analyses.getAnalysis,
    pr ? { targetType: "pullRequest", targetId: pr._id } : "skip"
  );

  const analyzeItem = useAction(api.ai.analyzeItem);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!pr) return;
    setIsAnalyzing(true);
    try {
      await Sentry.startSpan(
        {
          name: "analyzeItem",
          op: "ui.action",
          attributes: { "target.type": "pullRequest", "target.number": pr.number },
        },
        async () => {
          await analyzeItem({ targetType: "pullRequest", targetId: pr._id });
        }
      );
    } catch {
      // handled by UI state
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen">
      <NavHeader />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Link
          href={`/dashboard/repos/${owner}/${repo}`}
          className="inline-flex items-center gap-1 text-muted-foreground text-xs mb-4 hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon className="size-3" />
          {owner}/{repo}
        </Link>

        {pr === undefined ? (
          <p className="text-muted-foreground text-xs">
            Loading pull request...
          </p>
        ) : pr === null ? (
          <p className="text-muted-foreground text-xs">
            Pull request not found.
          </p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge
                  variant={pr.state === "open" ? "default" : "secondary"}
                >
                  {pr.merged ? "merged" : pr.state}
                </Badge>
                {pr.draft && <Badge variant="outline">Draft</Badge>}
                <span className="text-muted-foreground text-xs">
                  #{pr.number}
                </span>
              </div>
              <h1 className="text-sm font-medium mb-2">{pr.title}</h1>
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-4">
                <span>{pr.author}</span>
                <span>
                  opened {new Date(pr.createdAt).toLocaleDateString()}
                </span>
              </div>
              <Separator className="mb-4" />
              {pr.body ? (
                <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none text-xs [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs [&_p]:text-xs [&_li]:text-xs [&_code]:text-xs [&_pre]:text-xs">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                    {pr.body}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-muted-foreground text-xs italic">
                  No description provided.
                </p>
              )}
            </div>

            <div className="space-y-4">
              <AnalysisPanel
                analysis={analysis ?? null}
                onRunAnalysis={handleAnalyze}
                isAnalyzing={isAnalyzing}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function PrDetailPage() {
  return (
    <AuthGuard>
      <PrDetailContent />
    </AuthGuard>
  );
}
