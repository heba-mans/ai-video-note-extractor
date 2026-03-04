"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type Citation = {
  // Prefer direct segment selection when backend provides it
  idx?: number;

  // Timestamp range (seconds)
  start_ts?: number;
  end_ts?: number;

  // Human label like "[0:00–4:14]" or "0:00-4:14"
  range_ts?: string;

  // Optional display label override
  label?: string;
};

function fmtSecondsToLabel(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${ss.toString().padStart(2, "0")}`;
}

function parseTimeToSeconds(t: string): number | null {
  // supports "m:ss" or "h:mm:ss"
  const parts = t.split(":").map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n))) return null;

  if (parts.length === 2) {
    const [m, s] = parts;
    return m! * 60 + s!;
  }

  if (parts.length === 3) {
    const [h, m, s] = parts;
    return h! * 3600 + m! * 60 + s!;
  }

  return null;
}

function parseRangeSeconds(
  range?: string
): { start: number; end: number } | null {
  if (!range) return null;

  // Matches 0:00–4:14 (supports -, –, —)
  const m = range.match(
    /(\d+:\d{2}(?::\d{2})?)\s*[–—-]\s*(\d+:\d{2}(?::\d{2})?)/
  );
  if (!m) return null;

  const start = parseTimeToSeconds(m[1]!);
  const end = parseTimeToSeconds(m[2]!);
  if (start == null || end == null) return null;

  const s = Math.max(0, Math.min(start, end));
  const e = Math.max(0, Math.max(start, end));

  return { start: s, end: e };
}

function buildDefaultLabel(c: Citation, i: number): string {
  if (c.label?.trim()) return c.label.trim();
  if (c.range_ts?.trim()) return c.range_ts.trim();

  if (typeof c.start_ts === "number" && typeof c.end_ts === "number") {
    return `[${fmtSecondsToLabel(c.start_ts)}–${fmtSecondsToLabel(c.end_ts)}]`;
  }

  if (typeof c.start_ts === "number") {
    return `[${fmtSecondsToLabel(c.start_ts)}]`;
  }

  return `Source ${i + 1}`;
}

export function CitationChips({
  jobId,
  citations,
  keepQuery,
}: {
  jobId: string;
  citations: Citation[];
  keepQuery?: string;
}) {
  if (!citations?.length) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {citations.map((c, i) => {
        const label = buildDefaultLabel(c, i);

        const params = new URLSearchParams();
        if (keepQuery?.trim()) params.set("q", keepQuery.trim());

        // ✅ If we have a range (start/end), include it so FE-17 can highlight a span.
        // We still include seg if present, which gives a deterministic selected segment
        // while range controls the highlight.
        const parsedFromRange = parseRangeSeconds(c.range_ts);
        const start =
          typeof c.start_ts === "number"
            ? Math.floor(c.start_ts)
            : parsedFromRange?.start ?? null;
        const end =
          typeof c.end_ts === "number"
            ? Math.floor(c.end_ts)
            : parsedFromRange?.end ?? null;

        if (typeof start === "number" && typeof end === "number") {
          params.set("range", `${start}-${end}`);
          // Helpful fallback: if seg is missing, Transcript will use range to pick seg
          params.set("ts", String(start));
        } else if (typeof start === "number") {
          params.set("ts", String(start));
        }

        if (typeof c.idx === "number") {
          params.set("seg", String(c.idx));
        }

        const href = `/jobs/${jobId}/transcript${
          params.toString() ? `?${params.toString()}` : ""
        }`;

        return (
          <Button
            key={`${i}-${label}`}
            asChild
            variant="outline"
            size="sm"
            className={cn("h-7 rounded-full px-3 text-xs")}
          >
            <Link href={href} aria-label={`Open transcript at ${label}`}>
              {label}
            </Link>
          </Button>
        );
      })}
    </div>
  );
}
