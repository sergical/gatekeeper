"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface PrCardProps {
  owner: string;
  repo: string;
  number: number;
  title: string;
  state: "open" | "closed" | "merged";
  draft: boolean;
  author: string;
  createdAt: number;
}

const stateVariant = {
  open: "default",
  closed: "secondary",
  merged: "default",
} as const;

export function PrCard({
  owner,
  repo,
  number,
  title,
  state,
  draft,
  author,
  createdAt,
}: PrCardProps) {
  return (
    <Link
      href={`/dashboard/repos/${owner}/${repo}/pulls/${number}`}
      className="border-b border-border flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Badge variant={stateVariant[state]}>{state}</Badge>
          {draft && (
            <Badge variant="outline">Draft</Badge>
          )}
          <span className="text-muted-foreground text-xs">#{number}</span>
        </div>
        <p className="text-xs mt-1 truncate">{title}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-muted-foreground text-xs">{author}</span>
          <span className="text-muted-foreground text-xs">
            {new Date(createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </Link>
  );
}
