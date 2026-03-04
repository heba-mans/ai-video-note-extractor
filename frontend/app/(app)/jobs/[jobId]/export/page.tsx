"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useJob } from "@/lib/jobs/use-job";
import { useJobResults, type Chapter } from "@/lib/jobs/use-job-results";
import { SectionCard } from "@/components/results/section-card";
import { CopyButton } from "@/components/results/copy-button";
import { Markdown } from "@/components/results/markdown";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

function sanitizeFilePart(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function extractYouTubeId(url: string | null | undefined) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
    if (u.hostname === "youtu.be") return u.pathname.replace("/", "") || null;
    return null;
  } catch {
    return null;
  }
}

function buildGeneratedMarkdown(args: {
  title?: string | null;
  youtubeUrl?: string | null;
  summary: string;
  takeaways: string[];
  actions: string[];
  chapters: Chapter[];
}) {
  const lines: string[] = [];

  const title = args.title?.trim() ? args.title.trim() : "AI Video Notes";
  lines.push(`# ${title}`, "");

  if (args.youtubeUrl?.trim()) {
    lines.push(`Source: ${args.youtubeUrl.trim()}`, "");
  }

  if (args.summary.trim()) {
    lines.push(`## Summary`, "", args.summary.trim(), "");
  }

  if (args.takeaways.length) {
    lines.push(`## Key takeaways`, "");
    for (const t of args.takeaways) lines.push(`- ${t}`);
    lines.push("");
  }

  if (args.actions.length) {
    lines.push(`## Action items`, "");
    for (const a of args.actions) lines.push(`- ${a}`);
    lines.push("");
  }

  if (args.chapters.length) {
    lines.push(`## Chapters`, "");
    args.chapters.forEach((c, idx) => {
      const chapterTitle = c.title?.trim()
        ? c.title.trim()
        : `Chapter ${idx + 1}`;
      const range = c.range_ts ? ` ${c.range_ts}` : "";
      lines.push(`### ${chapterTitle}${range}`, "");
      if (c.summary?.trim()) {
        lines.push(c.summary.trim(), "");
      } else {
        lines.push(`(No chapter notes)`, "");
      }
    });
  }

  return lines.join("\n").trimEnd() + "\n";
}

function downloadTextFile(args: { filename: string; text: string }) {
  const blob = new Blob([args.text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = args.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

export default function ExportPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const job = useJob(jobId);
  const results = useJobResults(jobId);

  const [mode, setMode] = useState<"best" | "formatted" | "generated">("best");

  const isLoading = job.isLoading || results.isLoading;
  const error = job.error || results.error;

  const summary =
    typeof results.data?.summary === "string" ? results.data.summary : "";
  const chapters = Array.isArray(results.data?.chapters)
    ? results.data!.chapters!
    : [];
  const takeaways = Array.isArray(results.data?.key_takeaways)
    ? results.data!.key_takeaways!
    : [];
  const actions = Array.isArray(results.data?.action_items)
    ? results.data!.action_items!
    : [];

  const formatted =
    typeof results.data?.formatted_markdown === "string"
      ? results.data.formatted_markdown
      : "";

  const generated = useMemo(() => {
    return buildGeneratedMarkdown({
      title: job.data?.title ?? null,
      youtubeUrl: job.data?.youtube_url ?? null,
      summary,
      takeaways,
      actions,
      chapters,
    });
  }, [
    job.data?.title,
    job.data?.youtube_url,
    summary,
    takeaways,
    actions,
    chapters,
  ]);

  // ✅ FE-14 polish:
  // If formatted markdown is not available, "Best" should prefer the generated export,
  // because summary in mock mode can include chunk previews/noise.
  const effectiveMarkdown = useMemo(() => {
    const hasFormatted = Boolean(formatted.trim());

    if (mode === "formatted") return formatted.trim() ? formatted : "";
    if (mode === "generated") return generated;

    // best:
    // - if formatted exists: use it
    // - else: use generated
    return hasFormatted ? formatted : generated;
  }, [mode, formatted, generated]);

  const hasAnything =
    Boolean(formatted.trim()) ||
    Boolean(summary.trim()) ||
    chapters.length > 0 ||
    takeaways.length > 0 ||
    actions.length > 0;

  const filename = useMemo(() => {
    const title = job.data?.title?.trim();
    if (title) return `${sanitizeFilePart(title) || "ai-video-notes"}.md`;

    const ytId = extractYouTubeId(job.data?.youtube_url ?? null);
    if (ytId) return `youtube-${sanitizeFilePart(ytId)}.md`;

    return `job-${jobId.slice(0, 8)}.md`;
  }, [job.data?.title, job.data?.youtube_url, jobId]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border p-4 text-sm text-destructive">
        Failed to load export data.
      </div>
    );
  }

  if (!results.data || !hasAnything) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        Export isn’t ready yet. Once the job is completed, you’ll be able to
        download notes here.
      </div>
    );
  }

  async function onCopyAll() {
    try {
      await navigator.clipboard.writeText(effectiveMarkdown);
      toast.success("Copied markdown to clipboard");
    } catch {
      toast.error("Copy failed");
    }
  }

  function onDownload() {
    if (!effectiveMarkdown.trim()) {
      toast.error("Nothing to download yet");
      return;
    }
    downloadTextFile({ filename, text: effectiveMarkdown });
    toast.success("Downloaded markdown");
  }

  const bestLabel = formatted.trim() ? "Best (formatted)" : "Best (generated)";

  return (
    <div className="space-y-4">
      <SectionCard
        title="Export markdown"
        right={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onCopyAll}
              disabled={!effectiveMarkdown}
            >
              Copy markdown
            </Button>
            <Button
              size="sm"
              onClick={onDownload}
              disabled={!effectiveMarkdown}
            >
              Download .md
            </Button>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Filename:</span>
          <span className="font-mono text-foreground">{filename}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={mode === "best" ? "default" : "secondary"}
            onClick={() => setMode("best")}
          >
            {bestLabel}
          </Button>
          <Button
            size="sm"
            variant={mode === "formatted" ? "default" : "secondary"}
            onClick={() => setMode("formatted")}
            disabled={!formatted.trim()}
          >
            Formatted
          </Button>
          <Button
            size="sm"
            variant={mode === "generated" ? "default" : "secondary"}
            onClick={() => setMode("generated")}
          >
            Generated
          </Button>

          {!formatted.trim() ? (
            <span className="text-xs text-muted-foreground">
              (Formatted markdown not available for this job.)
            </span>
          ) : null}
        </div>
      </SectionCard>

      <Tabs defaultValue="preview">
        <TabsList>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="raw">Raw</TabsTrigger>
        </TabsList>

        <TabsContent value="preview">
          <SectionCard
            title="Preview"
            right={<CopyButton text={effectiveMarkdown} />}
          >
            {effectiveMarkdown.trim() ? (
              <Markdown content={effectiveMarkdown} />
            ) : (
              <div className="text-sm text-muted-foreground">
                Nothing to preview yet.
              </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="raw">
          <SectionCard
            title="Raw markdown"
            right={<CopyButton text={effectiveMarkdown} />}
          >
            <Textarea
              value={effectiveMarkdown}
              readOnly
              className="min-h-[360px] font-mono text-xs"
            />
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
