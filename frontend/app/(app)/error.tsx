"use client";

import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl space-y-4 p-6">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">
        {error.message || "An unexpected error occurred."}
      </p>

      <div className="flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="secondary" onClick={() => location.reload()}>
          Reload
        </Button>
      </div>

      {error.digest ? (
        <p className="text-xs text-muted-foreground">
          Error ID: {error.digest}
        </p>
      ) : null}
    </div>
  );
}
