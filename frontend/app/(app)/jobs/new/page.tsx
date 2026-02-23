"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import { ApiError } from "@/lib/api/error";
import { createJob } from "@/features/jobs/jobs.api";

function isValidYouTubeUrl(url: string) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace("www.", "");
    const isYoutube =
      host === "youtube.com" || host === "youtu.be" || host === "m.youtube.com";

    if (!isYoutube) return false;

    // Accept youtu.be/<id> OR youtube.com/watch?v=<id>
    if (host === "youtu.be") {
      return u.pathname.length > 1;
    }

    if (u.pathname === "/watch") {
      return !!u.searchParams.get("v");
    }

    // also accept /shorts/<id>
    if (u.pathname.startsWith("/shorts/")) return true;

    return false;
  } catch {
    return false;
  }
}

export default function NewJobPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const isValid = useMemo(
    () => isValidYouTubeUrl(youtubeUrl.trim()),
    [youtubeUrl]
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const url = youtubeUrl.trim();

      if (!isValidYouTubeUrl(url)) {
        throw new Error("Please enter a valid YouTube URL.");
      }

      return createJob({ youtube_url: url });
    },
    onSuccess: async (job) => {
      // refresh jobs list cache (nice UX)
      await qc.invalidateQueries({ queryKey: ["jobs"] });

      // redirect to job detail
      router.push(`/jobs/${job.id}`);
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setFormError(err.message);
        return;
      }
      if (err instanceof Error) {
        setFormError(err.message);
        return;
      }
      setFormError("Something went wrong.");
    },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New Job</h1>
        <p className="text-sm text-muted-foreground">
          Paste a YouTube link and we’ll transcribe it, summarize it, and let
          you ask questions with citations.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Video URL</CardTitle>
          <CardDescription>
            We support youtube.com, youtu.be, and Shorts.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {formError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {formError}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="youtube_url">YouTube URL</Label>
            <Input
              id="youtube_url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => {
                setFormError(null);
                setYoutubeUrl(e.target.value);
              }}
            />
            {!isValid && youtubeUrl.trim().length > 0 ? (
              <p className="text-xs text-muted-foreground">
                Enter a valid YouTube URL (watch?v=…, youtu.be/…, or /shorts/…).
              </p>
            ) : null}
          </div>

          <Button
            className="w-full"
            disabled={!isValid || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Creating job..." : "Create Job"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
