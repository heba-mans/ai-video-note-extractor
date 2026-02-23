"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Job } from "../jobs.types";
import { JobStatusBadge } from "./job-status-badge";

function formatDate(iso?: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function shortUrl(url: string) {
  try {
    const u = new URL(url);
    return u.hostname + u.pathname;
  } catch {
    return url;
  }
}

export function JobsTable({ jobs }: { jobs: Job[] }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Video</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job.id} className="cursor-pointer hover:bg-muted/40">
              <TableCell className="w-[140px]">
                <JobStatusBadge status={job.status} />
              </TableCell>

              <TableCell>
                <Link href={`/jobs/${job.id}`} className="block">
                  <div className="font-medium">
                    {job.title ?? "Untitled video"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {shortUrl(job.youtube_url)}
                  </div>
                </Link>
              </TableCell>

              <TableCell className="text-sm text-muted-foreground">
                {formatDate(job.created_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
