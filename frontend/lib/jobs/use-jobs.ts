"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import { qk } from "@/lib/query/keys";

export type Job = {
  id: string;
  status: string;
  created_at?: string;
  youtube_url?: string;
  title?: string | null;
};

type JobsApiResponse =
  | Job[]
  | {
      items: Job[];
      total?: number;
      limit?: number;
      offset?: number;
    };

function normalizeJobs(data: JobsApiResponse): Job[] {
  if (Array.isArray(data)) return data;

  if (data && typeof data === "object") {
    const items = (data as any).items;
    if (Array.isArray(items)) return items as Job[];
  }

  return [];
}

export function useJobs() {
  return useQuery<Job[]>({
    queryKey: qk.jobs.list(),
    queryFn: async () => {
      const res = await api.get<JobsApiResponse>(routes.jobs.list());
      return normalizeJobs(res);
    },
    staleTime: 1000 * 15,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
