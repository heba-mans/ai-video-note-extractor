"use client";

import * as React from "react";

export type StoredChatSession = {
  local_id: string; // local stable id
  title: string;
  session_id: string | null; // backend session uuid once available
  last_used_at: number; // for sorting
};

const STORAGE_PREFIX = "aiv:chat_sessions:v1:";

function storageKey(jobId: string) {
  return `${STORAGE_PREFIX}${jobId}`;
}

function safeParse(json: string): unknown {
  try {
    return JSON.parse(json) as unknown;
  } catch {
    return null;
  }
}

function isStoredSession(x: unknown): x is StoredChatSession {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;

  const localIdOk = typeof o.local_id === "string";
  const titleOk = typeof o.title === "string";
  const sessionOk = typeof o.session_id === "string" || o.session_id === null;
  const lastUsedOk = typeof o.last_used_at === "number";

  return localIdOk && titleOk && sessionOk && lastUsedOk;
}

function readSessions(jobId: string): StoredChatSession[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(storageKey(jobId));
  if (!raw) return [];
  const parsed = safeParse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(isStoredSession);
}

function writeSessions(jobId: string, sessions: StoredChatSession[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(jobId), JSON.stringify(sessions));
}

export function useChatSessions(jobId: string) {
  const [sessions, setSessions] = React.useState<StoredChatSession[]>([]);
  const hydratedRef = React.useRef(false);

  // Load from storage once per jobId
  React.useEffect(() => {
    if (!jobId) return;

    const loaded = readSessions(jobId).sort(
      (a, b) => b.last_used_at - a.last_used_at
    );

    hydratedRef.current = true;
    setSessions(loaded);
  }, [jobId]);

  // Only persist after hydration
  React.useEffect(() => {
    if (!jobId) return;
    if (!hydratedRef.current) return;
    writeSessions(jobId, sessions);
  }, [jobId, sessions]);

  const ensureAtLeastOne = React.useCallback(
    (create: () => StoredChatSession) => {
      setSessions((prev) => {
        if (prev.length > 0) return prev;
        return [create()];
      });
    },
    []
  );

  const createSession = React.useCallback((newSession: StoredChatSession) => {
    setSessions((prev) => [newSession, ...prev]);
  }, []);

  const touchSession = React.useCallback((localId: string) => {
    setSessions((prev) =>
      prev
        .map((s) =>
          s.local_id === localId ? { ...s, last_used_at: Date.now() } : s
        )
        .sort((a, b) => b.last_used_at - a.last_used_at)
    );
  }, []);

  const renameSession = React.useCallback((localId: string, title: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.local_id === localId ? { ...s, title } : s))
    );
  }, []);

  const attachBackendSessionId = React.useCallback(
    (localId: string, sessionId: string) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.local_id === localId ? { ...s, session_id: sessionId } : s
        )
      );
    },
    []
  );

  return {
    sessions,
    ensureAtLeastOne,
    createSession,
    touchSession,
    renameSession,
    attachBackendSessionId,
  };
}
