"use client";

import { useParams, useRouter } from "next/navigation";
import { useJob } from "@/lib/jobs/use-job";
import { useJobProgress, jobProgressUtils } from "@/lib/jobs/use-job-progress";
import { JobProgressStatus } from "@/components/jobs/job-progress";
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
  const percent = progress.data?.percent;
  const stage = progress.data?.stage;
  const message = progress.data?.message;

  const terminal = jobProgressUtils.isTerminal(status);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">
            {job.data.title ?? "Job"}{" "}
            <span className="text-muted-foreground">#{job.data.id}</span>
          </h1>
          {job.data.youtube_url ? (
            <div className="mt-1 truncate text-sm text-muted-foreground">
              {job.data.youtube_url}
            </div>
          ) : null}
        </div>

        <div className="w-full max-w-sm">
          <JobProgressStatus
            status={status}
            percent={percent}
            stage={stage ?? undefined}
            message={message ?? undefined}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={() => router.push(`/jobs/${jobId}/results`)}
        >
          View Results
        </Button>
        <Button
          variant="secondary"
          onClick={() => router.push(`/jobs/${jobId}/transcript`)}
        >
          View Transcript
        </Button>
        <Button
          variant="secondary"
          onClick={() => router.push(`/jobs/${jobId}/ask`)}
        >
          Ask the Video
        </Button>

        {terminal ? (
          <Button onClick={() => router.push(`/jobs/${jobId}/results`)}>
            Open results
          </Button>
        ) : null}
      </div>

      {!terminal ? (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          This page updates automatically while the job is running.
        </div>
      ) : null}
    </div>
  );
}
