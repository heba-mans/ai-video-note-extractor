"use client";

import { Button } from "@/components/ui/button";
import { PanelLeft } from "lucide-react";
import dynamic from "next/dynamic";

const UserMenu = dynamic(() => import("@/components/layout/user-menu"), {
  ssr: false,
});

type TopbarProps = {
  onOpenSidebar?: () => void;
  title?: string;
};

export function Topbar({ onOpenSidebar, title = "Jobs" }: TopbarProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b px-4">
      <div className="flex items-center gap-2">
        {onOpenSidebar ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenSidebar}
            aria-label="Open menu"
          >
            <PanelLeft className="h-5 w-5" />
          </Button>
        ) : null}
        <div className="text-sm font-medium">{title}</div>
      </div>

      <div className="flex items-center gap-2">
        <UserMenu />
      </div>
    </header>
  );
}
