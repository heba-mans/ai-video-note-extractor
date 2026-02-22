export const routes = {
  auth: {
    register: () => "/auth/register",
    login: () => "/auth/login",
  },
  jobs: {
    list: () => "/jobs",
    create: () => "/jobs",
    byId: (jobId: string) => `/jobs/${jobId}`,
    progress: (jobId: string) => `/jobs/${jobId}/progress`,
    results: (jobId: string) => `/jobs/${jobId}/results`,
    transcript: (jobId: string) => `/jobs/${jobId}/transcript`,
    transcriptSearch: (jobId: string) => `/jobs/${jobId}/transcript/search`,
    exportMarkdown: (jobId: string) => `/jobs/${jobId}/export/markdown`,
    ask: (jobId: string) => `/jobs/${jobId}/ask`,
    chatHistory: (jobId: string, sessionId: string) =>
      `/jobs/${jobId}/chat/${sessionId}`,
  },
} as const;
