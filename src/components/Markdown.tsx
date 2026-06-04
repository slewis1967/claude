"use client";

import React from "react";

// A deliberately tiny markdown renderer — enough to make the daily note look
// good (headings, checkboxes, bold, dividers). Frontmatter is hidden.

function inline(text: string, keyBase: string): React.ReactNode[] {
  // Bold (**…**) and inline code (`…`).
  const out: React.ReactNode[] = [];
  const regex = /(\*\*([^*]+)\*\*|`([^`]+)`|_([^_]+)_)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = regex.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[2] !== undefined) {
      out.push(
        <strong key={`${keyBase}-b${i}`} className="font-semibold text-white">
          {m[2]}
        </strong>,
      );
    } else if (m[3] !== undefined) {
      out.push(
        <code
          key={`${keyBase}-c${i}`}
          className="rounded bg-white/10 px-1 py-0.5 font-mono text-[0.85em] text-flux"
        >
          {m[3]}
        </code>,
      );
    } else if (m[4] !== undefined) {
      out.push(
        <em key={`${keyBase}-i${i}`} className="text-white/40">
          {m[4]}
        </em>,
      );
    }
    last = m.index + m[0].length;
    i++;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source }: { source: string }) {
  // Strip YAML frontmatter.
  const body = source.replace(/^---\n[\s\S]*?\n---\n?/, "");
  const lines = body.split("\n");
  const nodes: React.ReactNode[] = [];

  lines.forEach((line, idx) => {
    const key = `l${idx}`;
    if (line.startsWith("# ")) {
      nodes.push(
        <h1 key={key} className="mb-3 mt-1 text-xl font-bold text-white">
          {inline(line.slice(2), key)}
        </h1>,
      );
    } else if (line.startsWith("## ")) {
      nodes.push(
        <h2
          key={key}
          className="mb-2 mt-5 border-b border-white/10 pb-1 text-sm font-semibold uppercase tracking-wide text-white/70"
        >
          {inline(line.slice(3), key)}
        </h2>,
      );
    } else if (line.startsWith("### ")) {
      nodes.push(
        <h3 key={key} className="mb-1 mt-3 text-xs font-semibold text-white/55">
          {inline(line.slice(4), key)}
        </h3>,
      );
    } else if (/^- \[[ xX]\] /.test(line)) {
      const checked = /^- \[[xX]\]/.test(line);
      nodes.push(
        <label key={key} className="my-1 flex items-start gap-2 text-sm text-white/80">
          <span
            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
              checked
                ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                : "border-white/25"
            }`}
          >
            {checked ? "✓" : ""}
          </span>
          <span className={checked ? "text-white/45 line-through" : ""}>
            {inline(line.replace(/^- \[[ xX]\] /, ""), key)}
          </span>
        </label>,
      );
    } else if (line.trim() === "") {
      nodes.push(<div key={key} className="h-2" />);
    } else {
      nodes.push(
        <p key={key} className="my-1 text-sm leading-relaxed text-white/75">
          {inline(line, key)}
        </p>,
      );
    }
  });

  return <div>{nodes}</div>;
}
