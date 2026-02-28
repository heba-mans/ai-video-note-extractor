"use client";

import { cn } from "@/lib/utils";
import { CitationChips } from "./citation-chips";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  citations?: any[];
};

export function ChatMessageBubble({
  jobId,
  msg,
}: {
  jobId: string;
  msg: ChatMessage;
}) {
  const isUser = msg.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[720px] rounded-2xl border px-4 py-3 text-sm leading-6",
          isUser ? "bg-primary text-primary-foreground" : "bg-background"
        )}
      >
        <div className="whitespace-pre-wrap">{msg.content}</div>
        {!isUser && msg.citations?.length ? (
          <CitationChips jobId={jobId} citations={msg.citations} />
        ) : null}
      </div>
    </div>
  );
}
