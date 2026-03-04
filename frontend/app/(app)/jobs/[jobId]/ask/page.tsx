"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { nanoid } from "nanoid";
import { PanelLeft } from "lucide-react";
import { toast } from "sonner";

import { useAsk } from "@/lib/ask/use-ask";
import { useChatHistory } from "@/lib/ask/use-chat-history";
import {
  useChatSessions,
  type StoredChatSession,
} from "@/lib/ask/use-chat-sessions";
import {
  readActiveSessionLocalId,
  readMessagesByLocalId,
  writeActiveSessionLocalId,
  writeMessagesByLocalId,
} from "@/lib/ask/chat-local-storage";

import {
  SessionsPanel,
  type AskSessionListItem,
} from "@/components/ask/sessions-panel";
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

function makeAssistant(text: string): ChatMessage {
  return {
    id: nanoid(),
    role: "assistant",
    content: text,
    createdAt: Date.now(),
  };
}

function mapHistoryToChatMessages(
  history: {
    id: string;
    role: "user" | "assistant";
    content: string;
    citations?: unknown[] | null;
    created_at: string;
  }[]
): ChatMessage[] {
  return history.map((m) => ({
    id: String(m.id),
    role: m.role,
    content: m.content,
    createdAt: Number.isFinite(Date.parse(m.created_at))
      ? Date.parse(m.created_at)
      : Date.now(),
    citations: m.citations ?? undefined,
  }));
}

function makeNewLocalSession(): StoredChatSession {
  return {
    local_id: nanoid(),
    title: "New chat",
    session_id: null,
    last_used_at: Date.now(),
  };
}

