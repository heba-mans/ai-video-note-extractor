import { SectionCard } from "./section-card";

export function BulletsSection({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <SectionCard title={title}>
      <ul className="space-y-2 text-sm">
        {items.map((t, idx) => (
          <li key={idx} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
            <span className="leading-6">{t}</span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
