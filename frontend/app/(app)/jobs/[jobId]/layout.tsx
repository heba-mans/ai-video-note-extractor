import * as React from "react";
import { JobTabs } from "@/components/jobs/job-tabs";
import { JobDetailHeader } from "@/components/jobs/job-detail-header";

export default async function JobLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;

  return (
    <div className="space-y-6">
      <JobDetailHeader jobId={jobId} />
      <JobTabs />
      {children}
    </div>
  );
}
