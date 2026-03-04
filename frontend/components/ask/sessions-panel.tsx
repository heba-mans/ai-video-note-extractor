"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MessageSquare, Plus } from "lucide-react";

export type AskLocalSession = {
  id: string; // local id (not backend session_id)
  title: string;
};

export function SessionsPanel({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  className,
}: {
  sessions: AskLocalSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="flex items-center justify-between gap-2 border-b px-3 py-3">
        <div className="text-sm font-medium">Chats</div>
        <Button size="sm" onClick={onNewSession}>
          <Plus className="mr-2 h-4 w-4" />
          New
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-2">
        {sessions.length === 0 ? (
          <div className="rounded-lg border p-3 text-sm text-muted-foreground">
            No chats yet.
          </div>
        ) : (
          <div className="space-y-1">
            {sessions.map((s) => {
              const active = s.id === activeSessionId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelectSession(s.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                    active
                      ? "bg-accent text-foreground"
                      : "hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <span className="truncate">{s.title}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t p-3 text-xs text-muted-foreground">
        Sessions are local for now. FE-19 will load/save sessions from the API.
      </div>
    </div>
  );
}
