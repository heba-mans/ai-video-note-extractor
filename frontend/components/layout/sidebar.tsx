import { NavItem } from "@/components/layout/nav-item";
import { Separator } from "@/components/ui/separator";
import { Plus, List } from "lucide-react";
import Link from "next/link";

export function Sidebar() {
  return (
    <aside className="flex h-full flex-col">
      <div className="px-4 py-4">
        <Link href="/jobs" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-primary" />
          <div className="leading-tight">
            <div className="text-sm font-semibold">AI Video Note Extractor</div>
            <div className="text-xs text-muted-foreground">SaaS</div>
          </div>
        </Link>
      </div>

      <Separator />

      <div className="flex-1 space-y-1 px-2 py-3">
        <NavItem
          href="/jobs"
          label="Jobs"
          icon={<List className="h-4 w-4" />}
        />
      </div>

      <div className="px-2 pb-3">
        <Link
          href="/jobs/new"
          className="flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          New job
        </Link>
      </div>

      <Separator />

      <div className="px-4 py-3 text-xs text-muted-foreground">
        <div>v0.1</div>
      </div>
    </aside>
  );
}
