const API_V1 = "/api/v1";

export const routes = {
  auth: {
    register: () => `${API_V1}/auth/register`,
    login: () => `${API_V1}/auth/login`,
    me: () => `${API_V1}/auth/me`,
    logout: () => `${API_V1}/auth/logout`,
  },
  jobs: {
    list: () => `${API_V1}/jobs`,
    create: () => `${API_V1}/jobs`,
    byId: (jobId: string) => `${API_V1}/jobs/${jobId}`,
    progress: (jobId: string) => `${API_V1}/jobs/${jobId}/progress`,
    results: (jobId: string) => `${API_V1}/jobs/${jobId}/results`,
    transcript: (jobId: string) => `${API_V1}/jobs/${jobId}/transcript`,
    transcriptSearch: (jobId: string) =>
      `${API_V1}/jobs/${jobId}/transcript/search`,
    exportMarkdown: (jobId: string) =>
      `${API_V1}/jobs/${jobId}/export/markdown`,
    ask: (jobId: string) => `${API_V1}/jobs/${jobId}/ask`,
    chatHistory: (jobId: string, sessionId: string) =>
      `${API_V1}/jobs/${jobId}/chat/${sessionId}`,
  },
} as const;
