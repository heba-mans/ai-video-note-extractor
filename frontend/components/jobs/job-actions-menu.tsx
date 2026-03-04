"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal, Copy, ExternalLink, Trash2, Ban } from "lucide-react";

import { cn } from "@/lib/utils";
import { getAppBaseUrl } from "@/lib/env";
import { useCancelJob } from "@/lib/jobs/use-cancel-job";
import { useDeleteJob } from "@/lib/jobs/use-delete-job";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

function isTerminal(status?: string) {
  const s = (status ?? "").toLowerCase();
  return ["completed", "failed", "error", "cancelled", "canceled"].includes(s);
}

async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
}

export function JobActionsMenu({
  jobId,
  status,
  youtubeUrl,
  className,
  variant = "ghost",
}: {
  jobId: string;
  status?: string;
  youtubeUrl?: string;
  className?: string;
  variant?: "ghost" | "secondary" | "outline";
}) {
  const router = useRouter();
  const cancel = useCancelJob(jobId);
  const del = useDeleteJob(jobId);

  const terminal = isTerminal(status);
  const canCancel = !terminal && !cancel.isPending && !del.isPending;
  const canDelete = !del.isPending && !cancel.isPending;

  async function onCopyLink() {
    try {
      const base = getAppBaseUrl();
      const url = `${base}/jobs/${jobId}`;
      await copyToClipboard(url);
      toast.success("Copied job link");
    } catch {
      toast.error("Copy failed");
    }
  }

  async function onCancel() {
    try {
      await cancel.mutateAsync();
      toast.success("Job canceled");
    } catch {
      toast.error("Failed to cancel job");
    }
  }

  async function onDelete() {
    try {
      await del.mutateAsync();
      toast.success("Job deleted");
      router.push("/jobs");
    } catch {
      toast.error("Failed to delete job");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size="icon"
          className={cn("h-9 w-9", className)}
          aria-label="Job actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={onCopyLink}>
          <Copy className="mr-2 h-4 w-4" />
          Copy link
        </DropdownMenuItem>

        {youtubeUrl ? (
          <DropdownMenuItem asChild>
            <a href={youtubeUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Open on YouTube
            </a>
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuSeparator />

        {/* Cancel */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem
              disabled={!canCancel}
              onSelect={(e) => e.preventDefault()}
            >
              <Ban className="mr-2 h-4 w-4" />
              Cancel job
            </DropdownMenuItem>
          </AlertDialogTrigger>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel this job?</AlertDialogTitle>
              <AlertDialogDescription>
                This stops processing and marks the job as canceled. You can
                keep the job record, but it won’t continue generating results.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel>Keep running</AlertDialogCancel>
              <AlertDialogAction
                onClick={onCancel}
                disabled={!canCancel}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {cancel.isPending ? "Canceling…" : "Cancel job"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem
              disabled={!canDelete}
              onSelect={(e) => e.preventDefault()}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete job
            </DropdownMenuItem>
          </AlertDialogTrigger>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this job permanently?</AlertDialogTitle>
              <AlertDialogDescription>
                This cannot be undone. The job will be removed from your jobs
                list.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                disabled={!canDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {del.isPending ? "Deleting…" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href={`/jobs/${jobId}`}>Open job</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
