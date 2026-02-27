"use client";

import { useParams } from "next/navigation";
import { useJob } from "@/lib/jobs/use-job";
import { Badge } from "@/components/ui/badge";

export default function JobOverviewPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { data, isLoading, error } = useJob(jobId);

  if (isLoading) return <div>Loading job...</div>;
  if (error) return <div className="text-destructive">Failed to load job.</div>;
  if (!data) return <div>Not found.</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">
            {data.title ?? "Job"}{" "}
            <span className="text-muted-foreground">#{data.id}</span>
          </h1>
          {data.youtube_url ? (
            <div className="mt-1 text-sm text-muted-foreground">
              {data.youtube_url}
            </div>
          ) : null}
        </div>
        <Badge variant="outline">{data.status}</Badge>
      </div>

      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        FE-26 will add progress polling + live status.
      </div>
    </div>
  );
}
