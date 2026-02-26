export const qk = {
  auth: {
    me: () => ["auth", "me"] as const,
  },
  jobs: {
    list: () => ["jobs", "list"] as const,
  },
} as const;
