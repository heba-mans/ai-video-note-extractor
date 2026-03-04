"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Copy } from "lucide-react";

import { useJob } from "@/lib/jobs/use-job";
import { useJobProgress } from "@/lib/jobs/use-job-progress";

import { JobProgressStatus } from "@/components/jobs/job-progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { JobActionsMenu } from "@/components/jobs/job-actions-menu";

async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
}

function parseYouTubeId(url?: string | null) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
    if (u.hostname === "youtu.be") return u.pathname.replace("/", "") || null;
    return null;
  } catch {
    return null;
  }
}

function displayTitle(title?: string | null, youtubeUrl?: string | null) {
  const t = title?.trim();
  if (t) return t;

  const vid = parseYouTubeId(youtubeUrl ?? null);
  if (vid) return `YouTube • ${vid}`;

  return "Untitled video";
}

function displayUrlLabel(youtubeUrl?: string | null) {
  const vid = parseYouTubeId(youtubeUrl ?? null);
  if (!youtubeUrl) return null;
  if (!vid) return youtubeUrl;
  return `youtube.com • ${vid}`;
}

export function JobDetailHeader({ jobId }: { jobId: string }) {
  const job = useJob(jobId);
  const progress = useJobProgress(jobId);

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

  const youtubeUrl = job.data.youtube_url ?? null;
  const title = displayTitle(job.data.title ?? null, youtubeUrl);
  const urlLabel = displayUrlLabel(youtubeUrl);

  async function onCopyId() {
    try {
      await copyToClipboard(job.data!.id);
      toast.success("Copied job ID");
    } catch {
      toast.error("Copy failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold leading-tight">{title}</h1>

            <span className="text-xs text-muted-foreground font-mono">
              #{job.data.id}
            </span>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onCopyId}
              aria-label="Copy job ID"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          {youtubeUrl ? (
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <a
                href={youtubeUrl}
                target="_blank"
                rel="noreferrer"
                className="truncate text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
                title={youtubeUrl}
              >
                {urlLabel ?? youtubeUrl}
              </a>
            </div>
          ) : null}
        </div>

        <div className="flex w-full max-w-sm items-start justify-end gap-2">
          <div className="flex-1">
            <JobProgressStatus
              status={status}
              percent={percent}
              stage={stage}
              message={message}
            />
          </div>

          <JobActionsMenu
            jobId={jobId}
            status={status}
            youtubeUrl={youtubeUrl ?? undefined}
            variant="secondary"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="secondary" size="sm">
          <Link href="/jobs">All jobs</Link>
        </Button>

        {youtubeUrl ? (
          <Button asChild variant="outline" size="sm">
            <a href={youtubeUrl} target="_blank" rel="noreferrer">
              Open on YouTube
            </a>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
