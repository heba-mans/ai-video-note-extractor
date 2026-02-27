import { JobTabs } from "@/components/jobs/job-tabs";
import * as React from "react";

export default function JobLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <JobTabs />
      {children}
    </div>
  );
}
