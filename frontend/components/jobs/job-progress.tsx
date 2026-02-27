"use client";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function JobProgressStatus({
  status,
  percent,
  stage,
  message,
}: {
  status: string;
  percent?: number;
  stage?: string;
  message?: string;
}) {
  const s = (status ?? "").toLowerCase();

  const variant = ["failed", "error"].includes(s)
    ? "destructive"
    : ["completed", "complete", "succeeded", "success"].includes(s)
    ? "default"
    : ["processing", "running", "queued", "pending"].includes(s)
    ? "secondary"
    : "outline";

  const label = stage ? `${stage}` : status;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={variant}>{status}</Badge>
        <div className="text-sm text-muted-foreground">{label}</div>
      </div>

      {typeof percent === "number" ? (
        <div className="space-y-1">
          <Progress value={percent} className={cn("h-2")} />
          <div className="text-xs text-muted-foreground">
            {Math.round(percent)}%{message ? ` • ${message}` : ""}
          </div>
        </div>
      ) : message ? (
        <div className="text-xs text-muted-foreground">{message}</div>
      ) : null}
    </div>
  );
}
