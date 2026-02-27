"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { key: "overview", label: "Overview", href: (id: string) => `/jobs/${id}` },
  {
    key: "results",
    label: "Results",
    href: (id: string) => `/jobs/${id}/results`,
  },
  {
    key: "transcript",
    label: "Transcript",
    href: (id: string) => `/jobs/${id}/transcript`,
  },
  { key: "ask", label: "Ask", href: (id: string) => `/jobs/${id}/ask` },
  {
    key: "export",
    label: "Export",
    href: (id: string) => `/jobs/${id}/export`,
  },
] as const;

export function JobTabs() {
  const params = useParams<{ jobId: string }>();
  const pathname = usePathname();
  const jobId = params.jobId;

  return (
    <div className="flex flex-wrap gap-2 border-b pb-2">
      {tabs.map((t) => {
        const href = t.href(jobId);
        const active =
          t.key === "overview" ? pathname === href : pathname.startsWith(href);

        return (
          <Link
            key={t.key}
            href={href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition",
              active
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
