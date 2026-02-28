"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";

export type TranscriptSegment = {
  idx: number;
  start_ms: number;
  end_ms: number;
  text: string;
};

type TranscriptApiResponse =
  | TranscriptSegment[]
  | {
      items: TranscriptSegment[];
      total?: number;
      limit?: number;
      offset?: number;
    };

function normalizeSegments(res: TranscriptApiResponse): TranscriptSegment[] {
  if (Array.isArray(res)) return res;
  if (res && typeof res === "object" && Array.isArray((res as any).items))
    return (res as any).items;
  return [];
}

export function useTranscript(jobId: string) {
  return useQuery<TranscriptSegment[]>({
    queryKey: ["transcript", jobId],
    enabled: Boolean(jobId),
    queryFn: async () => {
      const res = await api.get<TranscriptApiResponse>(
        routes.jobs.transcript(jobId)
      );
      return normalizeSegments(res);
    },
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
