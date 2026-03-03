import { JobTabs } from "@/components/jobs/job-tabs";
import { JobDetailHeader } from "@/components/jobs/job-detail-header";
import * as React from "react";

export default function JobLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { jobId: string };
}) {
  return (
    <div className="space-y-6">
      <JobDetailHeader jobId={params.jobId} />
      <JobTabs />
      {children}
    </div>
  );
}
