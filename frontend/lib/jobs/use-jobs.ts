"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import { qk } from "@/lib/query/keys";

export type Job = {
  id: string;
  status: string;
  created_at?: string;
  youtube_url?: string | null;
  title?: string | null;
};

type JobListResponse = {
  items: Job[];
  total: number;
};

export function useJobs() {
  return useQuery<Job[]>({
    queryKey: qk.jobs.list(),
    queryFn: async () => {
      const res = await api.get<JobListResponse>(routes.jobs.list());
      return Array.isArray(res.items) ? res.items : [];
    },
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
