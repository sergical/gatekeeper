"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LoaderCircleIcon } from "lucide-react";

const statusConfig = {
  idle: { label: "Idle", variant: "secondary" as const },
  pending: { label: "Pending", variant: "secondary" as const },
  syncing: { label: "Syncing", variant: "default" as const },
  synced: { label: "Synced", variant: "outline" as const },
  completed: { label: "Synced", variant: "outline" as const },
  failed: { label: "Failed", variant: "destructive" as const },
} as const;

type SyncStatus = keyof typeof statusConfig;

export function SyncStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const config = statusConfig[(status as SyncStatus) in statusConfig ? (status as SyncStatus) : "idle"];
  return (
    <Badge variant={config.variant} className={cn(className)}>
      {status === "syncing" && (
        <LoaderCircleIcon className="animate-spin" />
      )}
      {config.label}
    </Badge>
  );
}
