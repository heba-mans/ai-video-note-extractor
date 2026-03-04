"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import { qk } from "@/lib/query/keys";

export type ChatHistoryMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: unknown[] | null;
  created_at: string; // ISO
};

export type ChatHistoryResponse = {
  job_id: string;
  session_id: string;
  messages: ChatHistoryMessage[];
};

export function useChatHistory(jobId: string, sessionId: string | null) {
  return useQuery<ChatHistoryResponse>({
    queryKey: sessionId ? qk.jobs.chatHistory(jobId, sessionId) : ["noop"],
    enabled: Boolean(jobId) && Boolean(sessionId),
    queryFn: async () => {
      if (!sessionId) throw new Error("Missing sessionId");
      return api.get<ChatHistoryResponse>(
        routes.jobs.chatHistory(jobId, sessionId)
      );
    },
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
