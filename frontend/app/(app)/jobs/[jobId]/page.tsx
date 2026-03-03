"use client";

import { useParams, useRouter } from "next/navigation";
import { useJob } from "@/lib/jobs/use-job";
import { useJobProgress, jobProgressUtils } from "@/lib/jobs/use-job-progress";
import { Button } from "@/components/ui/button";

export default function JobOverviewPage() {
  const router = useRouter();
  const { jobId } = useParams<{ jobId: string }>();

  const job = useJob(jobId);
  const progress = useJobProgress(jobId);

  if (job.isLoading) return <div>Loading job...</div>;
  if (job.error)
    return <div className="text-destructive">Failed to load job.</div>;
  if (!job.data) return <div>Not found.</div>;

  const status = progress.data?.status ?? job.data.status;

  const terminal = jobProgressUtils.isTerminal(status);
  const isCompleted = String(status).toLowerCase() === "completed";

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

      {terminal && !isCompleted ? (
        <div className="rounded-lg border p-4 text-sm">
          <div className="font-medium">This job did not complete</div>
          <div className="mt-1 text-muted-foreground">
            Status: <span className="font-mono">{status}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
