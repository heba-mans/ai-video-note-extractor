"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export type Citation = {
  idx?: number;
  start_ts?: number; // seconds
  end_ts?: number; // seconds
  range_ts?: string; // e.g. "[0:00–4:14]" or "0:00-4:14"
  label?: string;
};

function parseRangeStartSeconds(range?: string): number | null {
  if (!range) return null;

  // Matches 0:00–4:14 (supports -, –, —)
  const m = range.match(/(\d+:\d{2})\s*[–—-]\s*(\d+:\d{2})/);
  if (!m) return null;

  const toSec = (t: string) => {
    const [mm, ss] = t.split(":").map(Number);
    if (Number.isNaN(mm) || Number.isNaN(ss)) return null;
    return mm! * 60 + ss!;
  };

  return toSec(m[1]!);
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
        const label = c.range_ts || c.label || `Source ${i + 1}`;

        const params = new URLSearchParams();
        if (keepQuery?.trim()) params.set("q", keepQuery.trim());

        // Prefer seg when the backend gives us an index
        if (typeof c.idx === "number") {
          params.set("seg", String(c.idx));
        } else {
          // Fallback to timestamp-based deep link
          const ts =
            typeof c.start_ts === "number"
              ? c.start_ts
              : parseRangeStartSeconds(c.range_ts) ?? null;

          if (typeof ts === "number") params.set("ts", String(ts));
        }

        const href = `/jobs/${jobId}/transcript${
          params.toString() ? `?${params}` : ""
        }`;

        return (
          <Link
            key={i}
            href={href}
            className={cn(
              "rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-muted/40"
            )}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
