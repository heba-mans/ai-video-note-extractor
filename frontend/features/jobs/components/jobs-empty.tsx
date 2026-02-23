import Link from "next/link";
import { Button } from "@/components/ui/button";

export function JobsEmpty() {
  return (
    <div className="rounded-md border p-8 text-center">
      <div className="text-lg font-semibold">No jobs yet</div>
      <div className="mt-2 text-sm text-muted-foreground">
        Paste a YouTube link to generate notes, chapters, and an “Ask the video”
        chat.
      </div>
      <div className="mt-6">
        <Button asChild>
          <Link href="/jobs/new">Create your first job</Link>
        </Button>
      </div>
    </div>
  );
}
