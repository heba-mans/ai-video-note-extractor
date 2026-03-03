"use client";

import { cn } from "@/lib/utils";

function norm(s?: string) {
  return (s ?? "").toLowerCase();
}

export function StatusBadge({ status }: { status?: string }) {
  const s = norm(status);

  const cls =
    s === "completed" || s === "complete"
      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
      : s === "failed" || s === "error"
      ? "bg-red-500/15 text-red-400 border-red-500/30"
      : s === "transcribing"
      ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
      : s === "summarizing"
      ? "bg-purple-500/15 text-purple-400 border-purple-500/30"
      : s === "downloading"
      ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
      : "bg-muted text-muted-foreground border-border";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        cls
      )}
    >
      {status ?? "—"}
    </span>
  );
}
