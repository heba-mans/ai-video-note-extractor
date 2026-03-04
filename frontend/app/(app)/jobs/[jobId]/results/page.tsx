"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { useJobResults } from "@/lib/jobs/use-job-results";
import type { Chapter } from "@/lib/jobs/use-job-results";

import { SectionCard } from "@/components/results/section-card";
import { CopyButton } from "@/components/results/copy-button";
import { Markdown } from "@/components/results/markdown";
import { BulletsSection } from "@/components/results/bullets";
import { ChaptersSection } from "@/components/results/chapters";

import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function buildCombinedMarkdown(args: {
  summary: string;
  takeaways: string[];
  actions: string[];
  chapters: Chapter[];
  formatted?: string | null;
}) {
  if (args.formatted && args.formatted.trim()) return args.formatted;

  const lines: string[] = [];
  if (args.summary.trim()) {
    lines.push("# Summary", "", args.summary.trim(), "");
  }

  if (args.takeaways.length) {
    lines.push("# Key takeaways", "");
    for (const t of args.takeaways) lines.push(`- ${t}`);
    lines.push("");
  }

  if (args.actions.length) {
    lines.push("# Action items", "");
    for (const a of args.actions) lines.push(`- ${a}`);
    lines.push("");
  }

  if (args.chapters.length) {
    lines.push("# Chapters", "");
    args.chapters.forEach((c, idx) => {
      const title = c.title?.trim() ? c.title : `Chapter ${idx + 1}`;
      const range = c.range_ts ? ` ${c.range_ts}` : "";
      lines.push(`## ${title}${range}`, "");
      if (c.summary?.trim()) lines.push(c.summary.trim(), "");
    });
  }

  return lines.join("\n").trim() + "\n";
}

function cleanMockNoise(text: string) {
  // Best-effort cleanup for mock mode noise without damaging real content.
  // Removes common debug lines like "Preview: ### Chunk ..." and "Notes: Replace mock..."
  const lines = text.split("\n");
  const kept = lines.filter((l) => {
    const s = l.trim();
    if (!s) return true;

    const lower = s.toLowerCase();
    if (lower.startsWith("preview:")) return false;
    if (lower.startsWith("notes:")) return false;
    if (lower.includes("replace mock")) return false;

    // Remove leading "(MOCK)" token but keep line
    return true;
  });

  return kept
    .join("\n")
    .replace(/\(MOCK\)\s*/g, "")
    .replace(/\s+\n/g, "\n");
}

function isLong(text: string) {
  return text.trim().length > 900;
}

export default function ResultsPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { data, isLoading, error } = useJobResults(jobId);

  const [cleanView, setCleanView] = useState(true);
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  const summaryRaw = typeof data?.summary === "string" ? data.summary : "";
  const chapters = Array.isArray(data?.chapters) ? data!.chapters! : [];
  const takeaways = Array.isArray(data?.key_takeaways)
    ? data!.key_takeaways!
    : [];
  const actions = Array.isArray(data?.action_items) ? data!.action_items! : [];
  const formatted =
    typeof data?.formatted_markdown === "string"
      ? data.formatted_markdown
      : null;

  const summary = useMemo(() => {
    const s = summaryRaw ?? "";
    return cleanView ? cleanMockNoise(s) : s;
  }, [summaryRaw, cleanView]);

  const hasAnything =
    Boolean(summary?.trim()) ||
    chapters.length > 0 ||
    takeaways.length > 0 ||
    actions.length > 0 ||
    Boolean(formatted?.trim());

  const copyAll = useMemo(
    () =>
      buildCombinedMarkdown({
        summary,
        takeaways,
        actions,
        chapters,
        formatted,
      }),
    [summary, takeaways, actions, chapters, formatted]
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
        <Skeleton className="h-80 w-full" />
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

  if (!data || !hasAnything) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        Results aren’t ready yet. If the job is still processing, check the
        Overview tab.
      </div>
    );
  }

  const showSummary = Boolean(summary.trim());
  const longSummary = showSummary && isLong(summary);

  return (
    <div className="space-y-4">
      {/* Hero card */}
      <SectionCard
        title="Notes ready"
        description="Generated from the video transcript. Use sections below, export, or ask follow-ups."
        right={<CopyButton text={copyAll} />}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{chapters.length} chapters</Badge>
          <Badge variant="secondary">{takeaways.length} takeaways</Badge>
          <Badge variant="secondary">{actions.length} action items</Badge>
          {formatted?.trim() ? (
            <Badge variant="outline">formatted markdown</Badge>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button asChild variant="secondary" size="sm">
            <Link href={`/jobs/${jobId}/export`}>Export</Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link href={`/jobs/${jobId}/transcript`}>Open transcript</Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link href={`/jobs/${jobId}/ask`}>Ask follow-up</Link>
          </Button>

          <Button
            variant={cleanView ? "default" : "secondary"}
            size="sm"
            onClick={() => setCleanView((v) => !v)}
            title="Hides mock/debug lines in local testing"
          >
            {cleanView ? "Clean view: On" : "Clean view: Off"}
          </Button>
        </div>
      </SectionCard>

      {/* Summary */}
      <SectionCard
        title="Summary"
        description="High-level overview of the video."
        right={showSummary ? <CopyButton text={summary} /> : undefined}
      >
        {!showSummary ? (
          <div className="text-sm text-muted-foreground">No summary yet.</div>
        ) : (
          <div className="space-y-3">
            <div
              className={longSummary && !summaryExpanded ? "line-clamp-6" : ""}
            >
              <Markdown content={summary} />
            </div>

            {longSummary ? (
              <div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSummaryExpanded((v) => !v)}
                >
                  {summaryExpanded ? "Show less" : "Show more"}
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </SectionCard>

      {/* Chapters moved up for better flow */}
      {chapters.length ? (
        <ChaptersSection jobId={jobId} chapters={chapters} />
      ) : null}

      {/* Takeaways + actions */}
      <div className="grid gap-4 lg:grid-cols-2">
        <BulletsSection
          title="Key takeaways"
          description="The most important points worth remembering."
          items={takeaways}
          emptyMessage="No takeaways yet."
        />
        <BulletsSection
          title="Action items"
          description="Concrete things to do or try after watching."
          items={actions}
          emptyMessage="No action items yet."
        />
      </div>

      {/* Optional: raw formatted markdown */}
      {formatted?.trim() ? (
        <SectionCard
          title="Formatted markdown"
          right={<CopyButton text={formatted} />}
        >
          <Markdown content={formatted} />
        </SectionCard>
      ) : null}
    </div>
  );
}
