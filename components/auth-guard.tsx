"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { authClient } from "@/lib/auth-client";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/sign-in");
    }
  }, [isPending, session, router]);

  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground text-xs">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return <>{children}</>;
}
