import { api } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import type { JobsListResponse, Job } from "./jobs.types";

function normalizeJobsResponse(data: JobsListResponse): Job[] {
  if (Array.isArray(data)) return data;
  if (
    data &&
    typeof data === "object" &&
    "items" in data &&
    Array.isArray((data as any).items)
  ) {
    return (data as any).items as Job[];
  }
  return [];
}

export async function fetchJobs(): Promise<Job[]> {
  const data = await api.get<JobsListResponse>(routes.jobs.list());
  return normalizeJobsResponse(data);
}

export type CreateJobRequest = {
  youtube_url: string;
};

export type CreateJobResponse = {
  id: string;
  status: string;
};

export async function createJob(payload: CreateJobRequest) {
  return api.post<CreateJobResponse>(routes.jobs.create(), payload);
}
