"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MessageSquare, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type AskSessionListItem = {
  localId: string;
  title: string;
  hasBackendSession: boolean;
};

export function SessionsPanel({
  sessions,
  activeSessionLocalId,
  onSelectSession,
  onNewSession,
  className,
}: {
  sessions: AskSessionListItem[];
  activeSessionLocalId: string;
  onSelectSession: (localId: string) => void;
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
              const active = s.localId === activeSessionLocalId;
              return (
                <button
                  key={s.localId}
                  type="button"
                  onClick={() => onSelectSession(s.localId)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                    active
                      ? "bg-accent text-foreground"
                      : "hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <MessageSquare className="h-4 w-4 shrink-0" />
                    <span className="truncate">{s.title}</span>
                  </span>

                  {s.hasBackendSession ? (
                    <Badge variant="outline" className="shrink-0">
                      synced
                    </Badge>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t p-3 text-xs text-muted-foreground">
        Sessions are stored locally; messages load from the API when a session
        is synced.
      </div>
    </div>
  );
}
