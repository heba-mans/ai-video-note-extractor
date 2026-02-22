"use client";

import * as React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen overflow-hidden">
        {/* Desktop sidebar */}
        <div className="hidden w-64 flex-shrink-0 border-r md:block">
          <Sidebar />
        </div>

        {/* Mobile sidebar (sheet) */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            {/* Trigger lives in Topbar; we control via state */}
            <div className="hidden" />
          </SheetTrigger>

          <SheetContent side="left" className="w-72 p-0">
            <Sidebar />
          </SheetContent>

          {/* Main */}
          <div className="flex flex-1 flex-col">
            <Topbar
              onOpenSidebar={() => setOpen(true)}
              title="AI Video Note Extractor"
            />
            <main className="flex-1 overflow-auto p-6">{children}</main>
          </div>
        </Sheet>
      </div>
    </div>
  );
}
