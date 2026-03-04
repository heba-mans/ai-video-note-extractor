"use client";

import type { ChatMessage } from "@/components/ask/chat-message";

const SESSIONS_ACTIVE_PREFIX = "aiv:chat_active_session:v1:";
const MESSAGES_PREFIX = "aiv:chat_messages:v1:";

function activeKey(jobId: string) {
  return `${SESSIONS_ACTIVE_PREFIX}${jobId}`;
}

function messagesKey(jobId: string) {
  return `${MESSAGES_PREFIX}${jobId}`;
}

function safeParse(json: string): unknown {
  try {
    return JSON.parse(json) as unknown;
  } catch {
    return null;
  }
}

function isChatMessage(x: unknown): x is ChatMessage {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    (o.role === "user" || o.role === "assistant") &&
    typeof o.content === "string" &&
    typeof o.createdAt === "number"
  );
}

export function readActiveSessionLocalId(jobId: string): string | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(activeKey(jobId));
  return v && v.trim() ? v : null;
}

export function writeActiveSessionLocalId(jobId: string, localId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(activeKey(jobId), localId);
}

export function readMessagesByLocalId(
  jobId: string
): Record<string, ChatMessage[]> {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(messagesKey(jobId));
  if (!raw) return {};
  const parsed = safeParse(raw);
  if (!parsed || typeof parsed !== "object") return {};

  const obj = parsed as Record<string, unknown>;
  const out: Record<string, ChatMessage[]> = {};

  for (const [localId, value] of Object.entries(obj)) {
    if (!Array.isArray(value)) continue;
    const msgs = value.filter(isChatMessage);
    if (msgs.length) out[localId] = msgs;
  }

  return out;
}

export function writeMessagesByLocalId(
  jobId: string,
  map: Record<string, ChatMessage[]>
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(messagesKey(jobId), JSON.stringify(map));
}
