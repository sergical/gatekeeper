"use client";

import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
} from "@/components/ui/card";
import { SyncStatusBadge } from "@/components/sync-status-badge";

interface RepoCardProps {
  owner: string;
  repo: string;
  description?: string;
  syncStatus: string;
  lastSyncedAt?: number;
}

export function RepoCard({
  owner,
  repo,
  description,
  syncStatus,
  lastSyncedAt,
}: RepoCardProps) {
  return (
    <Link href={`/dashboard/repos/${owner}/${repo}`}>
      <Card className="transition-colors hover:bg-muted/50">
        <CardHeader>
          <CardTitle>
            {owner}/{repo}
          </CardTitle>
          <CardAction>
            <SyncStatusBadge status={syncStatus} />
          </CardAction>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        {lastSyncedAt && (
          <CardContent>
            <p className="text-muted-foreground text-xs">
              Last synced {new Date(lastSyncedAt).toLocaleDateString()}
            </p>
          </CardContent>
        )}
      </Card>
    </Link>
  );
}
