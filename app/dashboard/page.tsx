"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AuthGuard } from "@/components/auth-guard";
import { NavHeader } from "@/components/nav-header";
import { RepoCard } from "@/components/repo-card";
import { AddRepoDialog } from "@/components/add-repo-dialog";
import { SearchBar } from "@/components/search-bar";

function DashboardContent() {
  const repos = useQuery(api.repositories.listRepos);

  return (
    <div className="min-h-screen">
      <NavHeader />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-sm font-medium">Repositories</h1>
          <AddRepoDialog />
        </div>
        <div className="mb-6">
          <SearchBar />
        </div>
        {repos === undefined ? (
          <p className="text-muted-foreground text-xs">Loading repositories...</p>
        ) : repos.length === 0 ? (
          <div className="border border-border rounded-none p-8 text-center">
            <p className="text-muted-foreground text-xs mb-2">
              No repositories tracked yet.
            </p>
            <p className="text-muted-foreground text-xs">
              Add a GitHub repository to get started.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {repos.map((repo) => (
              <RepoCard
                key={repo._id}
                owner={repo.owner}
                repo={repo.repo}
                description={repo.description}
                syncStatus={repo.syncStatus ?? "idle"}
                lastSyncedAt={repo.lastSyncedAt}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
