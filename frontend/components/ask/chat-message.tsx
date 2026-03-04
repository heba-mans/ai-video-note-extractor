"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { CitationChips } from "./citation-chips";
import { Button } from "@/components/ui/button";
import type { Citation } from "./citation-chips";

export type ChatMessageStatus = "loading" | "error";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;

  // ✅ Fix: match CitationChips
  citations?: Citation[];

  // FE-20 additions
  status?: ChatMessageStatus;
  errorText?: string;
  retryPayload?: {
    question: string;
  };
};

export function ChatMessageBubble({
  jobId,
  msg,
  onRetry,
}: {
  jobId: string;
  msg: ChatMessage;
  onRetry?: (payload: { question: string }) => void;
}) {
  const isUser = msg.role === "user";
  const isLoading = msg.status === "loading";
  const isError = msg.status === "error";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[720px] rounded-2xl border px-4 py-3 text-sm leading-6",
          isUser ? "bg-primary text-primary-foreground" : "bg-background",
          isError ? "border-destructive/40" : "",
          isLoading ? "opacity-90" : ""
        )}
      >
        <div className="whitespace-pre-wrap">
          {isLoading ? "Thinking…" : msg.content}
        </div>

        {!isUser && isError ? (
          <div className="mt-3 flex items-center gap-2">
            <div className="text-xs text-destructive">
              {msg.errorText ?? "Something went wrong."}
            </div>
            {msg.retryPayload && onRetry ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onRetry(msg.retryPayload!)}
              >
                Retry
              </Button>
            ) : null}
          </div>
        ) : null}

        {!isUser && !isLoading && msg.citations && msg.citations.length > 0 ? (
          <div className="mt-3">
            <CitationChips jobId={jobId} citations={msg.citations} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
