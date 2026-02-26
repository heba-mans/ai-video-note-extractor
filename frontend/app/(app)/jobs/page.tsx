"use client";

import Link from "next/link";
import { useJobs } from "@/lib/jobs/use-jobs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

export default function JobsPage() {
  const { data, isLoading, error } = useJobs();

  if (isLoading) return <div className="p-6">Loading jobs...</div>;

  if (error) {
    return <div className="p-6 text-destructive">Failed to load jobs.</div>;
  }

  if (!data || data.length === 0) {
    return (
      <div className="p-6">
        <div className="rounded-lg border p-8 text-center">
          <h2 className="text-lg font-semibold">No jobs yet</h2>
          <p className="mt-2 text-muted-foreground">
            Paste a YouTube link to generate notes.
          </p>
          <Link href="/jobs/new">
            <Button className="mt-4">Create your first job</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Jobs</h1>
        <Link href="/jobs/new">
          <Button variant="secondary">New job</Button>
        </Link>
      </div>

      <div className="divide-y rounded-lg border">
        {data.map((job) => (
          <Link
            key={job.id}
            href={`/jobs/${job.id}`}
            className="flex items-center justify-between p-4 transition hover:bg-muted/40"
          >
            <div className="min-w-0">
              <div className="truncate font-medium">{job.id}</div>
              <div className="text-sm text-muted-foreground">
                {formatDate(job.created_at)}
              </div>
            </div>

            <Badge variant={getBadgeVariant(job.status)} className="shrink-0">
              {job.status}
            </Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}

function getBadgeVariant(status: string) {
  const s = status?.toLowerCase?.() ?? "";
  if (["completed", "succeeded", "done"].includes(s)) return "default";
  if (["processing", "running", "queued"].includes(s)) return "secondary";
  if (["failed", "error"].includes(s)) return "destructive";
  return "outline";
}
