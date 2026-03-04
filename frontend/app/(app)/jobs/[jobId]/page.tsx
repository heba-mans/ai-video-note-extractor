"use client";

import { useParams, useRouter } from "next/navigation";
import { useJob } from "@/lib/jobs/use-job";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";

export default function JobOverviewPage() {
  const router = useRouter();
  const { jobId } = useParams<{ jobId: string }>();

  const job = useJob(jobId);

  if (job.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (job.error) {
    return (
      <ErrorState
        title="Failed to load job"
        description="Please try again."
        onRetry={() => job.refetch()}
        backHref="/jobs"
      />
    );
  }

  if (!job.data) {
    return (
      <ErrorState
        title="Job not found"
        description="This job may have been deleted."
        backHref="/jobs"
      />
    );
  }

  const isCompleted = (job.data.status ?? "").toLowerCase() === "completed";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          onClick={() => router.push(`/jobs/${jobId}/results`)}
          disabled={!isCompleted}
        >
          View Results
        </Button>

        <Button
          variant="secondary"
          onClick={() => router.push(`/jobs/${jobId}/transcript`)}
          disabled={!isCompleted}
        >
          View Transcript
        </Button>

        <Button
          variant="secondary"
          onClick={() => router.push(`/jobs/${jobId}/ask`)}
          disabled={!isCompleted}
        >
          Ask the Video
        </Button>

        {isCompleted ? (
          <Button onClick={() => router.push(`/jobs/${jobId}/results`)}>
            Open results
          </Button>
        ) : null}
      </div>

      {!isCompleted ? (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground space-y-1">
          <div>This page updates automatically while the job is running.</div>
          <div className="text-xs">
            Results, Transcript, and Ask unlock once processing completes.
          </div>
        </div>
      ) : null}
    </div>
  );
}
