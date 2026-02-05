"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useAction, usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AuthGuard } from "@/components/auth-guard";
import { NavHeader } from "@/components/nav-header";
import { IssueCard } from "@/components/issue-card";
import { PrCard } from "@/components/pr-card";
import { SyncStatusBadge } from "@/components/sync-status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RefreshCwIcon } from "lucide-react";

type Tab = "issues" | "pulls" | "analysis";

function RepoDetailContent() {
  const params = useParams<{ owner: string; repo: string }>();
  const { owner, repo: repoName } = params;
  const [activeTab, setActiveTab] = useState<Tab>("issues");
  const [isSyncing, setIsSyncing] = useState(false);

  const repos = useQuery(api.repositories.listRepos);
  const repoData = repos?.find(
    (r) => r.owner === owner && r.repo === repoName
  );

  const {
    results: issues,
    status: issuesStatus,
    loadMore: loadMoreIssues,
  } = usePaginatedQuery(
    api.issues.listIssuesPaginated,
    repoData ? { repositoryId: repoData._id } : "skip",
    { initialNumItems: 50 }
  );

  const {
    results: pulls,
    status: pullsStatus,
    loadMore: loadMorePulls,
  } = usePaginatedQuery(
    api.pullRequests.listPullRequestsPaginated,
    repoData ? { repositoryId: repoData._id } : "skip",
    { initialNumItems: 50 }
  );

  const syncRepo = useAction(api.github.syncRepository);

  const handleSync = async () => {
    if (!repoData) return;
    setIsSyncing(true);
    try {
      await syncRepo({ repositoryId: repoData._id });
    } catch {
      // sync errors handled by status
    } finally {
      setIsSyncing(false);
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "issues", label: "Issues" },
    { key: "pulls", label: "Pull Requests" },
    { key: "analysis", label: "Analysis" },
  ];

  return (
    <div className="min-h-screen">
      <NavHeader />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-sm font-medium">
              {owner}/{repoName}
            </h1>
            {repoData?.description && (
              <p className="text-muted-foreground text-xs mt-1">
                {repoData.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {repoData && (
              <SyncStatusBadge
                status={isSyncing ? "syncing" : (repoData.syncStatus ?? "idle")}
              />
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleSync}
              disabled={isSyncing || !repoData}
            >
              <RefreshCwIcon className={isSyncing ? "animate-spin" : ""} />
              Sync
            </Button>
          </div>
        </div>

        <div className="flex gap-1 mb-4">
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              {tab.key === "issues" && issues && (
                <Badge variant="outline" className="ml-1">
                  {issues.length}{issuesStatus === "CanLoadMore" ? "+" : ""}
                </Badge>
              )}
              {tab.key === "pulls" && pulls && (
                <Badge variant="outline" className="ml-1">
                  {pulls.length}{pullsStatus === "CanLoadMore" ? "+" : ""}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        <Separator className="mb-4" />

        {activeTab === "issues" && (
          <div>
            {issuesStatus === "LoadingFirstPage" ? (
              <p className="text-muted-foreground text-xs">Loading issues...</p>
            ) : issues.length === 0 ? (
              <p className="text-muted-foreground text-xs py-4 text-center">
                No issues found. Sync the repository to fetch issues.
              </p>
            ) : (
              <>
                <div className="border border-border rounded-none">
                  {issues.map((issue) => (
                    <IssueCard
                      key={issue._id}
                      owner={owner}
                      repo={repoName}
                      number={issue.number}
                      title={issue.title}
                      state={issue.state as "open" | "closed"}
                      labels={issue.labels ?? []}
                      author={issue.author}
                      createdAt={issue.createdAt}
                    />
                  ))}
                </div>
                {issuesStatus === "CanLoadMore" && (
                  <div className="mt-4 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadMoreIssues(50)}
                    >
                      Load more issues
                    </Button>
                  </div>
                )}
                {issuesStatus === "LoadingMore" && (
                  <p className="text-muted-foreground text-xs mt-4 text-center">
                    Loading more...
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "pulls" && (
          <div>
            {pullsStatus === "LoadingFirstPage" ? (
              <p className="text-muted-foreground text-xs">
                Loading pull requests...
              </p>
            ) : pulls.length === 0 ? (
              <p className="text-muted-foreground text-xs py-4 text-center">
                No pull requests found. Sync the repository to fetch PRs.
              </p>
            ) : (
              <>
                <div className="border border-border rounded-none">
                  {pulls.map((pr) => (
                    <PrCard
                      key={pr._id}
                      owner={owner}
                      repo={repoName}
                      number={pr.number}
                      title={pr.title}
                      state={pr.merged ? "merged" : (pr.state as "open" | "closed")}
                      draft={pr.draft ?? false}
                      author={pr.author}
                      createdAt={pr.createdAt}
                    />
                  ))}
                </div>
                {pullsStatus === "CanLoadMore" && (
                  <div className="mt-4 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadMorePulls(50)}
                    >
                      Load more pull requests
                    </Button>
                  </div>
                )}
                {pullsStatus === "LoadingMore" && (
                  <p className="text-muted-foreground text-xs mt-4 text-center">
                    Loading more...
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "analysis" && (
          <div className="py-4 text-center">
            <p className="text-muted-foreground text-xs">
              Repository-level analysis coming soon.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function RepoDetailPage() {
  return (
    <AuthGuard>
      <RepoDetailContent />
    </AuthGuard>
  );
}
