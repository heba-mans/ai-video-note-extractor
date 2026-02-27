"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";

export type Job = {
  id: string;
  status: string;
  created_at?: string;
  youtube_url?: string;
  title?: string | null;
};

export function useJob(jobId: string) {
  return useQuery<Job>({
    queryKey: ["jobs", "byId", jobId],
    queryFn: async () => api.get<Job>(routes.jobs.byId(jobId)),
    enabled: Boolean(jobId),
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });
}
