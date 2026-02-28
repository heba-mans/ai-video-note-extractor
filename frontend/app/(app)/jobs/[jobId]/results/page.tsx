"use client";

import { useParams } from "next/navigation";
import { useJobResults } from "@/lib/jobs/use-job-results";
import { SectionCard } from "@/components/results/section-card";
import { CopyButton } from "@/components/results/copy-button";
import { Markdown } from "@/components/results/markdown";
import { BulletsSection } from "@/components/results/bullets";
import { ChaptersSection } from "@/components/results/chapters";
import { Skeleton } from "@/components/ui/skeleton";

function coalesceArray(a?: string[], b?: string[]) {
  return (a && a.length ? a : b) ?? [];
}

export default function ResultsPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { data, isLoading, error } = useJobResults(jobId);
  console.log("RESULTS DATA", data);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border p-4 text-sm text-destructive">
        Failed to load results.
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        No results available yet.
      </div>
    );
  }

  const summary = typeof data.summary === "string" ? data.summary : "";
  const chapters = Array.isArray(data.chapters) ? data.chapters : [];
  const takeaways = Array.isArray(data.key_takeaways) ? data.key_takeaways : [];
  const actions = Array.isArray(data.action_items) ? data.action_items : [];

  // nice fallback if backend returns different keys
  const hasAnything =
    Boolean(summary) ||
    chapters.length > 0 ||
    takeaways.length > 0 ||
    actions.length > 0;

  if (!hasAnything) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        Results are not ready yet. Try again in a moment.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {summary ? (
        <SectionCard title="Summary" right={<CopyButton text={summary} />}>
          <Markdown content={summary} />
        </SectionCard>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {takeaways.length ? (
          <BulletsSection title="Key takeaways" items={takeaways} />
        ) : (
          <SectionCard title="Key takeaways">
            <div className="text-sm text-muted-foreground">
              No takeaways yet.
            </div>
          </SectionCard>
        )}

        {actions.length ? (
          <BulletsSection title="Action items" items={actions} />
        ) : (
          <SectionCard title="Action items">
            <div className="text-sm text-muted-foreground">
              No action items yet.
            </div>
          </SectionCard>
        )}
      </div>

      {chapters.length ? <ChaptersSection chapters={chapters} /> : null}
    </div>
  );
}
