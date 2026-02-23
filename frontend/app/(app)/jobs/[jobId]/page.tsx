type Props = {
  params: Promise<{ jobId: string }>;
};

export default async function JobDetailPage({ params }: Props) {
  const { jobId } = await params;

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Job {jobId}</h1>
      <p className="text-muted-foreground">
        Job detail page will be built in FE-11 (tabs, progress, transcript,
        ask).
      </p>
    </div>
  );
}
