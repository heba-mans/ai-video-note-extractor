"use client";

import { SectionCard } from "./section-card";
import { Separator } from "@/components/ui/separator";
import { Markdown } from "./markdown";
import type { Chapter } from "@/lib/jobs/use-job-results";

export function ChaptersSection({ chapters }: { chapters: Chapter[] }) {
  return (
    <SectionCard title="Chapters">
      <div className="space-y-4">
        {chapters.map((c, idx) => (
          <div key={idx} className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="font-medium">
                {c.title ?? `Chapter ${idx + 1}`}
              </div>
              {c.range_ts ? (
                <div className="text-xs text-muted-foreground">
                  {c.range_ts}
                </div>
              ) : null}
            </div>

            {c.summary ? (
              <div className="text-sm text-muted-foreground">
                <Markdown content={c.summary} />
              </div>
            ) : null}

            {idx !== chapters.length - 1 ? <Separator /> : null}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
