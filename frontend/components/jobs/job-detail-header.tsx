"use client";

import * as React from "react";
import Link from "next/link";
import { useJob } from "@/lib/jobs/use-job";
import { useJobProgress } from "@/lib/jobs/use-job-progress";
import { JobProgressStatus } from "@/components/jobs/job-progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useCancelJob } from "@/lib/jobs/use-cancel-job";
import { toast } from "sonner";

function isTerminal(status: string | undefined) {
  const s = (status ?? "").toLowerCase();
  return [
    "completed",
    "failed",
    "error",
    "cancelled",
    "canceled",
    "canceled",
    "canceled",
  ].includes(s);
}

export function JobDetailHeader({ jobId }: { jobId: string }) {
  const job = useJob(jobId);
  const progress = useJobProgress(jobId);
  const cancel = useCancelJob(jobId);

  if (job.isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-4 w-full" />
          </div>
          <div className="w-full max-w-sm">
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
        <Skeleton className="h-9 w-56" />
      </div>
    );
  }

  if (job.error || !job.data) {
    return (
      <div className="rounded-lg border p-4 text-sm">
        <div className="font-medium">Unable to load job</div>
        <div className="mt-1 text-muted-foreground">
          Please return to the jobs list and try again.
        </div>
        <div className="mt-3">
          <Button asChild variant="secondary" size="sm">
            <Link href="/jobs">Back to jobs</Link>
          </Button>
        </div>
      </div>
    );
  }

  const status = progress.data?.status ?? job.data.status;
  const percent = progress.data?.percent;
  const stage = progress.data?.stage ?? undefined;
  const message = progress.data?.message ?? undefined;

  const title = job.data.title?.trim() ? job.data.title : "Job";

  const canCancel = !isTerminal(status) && !cancel.isPending;

  async function onCancel() {
    const ok = window.confirm(
      "Cancel this job? It will stop progressing and be marked as canceled."
    );
    if (!ok) return;

    try {
      await cancel.mutateAsync();
      toast.success("Job canceled");
    } catch (e) {
      toast.error("Failed to cancel job");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">
            {title}{" "}
            <span className="text-muted-foreground">#{job.data.id}</span>
          </h1>
          {job.data.youtube_url ? (
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <a
                href={job.data.youtube_url}
                target="_blank"
                rel="noreferrer"
                className="truncate text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                {job.data.youtube_url}
              </a>
            </div>
          ) : null}
        </div>

        <div className="w-full max-w-sm">
          <JobProgressStatus
            status={status}
            percent={percent}
            stage={stage}
            message={message}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="secondary" size="sm">
          <Link href="/jobs">All jobs</Link>
        </Button>

        {job.data.youtube_url ? (
          <Button asChild variant="outline" size="sm">
            <a href={job.data.youtube_url} target="_blank" rel="noreferrer">
              Open on YouTube
            </a>
          </Button>
        ) : null}

        {!isTerminal(status) ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={onCancel}
            disabled={!canCancel}
          >
            {cancel.isPending ? "Canceling…" : "Cancel job"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
