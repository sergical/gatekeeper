"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface IssueCardProps {
  owner: string;
  repo: string;
  number: number;
  title: string;
  state: "open" | "closed";
  labels: string[];
  author: string;
  createdAt: number;
}

export function IssueCard({
  owner,
  repo,
  number,
  title,
  state,
  labels,
  author,
  createdAt,
}: IssueCardProps) {
  return (
    <Link
      href={`/dashboard/repos/${owner}/${repo}/issues/${number}`}
      className="border-b border-border flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Badge variant={state === "open" ? "default" : "secondary"}>
            {state}
          </Badge>
          <span className="text-muted-foreground text-xs">#{number}</span>
        </div>
        <p className="text-xs mt-1 truncate">{title}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-muted-foreground text-xs">{author}</span>
          <span className="text-muted-foreground text-xs">
            {new Date(createdAt).toLocaleDateString()}
          </span>
          {labels.map((label) => (
            <Badge key={label} variant="outline" className="text-xs">
              {label}
            </Badge>
          ))}
        </div>
      </div>
    </Link>
  );
}
