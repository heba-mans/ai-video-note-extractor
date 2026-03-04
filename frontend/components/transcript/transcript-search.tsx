"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { msToLabel } from "@/lib/transcript/format";
import { useTranscriptSearch } from "@/lib/transcript/use-transcript-search";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (q.length < 2) return <>{text}</>;

  const safe = escapeRegExp(q);
  let re: RegExp | null = null;
  try {
    re = new RegExp(`(${safe})`, "ig");
  } catch {
    re = null;
  }
  if (!re) return <>{text}</>;

  const parts = text.split(re);
  if (parts.length <= 1) return <>{text}</>;

  return (
    <>
      {parts.map((p, i) => {
        const isMatch = i % 2 === 1;
        return isMatch ? (
          <mark
            key={i}
            className="rounded bg-yellow-500/20 px-0.5 text-foreground"
          >
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        );
      })}
    </>
  );
}

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
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query), 250);
    return () => window.clearTimeout(t);
  }, [query]);

  const trimmed = debounced.trim();
  const canSearch = trimmed.length >= 2;

  const { data, isLoading } = useTranscriptSearch(jobId, trimmed);
  const hits = data ?? [];

  React.useEffect(() => {
    setActive(0);
  }, [trimmed]);

  React.useEffect(() => {
    if (active >= hits.length) setActive(0);
  }, [hits.length, active]);

  React.useEffect(() => {
    const el = listRef.current?.querySelector<HTMLButtonElement>(
      `[data-hit-index="${active}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const clearQuery = React.useCallback(() => {
    onQueryChange("");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [onQueryChange]);

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // ✅ Esc should always clear when there's a query (even if < 2 chars)
    if (e.key === "Escape" && query.trim().length > 0) {
      e.preventDefault();
      clearQuery();
      return;
    }

    if (!canSearch) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!hits.length) return;
      setActive((v) => Math.min(v + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!hits.length) return;
      setActive((v) => Math.max(v - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = hits[active];
      if (hit) onSelectIdx(hit.idx);
    }
  }

  // ✅ Catch Esc even when focus is on a result button (listbox)
  function onResultsKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape" && query.trim().length > 0) {
      e.preventDefault();
      clearQuery();
    }
  }

  const statusText = !canSearch
    ? "Type at least 2 characters to search."
    : isLoading
    ? "Searching…"
    : hits.length === 0
    ? "No results."
    : `${hits.length} result${hits.length === 1 ? "" : "s"} (Enter to jump)`;

  const activeId = hits[active] ? `hit-${hits[active]!.idx}` : undefined;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Search transcript…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={onInputKeyDown}
          className="pl-9 pr-10"
          aria-label="Search transcript"
          role="combobox"
          aria-expanded={canSearch}
          aria-controls="transcript-search-results"
          aria-activedescendant={activeId}
        />

        {query.trim().length ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 h-8 w-8"
            onClick={clearQuery}
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <div className="rounded-lg border">
        <div className="flex items-center justify-between gap-3 border-b px-3 py-2 text-xs text-muted-foreground">
          <span>{statusText}</span>
          <span className="hidden sm:inline">
            <span className="font-mono">↑↓</span> navigate •{" "}
            <span className="font-mono">Enter</span> jump •{" "}
            <span className="font-mono">Esc</span> clear
          </span>
        </div>

        <div
          id="transcript-search-results"
          ref={listRef}
          className="max-h-64 overflow-auto"
          role="listbox"
          aria-label="Search results"
          onKeyDown={onResultsKeyDown}
        >
          {hits.map((h, idx) => {
            const isActive = idx === active;
            const optionId = `hit-${h.idx}`;

            return (
              <button
                key={h.idx}
                id={optionId}
                data-hit-index={idx}
                role="option"
                aria-selected={isActive}
                className={cn(
                  "w-full border-b px-3 py-2 text-left text-sm transition-colors",
                  isActive ? "bg-muted/60" : "hover:bg-muted/40"
                )}
                onMouseEnter={() => setActive(idx)}
                onClick={() => onSelectIdx(h.idx)}
              >
                <div className="mb-1 text-xs text-muted-foreground">
                  {msToLabel(h.start_ms)}–{msToLabel(h.end_ms)} • #{h.idx}
                </div>
                <div className="line-clamp-2">
                  <HighlightedText text={h.text} query={trimmed} />
                </div>
              </button>
            );
          })}

          {!isLoading && canSearch && hits.length === 0 ? (
            <div className="px-3 py-6 text-sm text-muted-foreground">
              No matches for <span className="font-mono">{trimmed}</span>.
            </div>
          ) : null}

          {!canSearch ? (
            <div className="px-3 py-6 text-sm text-muted-foreground">
              Try searching for a phrase like{" "}
              <span className="font-mono">“neural network”</span> or{" "}
              <span className="font-mono">“action items”</span>.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
