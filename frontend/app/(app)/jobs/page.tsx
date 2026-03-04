"use client";

import Link from "next/link";
import * as React from "react";

import { useJobs } from "@/lib/jobs/use-jobs";
import type { Job } from "@/lib/jobs/use-jobs";

import { StatusBadge } from "@/components/jobs/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { JobActionsMenu } from "@/components/jobs/job-actions-menu";

function shortId(id: string) {
  if (!id) return "";
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

function formatRelative(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  const t = d.getTime();
  if (Number.isNaN(t)) return null;

  const diff = Date.now() - t;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
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

function displayTitle(job: Job) {
  const t = job.title?.trim();
  if (t) return t;

  const vid = parseYouTubeId(job.youtube_url ?? null);
  if (vid) return `YouTube • ${vid}`;

  return "Untitled video";
}

function JobsSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-9 w-24" />
      </div>

      <div className="rounded-lg border overflow-hidden">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 border-b p-4 last:border-b-0"
          >
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-5 w-72" />
              <Skeleton className="h-4 w-40" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-9 w-9" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function JobsPage() {
  const { data, isLoading, error, refetch } = useJobs();

  if (isLoading) return <JobsSkeleton />;

  if (error) {
    return (
      <div className="p-6">
        <ErrorState
          title="Failed to load jobs"
          description="Please check your connection and try again."
          onRetry={() => refetch()}
          backHref="/"
        />
      </div>
    );
  }

  const jobs = data ?? [];

  if (jobs.length === 0) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Jobs</h1>
          <Button asChild variant="secondary">
            <Link href="/jobs/new">New job</Link>
          </Button>
        </div>

        <div className="rounded-lg border p-6">
          <div className="text-base font-semibold">No jobs yet</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Paste a YouTube link to generate notes, transcript, and chat.
          </div>
          <div className="mt-4">
            <Button asChild>
              <Link href="/jobs/new">Create your first job</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Jobs</h1>
          <div className="text-sm text-muted-foreground">
            {jobs.length} job{jobs.length === 1 ? "" : "s"}
          </div>
        </div>

        <Button asChild variant="secondary">
          <Link href="/jobs/new">New job</Link>
        </Button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        {jobs.map((job) => {
          const vid = parseYouTubeId(job.youtube_url ?? null);
          const rel = formatRelative(job.created_at);

          return (
            <div
              key={job.id}
              className="flex items-center justify-between gap-4 border-b p-4 last:border-b-0 hover:bg-muted/30 transition-colors"
            >
              <Link href={`/jobs/${job.id}`} className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="truncate font-medium">
                    {displayTitle(job)}
                  </div>
                  {vid ? (
                    <span className="hidden sm:inline-flex rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                      YouTube
                    </span>
                  ) : null}
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono" title={job.id}>
                    {shortId(job.id)}
                  </span>
                  {rel ? (
                    <>
                      <span className="opacity-60">•</span>
                      <span title={job.created_at ?? ""}>{rel}</span>
                    </>
                  ) : null}
                </div>
              </Link>

              <div className="flex items-center gap-3">
                <StatusBadge status={job.status} />
                <JobActionsMenu
                  jobId={job.id}
                  status={job.status}
                  youtubeUrl={job.youtube_url ?? undefined}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
