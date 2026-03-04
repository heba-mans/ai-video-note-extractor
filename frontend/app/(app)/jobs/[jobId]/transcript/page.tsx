"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useTranscript } from "@/lib/transcript/use-transcript";
import { TranscriptViewer } from "@/components/transcript/transcript-viewer";
import { TranscriptSearch } from "@/components/transcript/transcript-search";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getAppBaseUrl } from "@/lib/env";

function toNumberOrNull(v: string | null) {
  if (!v) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function parseRangeSeconds(
  v: string | null
): { start: number; end: number } | null {
  if (!v) return null;
  const raw = v.trim();
  const m = raw.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
  if (!m) return null;

  const start = Number(m[1]);
  const end = Number(m[2]);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;

  const s = Math.max(0, Math.min(start, end));
  const e = Math.max(0, Math.max(start, end));
  return { start: s, end: e };
}

function findNearestSegmentIdxByTs(
  segments: { idx: number; start_ms: number; end_ms: number }[],
  tsSeconds: number
): number | null {
  const target = tsSeconds * 1000;
  if (!segments.length) return null;

  const hit = segments.find((s) => s.start_ms <= target && target <= s.end_ms);
  if (hit) return hit.idx;

  let best = segments[0]!;
  let bestDist = Math.abs(best.start_ms - target);

  for (const s of segments) {
    const d = Math.abs(s.start_ms - target);
    if (d < bestDist) {
      best = s;
      bestDist = d;
    }
  }

  return best.idx;
}

function buildRangeHighlightSet(
  segments: { idx: number; start_ms: number; end_ms: number }[],
  rangeSeconds: { start: number; end: number }
): { set: Set<number>; firstIdx: number | null } {
  const startMs = rangeSeconds.start * 1000;
  const endMs = rangeSeconds.end * 1000;

  const set = new Set<number>();
  let firstIdx: number | null = null;

  for (const s of segments) {
    const overlaps = s.end_ms >= startMs && s.start_ms <= endMs;
    if (!overlaps) continue;

    set.add(s.idx);
    if (firstIdx == null) firstIdx = s.idx;
  }

  if (firstIdx == null) {
    firstIdx = findNearestSegmentIdxByTs(segments, rangeSeconds.start);
    if (firstIdx != null) set.add(firstIdx);
  }

  return { set, firstIdx };
}

export default function TranscriptPage() {
  const router = useRouter();
  const { jobId } = useParams<{ jobId: string }>();
  const sp = useSearchParams();

  const segFromUrl = toNumberOrNull(sp.get("seg"));
  const tsFromUrl = toNumberOrNull(sp.get("ts"));
  const rangeFromUrl = parseRangeSeconds(sp.get("range"));
  const qFromUrl = sp.get("q") ?? "";

  const [activeIdx, setActiveIdx] = React.useState<number | null>(segFromUrl);
  const [query, setQuery] = React.useState(qFromUrl);

  const { data, isLoading, error } = useTranscript(jobId);
  const segments = data ?? [];

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

  const rangeHighlight = React.useMemo(() => {
    if (!segments.length || !rangeFromUrl)
      return {
        set: undefined as Set<number> | undefined,
        firstIdx: null as number | null,
      };
    return buildRangeHighlightSet(segments, rangeFromUrl);
  }, [segments, rangeFromUrl]);

  React.useEffect(() => {
    if (!segments.length) return;
    if (segFromUrl != null) return;

    let idx: number | null = null;
    if (rangeFromUrl) idx = rangeHighlight.firstIdx;
    else if (tsFromUrl != null)
      idx = findNearestSegmentIdxByTs(segments, tsFromUrl);

    if (idx == null) return;

    setActiveIdx(idx);
    updateUrl({ seg: idx });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    segments.length,
    segFromUrl,
    tsFromUrl,
    rangeFromUrl,
    rangeHighlight.firstIdx,
  ]);

  function jumpToIdx(idx: number) {
    setActiveIdx(idx);
    updateUrl({ seg: idx });
  }

  function onQueryChange(nextQ: string) {
    setQuery(nextQ);
    updateUrl({ q: nextQ });
  }

  async function onCopyLink() {
    if (activeIdx == null) return;
    try {
      const params = new URLSearchParams(sp.toString());
      params.set("seg", String(activeIdx));

      const base = getAppBaseUrl();
      const url = `${base}/jobs/${jobId}/transcript?${params.toString()}`;
      await navigator.clipboard.writeText(url);

      toast.success("Copied transcript link");
    } catch {
      toast.error("Copy failed");
    }
  }

  function onClearSelection() {
    setActiveIdx(null);
    updateUrl({ seg: null });
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

  const hasRange = Boolean(rangeFromUrl);
  const rangeBadge = hasRange
    ? `Range: ${rangeFromUrl!.start}–${rangeFromUrl!.end}s`
    : null;

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
            updateUrl({ q: query, seg: idx });
          }}
        />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-medium">Transcript</div>
            {rangeBadge ? (
              <div className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                {rangeBadge}
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {activeIdx != null ? (
              <div className="text-xs text-muted-foreground">
                Selected #{activeIdx}
              </div>
            ) : null}

            <Button
              variant="secondary"
              size="sm"
              onClick={onCopyLink}
              disabled={activeIdx == null}
            >
              Copy link
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onClearSelection}
              disabled={activeIdx == null}
            >
              Clear
            </Button>
          </div>
        </div>

        <TranscriptViewer
          segments={segments}
          activeIdx={activeIdx}
          highlightIdxs={rangeHighlight.set}
          onJumpToIdx={jumpToIdx}
        />
      </div>
    </div>
  );
}
