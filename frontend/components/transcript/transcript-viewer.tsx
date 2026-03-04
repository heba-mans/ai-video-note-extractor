"use client";

import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { msToLabel } from "@/lib/transcript/format";
import type { TranscriptSegment } from "@/lib/transcript/use-transcript";
import { cn } from "@/lib/utils";

export function TranscriptViewer({
  segments,
  activeIdx,
  onJumpToIdx,
}: {
  segments: TranscriptSegment[];
  activeIdx?: number | null;
  onJumpToIdx?: (idx: number) => void;
}) {
  const parentRef = React.useRef<HTMLDivElement | null>(null);

  const idxToArrayIndex = React.useMemo(() => {
    const m = new Map<number, number>();
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (!seg) continue;
      m.set(seg.idx, i);
    }
    return m;
  }, [segments]);

  const rowVirtualizer = useVirtualizer({
    count: segments.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 12,
  });

  // Pulse highlight for 1.5s after jump
  const [pulseIdx, setPulseIdx] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (activeIdx == null) return;

    const arrayIndex = idxToArrayIndex.get(activeIdx);
    if (arrayIndex == null) return;

    rowVirtualizer.scrollToIndex(arrayIndex, { align: "center" });

    setPulseIdx(activeIdx);
    const t = window.setTimeout(() => setPulseIdx(null), 1500);
    return () => window.clearTimeout(t);
  }, [activeIdx, idxToArrayIndex, rowVirtualizer]);

  return (
    <div
      ref={parentRef}
      className="h-[calc(100vh-220px)] overflow-auto rounded-lg border"
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((v) => {
          const seg = segments[v.index];
          if (!seg) return null;

          const isActive = activeIdx === seg.idx;
          const isPulsing = pulseIdx === seg.idx;

          return (
            <button
              key={v.key}
              type="button"
              className={cn(
                "absolute left-0 top-0 w-full border-b px-4 py-3 text-left text-sm transition-colors",
                isActive ? "bg-accent/50" : "bg-background",
                isPulsing ? "animate-pulse" : "",
                "hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
              style={{ transform: `translateY(${v.start}px)` }}
              onClick={() => onJumpToIdx?.(seg.idx)}
            >
              <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded bg-muted px-2 py-0.5">
                  {msToLabel(seg.start_ms)}–{msToLabel(seg.end_ms)}
                </span>
                <span>#{seg.idx}</span>
              </div>
              <div className="leading-6">{seg.text}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
