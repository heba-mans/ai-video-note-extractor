"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { msToLabel } from "@/lib/transcript/format";
import { useTranscriptSearch } from "@/lib/transcript/use-transcript-search";
import { cn } from "@/lib/utils";

export function TranscriptSearch({
  jobId,
  query,
  onQueryChange,
  onSelectIdx,
}: {
  jobId: string;
  query: string;
  onQueryChange: (q: string) => void;
  onSelectIdx: (idx: number) => void;
}) {
  const [debounced, setDebounced] = React.useState(query);
  const [active, setActive] = React.useState(0);
  const listRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  const { data, isLoading } = useTranscriptSearch(jobId, debounced);
  const hits = data ?? [];

  // keep active index in bounds when results change
  React.useEffect(() => {
    if (active >= hits.length) setActive(0);
  }, [hits.length, active]);

  // scroll active result into view
  React.useEffect(() => {
    const el = listRef.current?.querySelector<HTMLButtonElement>(
      `[data-hit-index="${active}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (debounced.trim().length < 2) return;
    if (!hits.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((v) => Math.min(v + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((v) => Math.max(v - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = hits[active];
      if (hit) onSelectIdx(hit.idx);
    }
  }

  return (
    <div className="space-y-3">
      <Input
        placeholder="Search transcript… (min 2 characters)"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={onKeyDown}
      />

      <div className="rounded-lg border">
        <div className="border-b px-3 py-2 text-xs text-muted-foreground">
          {debounced.trim().length < 2
            ? "Type to search"
            : isLoading
            ? "Searching…"
            : `${hits.length} results`}
        </div>

        <div ref={listRef} className="max-h-64 overflow-auto">
          {hits.map((h, idx) => (
            <button
              key={h.idx}
              data-hit-index={idx}
              className={cn(
                "w-full border-b px-3 py-2 text-left text-sm hover:bg-muted/40",
                idx === active ? "bg-muted/50" : ""
              )}
              onMouseEnter={() => setActive(idx)}
              onClick={() => onSelectIdx(h.idx)}
            >
              <div className="mb-1 text-xs text-muted-foreground">
                {msToLabel(h.start_ms)}–{msToLabel(h.end_ms)} • #{h.idx}
              </div>
              <div className="line-clamp-2">{h.text}</div>
            </button>
          ))}

          {!isLoading && debounced.trim().length >= 2 && hits.length === 0 ? (
            <div className="px-3 py-6 text-sm text-muted-foreground">
              No matches.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
