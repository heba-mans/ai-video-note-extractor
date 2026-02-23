"use client";

import { AppShell } from "@/components/layout/app-shell";
import { useSession } from "@/lib/auth/use-session";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: user, isLoading } = useSession();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading…
      </div>
    );
  }

  // Important: never return null (blank screen).
  // Show a tiny fallback while redirecting.
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Redirecting…
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
