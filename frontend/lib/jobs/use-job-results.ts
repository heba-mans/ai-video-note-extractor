"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import { qk } from "@/lib/query/keys";
import { ApiError } from "@/lib/api/error";

export type Chapter = {
  title?: string;
  range_ts?: string;
  summary?: string; // used by your ChaptersSection
};

export type JobResults = {
  summary?: string;
  chapters?: Chapter[];
  key_takeaways?: string[];
  action_items?: string[];
  formatted_markdown?: string | null;

  [key: string]: unknown;
};

function fmtRange(start?: number, end?: number) {
  if (typeof start !== "number" || typeof end !== "number") return undefined;

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return `[${fmt(start)}–${fmt(end)}]`;
}

function unwrapPayload(raw: any) {
  // backend may return { payload: {...} } or { payload_json: {...} }
  if (raw && typeof raw === "object") {
    if (raw.payload && typeof raw.payload === "object") return raw.payload;
    if (raw.payload_json && typeof raw.payload_json === "object")
      return raw.payload_json;
  }
  return raw;
}

function normalize(rawResponse: any): JobResults {
  const raw = unwrapPayload(rawResponse);

  const summary =
    typeof raw?.summary === "string"
      ? raw.summary
      : typeof raw?.reduce_summary_md === "string"
      ? raw.reduce_summary_md
      : "";

  const chaptersRaw: any[] = Array.isArray(raw?.chapters) ? raw.chapters : [];
  const chapters: Chapter[] = chaptersRaw.map((c) => ({
    title: typeof c?.title === "string" ? c.title : undefined,
    range_ts: fmtRange(c?.start_seconds, c?.end_seconds),
    summary: typeof c?.bullets_md === "string" ? c.bullets_md : undefined,
  }));

  const takeawaysRaw: any[] = Array.isArray(raw?.key_takeaways)
    ? raw.key_takeaways
    : [];
  const key_takeaways: string[] = takeawaysRaw
    .map((t) => (typeof t?.content === "string" ? t.content : null))
    .filter(Boolean) as string[];

  const actionsRaw: any[] = Array.isArray(raw?.action_items)
    ? raw.action_items
    : [];
  const action_items: string[] = actionsRaw
    .map((a) => (typeof a?.content === "string" ? a.content : null))
    .filter(Boolean) as string[];

  return {
    ...raw,
    summary,
    chapters,
    key_takeaways,
    action_items,
    formatted_markdown: raw?.formatted_markdown ?? null,
  };
}

export function useJobResults(jobId: string) {
  return useQuery<JobResults | null>({
    queryKey: qk.jobs.results(jobId),
    enabled: Boolean(jobId),
    queryFn: async () => {
      try {
        const raw = await api.get<any>(routes.jobs.results(jobId));
        return normalize(raw);
      } catch (e) {
        if (e instanceof ApiError && [404, 409, 425].includes(e.status))
          return null;
        throw e;
      }
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
