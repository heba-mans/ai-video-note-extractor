"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto max-w-2xl p-6">
          <ErrorState
            title="Something went wrong"
            description={error.message || "An unexpected error occurred."}
            onRetry={reset}
            backHref="/"
          />
          {error.digest ? (
            <div className="mt-3 text-xs text-muted-foreground">
              Error ID: {error.digest}
            </div>
          ) : null}

          <div className="mt-4">
            <Button asChild variant="secondary">
              <Link href="/">Go home</Link>
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
