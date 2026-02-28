"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";

export type TranscriptSearchHit = {
  idx: number;
  start_ms: number;
  end_ms: number;
  text: string;
};

type SearchApiResponse =
  | TranscriptSearchHit[]
  | {
      items: TranscriptSearchHit[];
      total?: number;
      limit?: number;
      offset?: number;
    };

function normalizeHits(res: SearchApiResponse): TranscriptSearchHit[] {
  if (Array.isArray(res)) return res;
  if (res && typeof res === "object" && Array.isArray((res as any).items))
    return (res as any).items;
  return [];
}

export function useTranscriptSearch(jobId: string, q: string) {
  return useQuery<TranscriptSearchHit[]>({
    queryKey: ["transcript-search", jobId, q],
    enabled: Boolean(jobId) && q.trim().length >= 2,
    queryFn: async () => {
      const url = `${routes.jobs.transcriptSearch(
        jobId
      )}?q=${encodeURIComponent(q)}&limit=50&offset=0`;
      const res = await api.get<SearchApiResponse>(url);
      return normalizeHits(res);
    },
    staleTime: 5_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
