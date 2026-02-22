import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">AI Video Note Extractor</h1>
        <ThemeToggle />
      </div>

      <div className="mt-8 space-y-4">
        <p className="text-muted-foreground">
          FE-02 complete: Tailwind + shadcn + dark mode.
        </p>
        <Button>Continue</Button>
      </div>
    </main>
  );
}
