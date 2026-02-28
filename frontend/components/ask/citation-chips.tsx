"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type Citation = {
  idx?: number;
  start_ts?: number;
  end_ts?: number;
  range_ts?: string;
  label?: string;
};

export function CitationChips({
  jobId,
  citations,
}: {
  jobId: string;
  citations: Citation[];
}) {
  if (!citations?.length) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {citations.map((c, i) => {
        const label = c.range_ts || c.label || `Source ${i + 1}`;
        const href =
          typeof c.idx === "number"
            ? `/jobs/${jobId}/transcript?seg=${c.idx}`
            : `/jobs/${jobId}/transcript`; // fallback for now

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