export default function AskPage() {
  const { jobId } = useParams<{ jobId: string }>();

  const ask = useAsk(jobId);
  const chatSessions = useChatSessions(jobId);

  // Ensure at least one session exists
  React.useEffect(() => {
    chatSessions.ensureAtLeastOne(makeNewLocalSession);
  }, [chatSessions]);

  const sessions = chatSessions.sessions;

  // Restore active session from localStorage (per job)
  const [activeLocalId, setActiveLocalId] = React.useState<string | null>(() =>
    readActiveSessionLocalId(jobId)
  );

  // Restore messages cache from localStorage (per job)
  const [localMessagesByLocalId, setLocalMessagesByLocalId] = React.useState<
    Record<string, ChatMessage[]>
  >(() => readMessagesByLocalId(jobId));

  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [input, setInput] = React.useState("");

  // If active session is missing, default to the first session once loaded
  React.useEffect(() => {
    if (!sessions.length) return;

    setActiveLocalId((prev) => {
      if (prev && sessions.some((s) => s.local_id === prev)) return prev;
      return sessions[0]!.local_id;
    });
  }, [sessions]);

  // Persist active session choice
  React.useEffect(() => {
    if (!activeLocalId) return;
    writeActiveSessionLocalId(jobId, activeLocalId);
  }, [jobId, activeLocalId]);

  // Persist messages (small payloads in dev; still fine for prod MVP)
  React.useEffect(() => {
    writeMessagesByLocalId(jobId, localMessagesByLocalId);
  }, [jobId, localMessagesByLocalId]);

  const activeSession = React.useMemo(() => {
    if (!activeLocalId) return null;
    return sessions.find((s) => s.local_id === activeLocalId) ?? null;
  }, [sessions, activeLocalId]);

  const activeMessages: ChatMessage[] =
    (activeSession && localMessagesByLocalId[activeSession.local_id]) ?? [];

  // Load backend history for synced sessions
  const historyQuery = useChatHistory(jobId, activeSession?.session_id ?? null);

  // When history loads for a synced session, overwrite local cache for that session
  React.useEffect(() => {
    if (!activeSession?.session_id) return;
    if (!historyQuery.data) return;

    const mapped = mapHistoryToChatMessages(historyQuery.data.messages);

    setLocalMessagesByLocalId((prev) => ({
      ...prev,
      [activeSession.local_id]: mapped,
    }));
  }, [activeSession?.session_id, activeSession?.local_id, historyQuery.data]);

  // Seed welcome message ONLY for unsynced sessions (and only if empty)
  React.useEffect(() => {
    if (!activeSession) return;
    if (activeSession.session_id) return;

    const existing = localMessagesByLocalId[activeSession.local_id];
    if (existing && existing.length > 0) return;

    setLocalMessagesByLocalId((prev) => ({
      ...prev,
      [activeSession.local_id]: [
        makeAssistant(
          "Ask me anything about this video. I’ll cite the transcript when possible."
        ),
      ],
    }));
  }, [
    activeSession?.local_id,
    activeSession?.session_id,
    activeSession,
    localMessagesByLocalId,
  ]);

  const canSend =
    Boolean(activeSession) && input.trim().length > 0 && !ask.isPending;

  function onSelectSession(localId: string) {
    setActiveLocalId(localId);
    setMobileOpen(false);
    chatSessions.touchSession(localId);
  }

  function onNewSession() {
    const s = makeNewLocalSession();
    chatSessions.createSession(s);
    setActiveLocalId(s.local_id);
    setMobileOpen(false);
    setInput("");

    setLocalMessagesByLocalId((prev) => ({
      ...prev,
      [s.local_id]: [
        makeAssistant("New chat started. Ask me anything about this video."),
      ],
    }));
  }

  async function onSend() {
    if (!activeSession || !canSend) return;

    const question = input.trim();
    setInput("");

    const userMsg: ChatMessage = {
      id: nanoid(),
      role: "user",
      content: question,
      createdAt: Date.now(),
    };

    setLocalMessagesByLocalId((prev) => ({
      ...prev,
      [activeSession.local_id]: [
        ...(prev[activeSession.local_id] ?? []),
        userMsg,
      ],
    }));

    if (activeSession.title === "New chat") {
      chatSessions.renameSession(activeSession.local_id, question.slice(0, 42));
    }
    chatSessions.touchSession(activeSession.local_id);

    try {
      const res = await ask.mutateAsync({
        question,
        session_id: activeSession.session_id,
        top_k: 5,
      });

      if (!activeSession.session_id) {
        chatSessions.attachBackendSessionId(
          activeSession.local_id,
          res.session_id
        );
      }

      const assistantMsg: ChatMessage = {
        id: nanoid(),
        role: "assistant",
        content: res.answer,
        createdAt: Date.now(),
        citations: res.citations ?? [],
      };

      setLocalMessagesByLocalId((prev) => ({
        ...prev,
        [activeSession.local_id]: [
          ...(prev[activeSession.local_id] ?? []),
          assistantMsg,
        ],
      }));
    } catch (e: unknown) {
      const message =
        e &&
        typeof e === "object" &&
        "message" in e &&
        typeof (e as any).message === "string"
          ? (e as any).message
          : "Something went wrong.";

      setLocalMessagesByLocalId((prev) => ({
        ...prev,
        [activeSession.local_id]: [
          ...(prev[activeSession.local_id] ?? []),
          makeAssistant(`Error: ${message}`),
        ],
      }));
      toast.error("Message failed");
    }
  }

  function onComposerKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  const sessionsForPanel: AskSessionListItem[] = sessions.map((s) => ({
    localId: s.local_id,
    title: s.title,
    hasBackendSession: Boolean(s.session_id),
  }));

  // Scroll to bottom on changes
  const chatRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [activeMessages.length, activeLocalId]);

  const showHistoryLoading =
    Boolean(activeSession?.session_id) &&
    (historyQuery.isLoading || historyQuery.isFetching) &&
    activeMessages.length === 0;

  return (
    <div className="grid h-[calc(100vh-180px)] gap-4 lg:grid-cols-[300px_1fr]">
      <div className="hidden overflow-hidden rounded-lg border lg:block">
        <SessionsPanel
          sessions={sessionsForPanel}
          activeSessionLocalId={activeLocalId ?? ""}
          onSelectSession={onSelectSession}
          onNewSession={onNewSession}
        />
      </div>

      <div className="flex min-h-0 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
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
                    activeSessionLocalId={activeLocalId ?? ""}
                    onSelectSession={onSelectSession}
                    onNewSession={onNewSession}
                    className="h-[calc(100vh-80px)]"
                  />
                </SheetContent>
              </Sheet>
            </div>

            <div className="text-sm font-medium">Ask the video</div>
            {activeSession ? (
              <div className="text-xs text-muted-foreground">
                {activeSession.title}
              </div>
            ) : null}
          </div>

          <Button variant="secondary" size="sm" onClick={onNewSession}>
            New chat
          </Button>
        </div>

        <div
          ref={chatRef}
          className="flex-1 space-y-3 overflow-auto rounded-lg border p-4"
        >
          {!activeSession ? (
            <div className="text-sm text-muted-foreground">
              Loading sessions…
            </div>
          ) : showHistoryLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-4 w-40" />
            </div>
          ) : activeMessages.length === 0 && activeSession.session_id ? (
            <div className="text-sm text-muted-foreground">
              No messages found for this session.
            </div>
          ) : (
            activeMessages.map((msg) => (
              <ChatMessageBubble key={msg.id} jobId={jobId} msg={msg} />
            ))
          )}

          {ask.isPending ? (
            <div className="text-xs text-muted-foreground">Thinking…</div>
          ) : null}
        </div>

        <div className="rounded-lg border p-3">
          <Textarea
            placeholder="Ask a question… (Enter to send, Shift+Enter for newline)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onComposerKeyDown}
            rows={3}
            disabled={!activeSession}
          />

          <div className="mt-2 flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setInput("")}
              disabled={!input.trim() || !activeSession}
            >
              Clear
            </Button>
            <Button onClick={onSend} disabled={!canSend}>
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
