"use client";

import Link from "next/link";
import { useJobs } from "@/lib/jobs/use-jobs";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/jobs/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

export default function JobsPage() {
  const { data, isLoading, error, refetch } = useJobs();

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-9 w-24" />
        </div>

        <div className="border rounded-lg divide-y overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4">
              <div className="space-y-2">
                <Skeleton className="h-5 w-64" />
                <Skeleton className="h-4 w-40" />
              </div>
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

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

  if (!data || data.length === 0) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Jobs</h1>
          <Button asChild variant="secondary">
            <Link href="/jobs/new">New job</Link>
          </Button>
        </div>

        <div className="rounded-lg border p-6 text-sm text-muted-foreground">
          <div className="font-medium text-foreground">No jobs yet</div>
          <div className="mt-1">
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
        <h1 className="text-xl font-semibold">Jobs</h1>
        <Button asChild variant="secondary">
          <Link href="/jobs/new">New job</Link>
        </Button>
      </div>

      <div className="border rounded-lg divide-y">
        {data.map((job) => (
          <Link
            key={job.id}
            href={`/jobs/${job.id}`}
            className="flex items-center justify-between p-4 hover:bg-muted/40 transition"
          >
            <div>
              <div className="font-medium">{job.id}</div>
              <div className="text-sm text-muted-foreground">
                {formatDate(job.created_at)}
              </div>
            </div>

            <StatusBadge status={job.status} />
          </Link>
        ))}
      </div>
    </div>
  );
}
