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
    transcript: (jobId: string) => `${API}/jobs/${jobId}/transcript`,
    transcriptSearch: (jobId: string) =>
      `${API}/jobs/${jobId}/transcript/search`,
    exportMarkdown: (jobId: string) => `${API}/jobs/${jobId}/export/markdown`,
    ask: (jobId: string) => `${API}/jobs/${jobId}/ask`,
  },
} as const;
