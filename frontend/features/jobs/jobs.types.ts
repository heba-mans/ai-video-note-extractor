export type JobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "canceled"
  | "unknown";

export type Job = {
  id: string;
  youtube_url: string;
  title?: string | null;
  status: JobStatus | string;
  created_at?: string;
  updated_at?: string;
};

export type JobsListResponse =
  | { items: Job[]; total?: number } // if you return paginated shape
  | Job[]; // if you return raw array
