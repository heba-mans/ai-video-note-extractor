"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { nanoid } from "nanoid";
import { useAsk } from "@/lib/ask/use-ask";
import {
  ChatMessageBubble,
  type ChatMessage,
} from "@/components/ask/chat-message";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  SessionsPanel,
  type AskLocalSession,
} from "@/components/ask/sessions-panel";
import { PanelLeft } from "lucide-react";

type SessionState = {
  localId: string; // UI session id
  title: string;
  backendSessionId: string | null;
  messages: ChatMessage[];
};

function makeInitialAssistantMessage(text: string): ChatMessage {
  return {
    id: nanoid(),
    role: "assistant",
    content: text,
    createdAt: Date.now(),
  };
}

export default function AskPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const ask = useAsk(jobId);

  const [input, setInput] = React.useState("");

  // Local sessions (FE-19 will replace with API-backed sessions)
  const [sessions, setSessions] = React.useState<SessionState[]>(() => {
    const firstId = nanoid();
    return [
      {
        localId: firstId,
        title: "New chat",
        backendSessionId: null,
        messages: [
          makeInitialAssistantMessage(
            "Ask me anything about this video. I’ll cite the transcript when possible."
          ),
        ],
      },
    ];
  });

  const [activeLocalId, setActiveLocalId] = React.useState<string>(
    () => sessions[0]!.localId
  );
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const activeSession = React.useMemo(() => {
    return sessions.find((s) => s.localId === activeLocalId) ?? sessions[0]!;
  }, [sessions, activeLocalId]);

  const canSend = input.trim().length > 0 && !ask.isPending;

  function setActiveSessionById(id: string) {
    setActiveLocalId(id);
    setMobileOpen(false);
  }

  function onNewSession() {
    const id = nanoid();
    const next: SessionState = {
      localId: id,
      title: "New chat",
      backendSessionId: null,
      messages: [
        makeInitialAssistantMessage(
          "New chat started. Ask me anything about this video."
        ),
      ],
    };
    setSessions((prev) => [next, ...prev]);
    setActiveLocalId(id);
    setMobileOpen(false);
    setInput("");
  }

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

    // Add user message to active session
    setSessions((prev) =>
      prev.map((s) =>
        s.localId === activeSession.localId
          ? {
              ...s,
              messages: [...s.messages, userMsg],
              title: s.title === "New chat" ? question.slice(0, 32) : s.title,
            }
          : s
      )
    );

    try {
      const res = await ask.mutateAsync({
        question,
        session_id: activeSession.backendSessionId,
        top_k: 5,
      });

      const assistantMsg: ChatMessage = {
        id: nanoid(),
        role: "assistant",
        content: res.answer,
        createdAt: Date.now(),
        citations: res.citations ?? [],
      };

      // Apply backend session_id + assistant message
      setSessions((prev) =>
        prev.map((s) =>
          s.localId === activeSession.localId
            ? {
                ...s,
                backendSessionId: res.session_id,
                messages: [...s.messages, assistantMsg],
              }
            : s
        )
      );
    } catch (e: unknown) {
      const message =
        e &&
        typeof e === "object" &&
        "message" in e &&
        typeof (e as any).message === "string"
          ? (e as any).message
          : "Something went wrong.";

      setSessions((prev) =>
        prev.map((s) =>
          s.localId === activeSession.localId
            ? {
                ...s,
                messages: [
                  ...s.messages,
                  makeInitialAssistantMessage(`Error: ${message}`),
                ],
              }
            : s
        )
      );
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  const sessionsForPanel: AskLocalSession[] = sessions.map((s) => ({
    id: s.localId,
    title: s.title,
  }));

  // Scroll chat to bottom as messages arrive (simple + reliable)
  const chatRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [activeSession.messages.length]);

  return (
    <div className="grid h-[calc(100vh-180px)] gap-4 lg:grid-cols-[300px_1fr]">
      {/* Desktop sessions panel */}
      <div className="hidden overflow-hidden rounded-lg border lg:block">
        <SessionsPanel
          sessions={sessionsForPanel}
          activeSessionId={activeLocalId}
          onSelectSession={setActiveSessionById}
          onNewSession={onNewSession}
        />
      </div>

      {/* Main chat column */}
      <div className="flex min-h-0 flex-col gap-3">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {/* Mobile sessions */}
            <div className="lg:hidden">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="secondary" size="sm">
                    <PanelLeft className="mr-2 h-4 w-4" />
                    Chats
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[320px] p-0">
                  <SheetHeader className="px-3 py-3">
                    <SheetTitle>Chats</SheetTitle>
                  </SheetHeader>
                  <SessionsPanel
                    sessions={sessionsForPanel}
                    activeSessionId={activeLocalId}
                    onSelectSession={setActiveSessionById}
                    onNewSession={onNewSession}
                    className="h-[calc(100vh-80px)]"
                  />
                </SheetContent>
              </Sheet>
            </div>

            <div className="text-sm font-medium">Ask the video</div>
            <div className="text-xs text-muted-foreground">
              {activeSession.title}
            </div>
          </div>

          <Button variant="secondary" size="sm" onClick={onNewSession}>
            New chat
          </Button>
        </div>

        {/* Chat thread */}
        <div
          ref={chatRef}
          className="flex-1 space-y-3 overflow-auto rounded-lg border p-4"
        >
          {activeSession.messages.map((msg) => (
            <ChatMessageBubble key={msg.id} jobId={jobId} msg={msg} />
          ))}

          {ask.isPending ? (
            <div className="text-xs text-muted-foreground">Thinking…</div>
          ) : null}
        </div>

        {/* Composer */}
        <div className="rounded-lg border p-3">
          <Textarea
            placeholder="Ask a question… (Enter to send, Shift+Enter for newline)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={3}
          />

          <div className="mt-2 flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setInput("")}
              disabled={!input.trim()}
            >
              Clear
            </Button>
            <Button onClick={onSend} disabled={!canSend}>
              Send
            </Button>
          </div>

          {ask.isPending ? (
            <div className="mt-2">
              <Skeleton className="h-4 w-36" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
