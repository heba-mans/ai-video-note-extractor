"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useCreateJob } from "@/lib/jobs/use-create-job";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function isProbablyYouTubeUrl(url: string) {
  const u = url.trim();
  // simple and safe: we’ll accept youtu.be and youtube.com
  return /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(u);
}

export default function NewJobPage() {
  const router = useRouter();
  const [url, setUrl] = React.useState("");
  const [touched, setTouched] = React.useState(false);

  const createJob = useCreateJob();

  const urlTrim = url.trim();
  const isValid = urlTrim.length > 0 && isProbablyYouTubeUrl(urlTrim);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!isValid || createJob.isPending) return;

    try {
      const job = await createJob.mutateAsync({ youtube_url: urlTrim });
      router.push(`/jobs/${job.id}`);
    } catch {
      // error rendered below from createJob.error
    }
  }

  const errorMsg =
    touched && urlTrim.length > 0 && !isValid
      ? "Please enter a valid YouTube URL."
      : createJob.error instanceof Error
      ? createJob.error.message
      : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">New job</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste a YouTube link to generate transcript, notes, and insights.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="https://www.youtube.com/watch?v=..."
          autoComplete="off"
        />

        {errorMsg ? (
          <div className="text-sm text-destructive">{errorMsg}</div>
        ) : null}

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={!isValid || createJob.isPending}>
            {createJob.isPending ? "Creating..." : "Create job"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/jobs")}
          >
            Cancel
          </Button>
        </div>
      </form>

      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        Tip: Jobs can take a few minutes depending on video length. You’ll see
        live progress in the next phase (FE-26).
      </div>
    </div>
  );
}
