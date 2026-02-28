const API = "/api";

export const routes = {
  auth: {
    register: () => `${API}/auth/register`,
    login: () => `${API}/auth/login`,
    me: () => `${API}/auth/me`,
    logout: () => `${API}/auth/logout`,
  },
  jobs: {
    list: () => `${API}/jobs`,
    create: () => `${API}/jobs`,
    byId: (jobId: string) => `${API}/jobs/${jobId}`,
    progress: (jobId: string) => `${API}/jobs/${jobId}/progress`,
    results: (jobId: string) => `${API}/jobs/${jobId}/results`,
    transcript: (jobId: string) => `/api/jobs/${jobId}/transcript`,
    transcriptSearch: (jobId: string) => `/api/jobs/${jobId}/transcript/search`,
    exportMarkdown: (jobId: string) => `${API}/jobs/${jobId}/export/markdown`,
    ask: (jobId: string) => `/api/jobs/${jobId}/ask`,
    chatHistory: (jobId: string, sessionId: string) =>
      `/api/jobs/${jobId}/chat/${sessionId}`,
  },
} as const;
