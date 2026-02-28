"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { nanoid } from "nanoid";
import { useAsk } from "@/lib/ask/use-ask";
import { ChatMessageBubble, ChatMessage } from "@/components/ask/chat-message";
import { Button } from "@/components/ui/button";

export default function AskPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const ask = useAsk(jobId);

  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [input, setInput] = React.useState("");
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      id: nanoid(),
      role: "assistant",
      content:
        "Ask me anything about this video. I’ll cite the transcript when possible.",
      createdAt: Date.now(),
    },
  ]);

  const canSend = input.trim().length > 0 && !ask.isPending;

  async function onSend() {
    if (!canSend) return;

    const question = input.trim();
    setInput("");

    const userMsg: ChatMessage = {
      id: nanoid(),
      role: "user",
      content: question,
      createdAt: Date.now(),
    };

    setMessages((m) => [...m, userMsg]);

    try {
      const res = await ask.mutateAsync({
        question,
        session_id: sessionId,
        top_k: 5,
      });

      setSessionId(res.session_id);

      const assistantMsg: ChatMessage = {
        id: nanoid(),
        role: "assistant",
        content: res.answer,
        createdAt: Date.now(),
        citations: res.citations ?? [],
      };

      setMessages((m) => [...m, assistantMsg]);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        {
          id: nanoid(),
          role: "assistant",
          content: e?.message ? `Error: ${e.message}` : "Something went wrong.",
          createdAt: Date.now(),
        },
      ]);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  function onNewChat() {
    setSessionId(null);
    setMessages([
      {
        id: nanoid(),
        role: "assistant",
        content: "New chat started. Ask me anything about this video.",
        createdAt: Date.now(),
      },
    ]);
  }

  return (
    <div className="flex h-[calc(100vh-180px)] flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Ask the video</div>
        <Button variant="secondary" onClick={onNewChat}>
          New chat
        </Button>
      </div>

      <div className="flex-1 space-y-3 overflow-auto rounded-lg border p-4">
        {messages.map((msg) => (
          <ChatMessageBubble key={msg.id} jobId={jobId} msg={msg} />
        ))}
        {ask.isPending ? (
          <div className="text-xs text-muted-foreground">Thinking…</div>
        ) : null}
      </div>

      <div className="rounded-lg border p-3">
        <textarea
          placeholder="Ask a question… (Enter to send, Shift+Enter for newline)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          rows={3}
        />
        <div className="mt-2 flex justify-end">
          <Button onClick={onSend} disabled={!canSend}>
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
