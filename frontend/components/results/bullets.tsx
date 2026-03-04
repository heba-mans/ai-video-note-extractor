"use client";

import { SectionCard } from "./section-card";
import { CopyButton } from "./copy-button";

function toMarkdown(title: string, items: string[]) {
  const lines = [`## ${title}`, ""];
  for (const it of items) lines.push(`- ${it}`);
  lines.push("");
  return lines.join("\n");
}

export function BulletsSection({
  title,
  items,
  description,
  emptyMessage,
  enableCopy = true,
}: {
  title: string;
  items: string[];
  description?: string;
  emptyMessage?: string;
  enableCopy?: boolean;
}) {
  const hasItems = items.length > 0;

  return (
    <SectionCard
      title={title}
      description={description}
      right={
        enableCopy && hasItems ? (
          <CopyButton text={toMarkdown(title, items)} />
        ) : null
      }
    >
      {hasItems ? (
        <ul className="space-y-2 text-sm">
          {items.map((t, idx) => (
            <li key={`${idx}-${t.slice(0, 24)}`} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
              <span className="leading-6">{t}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-sm text-muted-foreground">
          {emptyMessage ?? "Nothing here yet."}
        </div>
      )}
    </SectionCard>
  );
}
