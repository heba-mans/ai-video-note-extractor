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

  if (isLoading) {
    return <div className="p-6">Loading jobs...</div>;
  }

  if (error) {
    return <div className="p-6 text-destructive">Failed to load jobs.</div>;
  }

  if (!data || data.length === 0) {
    return (
      <div className="p-6">
        <div className="rounded-lg border p-8 text-center">
          <h2 className="text-lg font-semibold">No jobs yet</h2>
          <p className="text-muted-foreground mt-2">
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
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Jobs</h1>

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

            <Badge variant={getBadgeVariant(job.status)}>{job.status}</Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}

function getBadgeVariant(status: string) {
  switch (status) {
    case "completed":
      return "default";
    case "processing":
      return "secondary";
    case "failed":
      return "destructive";
    default:
      return "outline";
  }
}
