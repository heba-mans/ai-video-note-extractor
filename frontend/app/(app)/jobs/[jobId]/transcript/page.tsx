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

function findNearestSegmentIdxByTs(
  segments: { idx: number; start_ms: number; end_ms: number }[],
  tsSeconds: number
): number | null {
  const target = tsSeconds * 1000;
  if (!segments.length) return null;

  // Prefer containment
  const hit = segments.find((s) => s.start_ms <= target && target <= s.end_ms);
  if (hit) return hit.idx;

  // Else nearest by start
  let best = segments[0];
  let bestDist = Math.abs(best!.start_ms - target);

  for (const s of segments) {
    const d = Math.abs(s.start_ms - target);
    if (d < bestDist) {
      best = s;
      bestDist = d;
    }
  }

  return best!.idx;
}

export default function TranscriptPage() {
  const router = useRouter();
  const { jobId } = useParams<{ jobId: string }>();
  const sp = useSearchParams();

  const segFromUrl = toNumberOrNull(sp.get("seg"));
  const tsFromUrl = toNumberOrNull(sp.get("ts")); // seconds
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

  // FE-30: ts -> seg mapping once transcript is loaded
  React.useEffect(() => {
    if (!segments.length) return;

    // If seg already exists, we’re done.
    if (segFromUrl != null) return;

    // If we have a timestamp deep-link, map it to nearest segment.
    if (tsFromUrl == null) return;

    const idx = findNearestSegmentIdxByTs(segments, tsFromUrl);
    if (idx == null) return;

    setActiveIdx(idx);
    updateUrl({ seg: idx }); // keep q/ts intact in URLSearchParams
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments.length, tsFromUrl, segFromUrl]);

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
