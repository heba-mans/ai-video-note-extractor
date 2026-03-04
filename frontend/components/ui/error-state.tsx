import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function ErrorState({
  title = "Something went wrong",
  description = "Please try again.",
  onRetry,
  backHref,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  backHref?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border p-6", className)}>
      <div className="space-y-2">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {onRetry ? (
          <Button onClick={onRetry}>Try again</Button>
        ) : (
          <Button onClick={() => location.reload()}>Reload</Button>
        )}

        {backHref ? (
          <Button asChild variant="secondary">
            <Link href={backHref}>Go back</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
