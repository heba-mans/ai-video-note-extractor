"use client";

import Link from "next/link";
import { SectionCard } from "./section-card";
import { Separator } from "@/components/ui/separator";
import { Markdown } from "./markdown";
import { Button } from "@/components/ui/button";
import type { Chapter } from "@/lib/jobs/use-job-results";

export function ChaptersSection({
  jobId,
  chapters,
}: {
  jobId?: string;
  chapters: Chapter[];
}) {
  return (
    <SectionCard
      title="Chapters"
      description="A structured outline of the video with time ranges when available."
    >
      <div className="space-y-4">
        {chapters.map((c, idx) => {
          const title = c.title?.trim() ? c.title : `Chapter ${idx + 1}`;
          const canJump =
            Boolean(jobId) &&
            typeof c.start_seconds === "number" &&
            c.start_seconds >= 0;

          const href = canJump
            ? `/jobs/${jobId}/transcript?ts=${Math.floor(c.start_seconds!)}`
            : null;

          return (
            <div key={`${idx}-${title}`} className="space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="font-medium">{title}</div>
                  {c.range_ts ? (
                    <div className="text-xs text-muted-foreground">
                      {c.range_ts}
                    </div>
                  ) : null}
                </div>

                {href ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={href}>Open in transcript</Link>
                  </Button>
                ) : null}
              </div>

              {c.summary ? (
                <div className="text-sm text-muted-foreground">
                  <Markdown content={c.summary} />
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No chapter notes.
                </div>
              )}

              {idx !== chapters.length - 1 ? <Separator /> : null}
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
