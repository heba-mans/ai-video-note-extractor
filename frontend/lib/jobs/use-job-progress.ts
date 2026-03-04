"use client";

import { useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import { qk } from "@/lib/query/keys";

export type JobProgress = {
  status: string;
  progress?: number; // backend seems to use 0..100 (but we still support 0..1)
  percent?: number; // optional
  stage?: string | null;
  message?: string | null;
  updated_at?: string;
};

type JobProgressApiResponse =
  | JobProgress
  | {
      items: JobProgress[];
      total?: number;
      limit?: number;
      offset?: number;
    };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalizePercent(p: JobProgress): number | undefined {
  if (typeof p.percent === "number") return clamp(p.percent, 0, 100);
  if (typeof p.progress === "number") {
    if (p.progress <= 1) return clamp(p.progress * 100, 0, 100);
    return clamp(p.progress, 0, 100);
  }
  return undefined;
}

function normalizeProgress(
  data: JobProgressApiResponse | undefined
): JobProgress | undefined {
  if (!data) return undefined;

  if (typeof data === "object" && data !== null && "items" in data) {
    const first = (data as any).items?.[0] as JobProgress | undefined;
    return first;
  }

  return data as JobProgress;
}

function isTerminal(status: string) {
  const s = (status ?? "").toLowerCase();
  return [
    "completed",
    "complete",
    "succeeded",
    "success",
    "failed",
    "error",
    "cancelled",
    "canceled",
  ].includes(s);
}

function computeIntervalMs(p?: JobProgress) {
  if (!p) return 1500;
  if (isTerminal(p.status)) return false;

  const s = (p.status ?? "").toLowerCase();
  if (s === "queued") return 1200;

  // common “active” states
  if (["processing", "running", "downloading", "transcribing"].includes(s))
    return 1500;

  return 2000;
}

export function useJobProgress(jobId: string) {
  const qc = useQueryClient();
  const lastTerminalStatusRef = useRef<string | null>(null);

  const query = useQuery<JobProgressApiResponse>({
    queryKey: qk.jobs.progress(jobId),
    enabled: Boolean(jobId),
    queryFn: async () =>
      api.get<JobProgressApiResponse>(routes.jobs.progress(jobId)),
    refetchInterval: (q) => computeIntervalMs(normalizeProgress(q.state.data)),
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime: 0,
  });

  const normalized = useMemo(() => {
    const p = normalizeProgress(query.data);
    if (!p) return undefined;
    return { ...p, percent: normalizePercent(p) };
  }, [query.data]);

  useEffect(() => {
    const status = normalized?.status;
    if (!status) return;

    const terminal = isTerminal(status);
    if (!terminal) {
      lastTerminalStatusRef.current = null;
      return;
    }

    // Prevent repeated invalidations if the component re-renders while terminal.
    if (lastTerminalStatusRef.current === status) return;
    lastTerminalStatusRef.current = status;

    qc.invalidateQueries({ queryKey: qk.jobs.byId(jobId) });
    qc.invalidateQueries({ queryKey: qk.jobs.list() });

    // These become available (or finalized) once terminal.
    qc.invalidateQueries({ queryKey: qk.jobs.results(jobId) });
    qc.invalidateQueries({ queryKey: qk.jobs.transcript(jobId) });
  }, [normalized?.status, jobId, qc]);

  return {
    ...query,
    data: normalized,
  };
}

export const jobProgressUtils = { isTerminal };
