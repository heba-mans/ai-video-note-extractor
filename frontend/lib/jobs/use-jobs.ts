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
  if (data && typeof data === "object" && Array.isArray((data as any).items)) {
    return (data as any).items as Job[];
  }
  return [];
}

export function useJobs() {
  return useQuery<Job[]>({
    queryKey: ["jobs"],
    queryFn: async () => {
      const res = await api.get<JobsApiResponse>(routes.jobs.list());
      return normalizeJobs(res);
    },
    staleTime: 1000 * 15,
    refetchOnWindowFocus: false,
  });
}
