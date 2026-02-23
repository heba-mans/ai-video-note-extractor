import { Badge } from "@/components/ui/badge";
import type { JobStatus } from "../jobs.types";

function normalizeStatus(s: string): JobStatus {
  const v = s?.toLowerCase();
  if (v === "queued") return "queued";
  if (v === "running") return "running";
  if (v === "succeeded") return "succeeded";
  if (v === "failed") return "failed";
  if (v === "canceled") return "canceled";
  return "unknown";
}

export function JobStatusBadge({ status }: { status: string }) {
  const s = normalizeStatus(status);

  // Keep variants simple; you can theme later.
  if (s === "succeeded") return <Badge>Success</Badge>;
  if (s === "failed") return <Badge variant="destructive">Failed</Badge>;
  if (s === "running") return <Badge variant="secondary">Running</Badge>;
  if (s === "queued") return <Badge variant="secondary">Queued</Badge>;
  if (s === "canceled") return <Badge variant="outline">Canceled</Badge>;
  return <Badge variant="outline">Unknown</Badge>;
}
