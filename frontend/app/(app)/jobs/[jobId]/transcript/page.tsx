"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useTranscript } from "@/lib/transcript/use-transcript";
import { TranscriptViewer } from "@/components/transcript/transcript-viewer";
import { TranscriptSearch } from "@/components/transcript/transcript-search";
import { Skeleton } from "@/components/ui/skeleton";

function toNumberOrNull(v: string | null) {
  if (!v) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

export default function TranscriptPage() {
  const router = useRouter();
  const { jobId } = useParams<{ jobId: string }>();
  const sp = useSearchParams();

  const segFromUrl = toNumberOrNull(sp.get("seg"));
  const qFromUrl = sp.get("q") ?? "";

  const [activeIdx, setActiveIdx] = React.useState<number | null>(segFromUrl);
  const [query, setQuery] = React.useState(qFromUrl);

  const { data, isLoading, error } = useTranscript(jobId);
  const segments = data ?? [];

  // keep state in sync if user edits URL manually
  React.useEffect(() => {
    setActiveIdx(segFromUrl);
  }, [segFromUrl]);

  React.useEffect(() => {
    setQuery(qFromUrl);
  }, [qFromUrl]);

  function updateUrl(next: { seg?: number | null; q?: string }) {
    const params = new URLSearchParams(sp.toString());

    if (next.q !== undefined) {
      if (next.q.trim()) params.set("q", next.q);
      else params.delete("q");
    }

    if (next.seg !== undefined) {
      if (next.seg === null) params.delete("seg");
      else params.set("seg", String(next.seg));
    }

    const qs = params.toString();
    router.replace(`/jobs/${jobId}/transcript${qs ? `?${qs}` : ""}`);
  }

  function jumpToIdx(idx: number) {
    setActiveIdx(idx);
    updateUrl({ seg: idx }); // keep q as-is
  }

  function onQueryChange(nextQ: string) {
    setQuery(nextQ);
    updateUrl({ q: nextQ }); // keep seg as-is
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[520px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border p-4 text-sm text-destructive">
        Failed to load transcript.
      </div>
    );
  }

  if (!segments.length) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        Transcript is not ready yet. Come back when the job is completed.
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <div className="space-y-4">
        <div className="text-sm font-medium">Search</div>

        <TranscriptSearch
          jobId={jobId}
          query={query}
          onQueryChange={onQueryChange}
          onSelectIdx={(idx) => {
            setActiveIdx(idx);
            // when selecting result, persist BOTH q and seg
            updateUrl({ q: query, seg: idx });
          }}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Transcript</div>
          {activeIdx != null ? (
            <div className="text-xs text-muted-foreground">
              Jumped to #{activeIdx}
            </div>
          ) : null}
        </div>

        <TranscriptViewer
          segments={segments}
          activeIdx={activeIdx}
          onJumpToIdx={jumpToIdx}
        />
      </div>
    </div>
  );
}
