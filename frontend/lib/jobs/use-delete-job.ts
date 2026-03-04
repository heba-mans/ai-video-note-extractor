"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import { qk } from "@/lib/query/keys";

export function useDeleteJob(jobId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return api.post(routes.jobs.delete(jobId), {});
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: qk.jobs.list() }),
        qc.removeQueries({ queryKey: qk.jobs.byId(jobId) }),
        qc.removeQueries({ queryKey: qk.jobs.progress(jobId) }),
        qc.removeQueries({ queryKey: qk.jobs.results(jobId) }),
        qc.removeQueries({ queryKey: qk.jobs.transcript(jobId) }),
      ]);
    },
  });
}
