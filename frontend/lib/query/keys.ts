export const qk = {
  auth: {
    me: () => ["auth", "me"] as const,
  },
  jobs: {
    list: () => ["jobs", "list"] as const,
    byId: (jobId: string) => ["jobs", "byId", jobId] as const,
    progress: (jobId: string) => ["jobs", "progress", jobId] as const,
    results: (jobId: string) => ["jobs", "results", jobId] as const,
    transcript: (jobId: string) => ["jobs", "transcript", jobId] as const,
  },
} as const;
