import { Button } from "@/components/ui/button";

export function JobsError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-md border p-6">
      <div className="font-semibold">Couldn’t load jobs</div>
      <div className="mt-1 text-sm text-muted-foreground">
        Please try again.
      </div>
      <div className="mt-4">
        <Button onClick={onRetry}>Retry</Button>
      </div>
    </div>
  );
}
