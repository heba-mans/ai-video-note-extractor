"use client";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function CopyButton({ text }: { text: string }) {
  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Copy failed");
    }
  }

  return (
    <Button variant="secondary" size="sm" onClick={onCopy}>
      Copy
    </Button>
  );
}
