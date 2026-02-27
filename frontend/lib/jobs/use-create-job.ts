"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import { qk } from "@/lib/query/keys";

type CreateJobInput = {
  youtube_url: string;
};

type CreateJobResponse = {
  id: string;
  status: string;
  created_at?: string;
  youtube_url?: string;
  title?: string | null;
};

export function useCreateJob() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateJobInput) => {
      // backend expects youtube_url based on your model naming
      return api.post<CreateJobResponse>(routes.jobs.create(), input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.jobs.list() });
    },
  });
}
