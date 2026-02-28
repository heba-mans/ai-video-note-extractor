"use client";

import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";

export type AskRequest = {
  question: string;
  session_id?: string | null;
  top_k?: number;
};

export type Citation = {
  idx?: number;
  start_ts?: number;
  end_ts?: number;
  range_ts?: string;
  label?: string;
};

export type AskResponse = {
  session_id: string;
  answer: string;
  citations?: Citation[];
};

export function useAsk(jobId: string) {
  return useMutation({
    mutationFn: async (payload: AskRequest) => {
      return api.post<AskResponse>(routes.jobs.ask(jobId), payload);
    },
  });
}
