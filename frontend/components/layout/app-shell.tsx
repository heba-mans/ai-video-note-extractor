"use client";

import * as React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="flex h-dvh w-full">
      {/* Desktop sidebar */}
      <div className="hidden w-72 border-r lg:block">
        <Sidebar />
      </div>

      {/* Mobile sidebar */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <Sidebar />
        </SheetContent>

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            onOpenSidebar={() => setOpen(true)}
            title="AI Video Note Extractor"
          />
          <main className="min-w-0 flex-1 overflow-auto p-6">{children}</main>
        </div>
      </Sheet>
    </div>
  );
}
