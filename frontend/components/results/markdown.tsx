"use client";

import ReactMarkdown from "react-markdown";

function normalizeParagraphs(md: string): string {
  const lines = (md ?? "").split("\n");
  const out: string[] = [];
  let buf: string[] = [];

  const flush = () => {
    if (!buf.length) return;
    out.push(buf.join(" ").replace(/\s+/g, " ").trim());
    buf = [];
  };

  const isStructural = (line: string) => {
    const s = line.trim();
    if (!s) return true;
    if (/^(#{1,6})\s+/.test(s)) return true;
    if (/^(-|\*|\+)\s+/.test(s)) return true;
    if (/^\d+\.\s+/.test(s)) return true;
    if (/^>\s+/.test(s)) return true;
    if (/^```/.test(s)) return true;
    if (/^\|/.test(s) || /^-{3,}$/.test(s)) return true;
    return false;
  };

  for (const line of lines) {
    if (isStructural(line)) {
      flush();
      out.push(line);
      continue;
    }
    buf.push(line.trim());
  }
  flush();

  return out.join("\n");
}

export function Markdown({
  content,
  normalize,
}: {
  content: string;
  normalize?: boolean;
}) {
  const md = normalize ? normalizeParagraphs(content) : content;
  return (
    <div className="prose prose-invert max-w-none">
      <ReactMarkdown>{md}</ReactMarkdown>
    </div>
  );
}
