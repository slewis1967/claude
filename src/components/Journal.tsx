"use client";

import { NotebookPen, RefreshCw, FileText } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useDictation } from "@/hooks/useDictation";
import { MicButton } from "./MicButton";
import { Markdown } from "./Markdown";
import { GlassCard } from "./widgets";
import { VaultConnector, vaultReady, type VaultStatus } from "./VaultConnector";

/** Pull the lines belonging to a "## …" section out of the daily note. */
function extractSection(md: string, header: string): string {
  const lines = md.split("\n");
  const start = lines.findIndex((l) => l.trim() === header);
  if (start === -1) return "";
  const body: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) break;
    body.push(lines[i]);
  }
  return body.join("\n").trim();
}

export default function Journal() {
  const [status, setStatus] = useState<VaultStatus | null>(null);
  const [entry, setEntry] = useState("");
  const [saving, setSaving] = useState(false);
  const dictation = useDictation(entry, setEntry);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/vault", { cache: "no-store" });
      setStatus(await res.json());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const ready = vaultReady(status);
  const journalMd = status ? extractSection(status.todayMarkdown, "## 📓 Journal") : "";

  const save = async () => {
    if (!entry.trim()) return;
    if (dictation.listening) dictation.stop();
    setSaving(true);
    try {
      await fetch("/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "journal", text: entry }),
      });
      setEntry("");
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-5 py-7 lg:px-9">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">{today}</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              <span className="text-gradient">Journal</span>
            </h1>
          </div>
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/55 transition-colors hover:text-white"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        <VaultConnector status={status} onChange={setStatus} />

        {/* New entry (with voice input) */}
        <GlassCard hover={false} className="mt-5 p-5">
          <div className="mb-3 flex items-center gap-2 text-white/70">
            <NotebookPen size={16} className="text-flux" />
            <span className="text-sm font-semibold">New entry</span>
          </div>
          <div className="flex items-end gap-2">
            <textarea
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
              }}
              rows={3}
              placeholder={
                dictation.listening
                  ? "Listening… speak now"
                  : "What happened today? (⌘/Ctrl + Enter to save, or tap the mic)"
              }
              className="flex-1 resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-flux/50 focus:outline-none"
            />
            <MicButton
              listening={dictation.listening}
              supported={dictation.supported}
              onClick={dictation.toggle}
              size={40}
            />
          </div>
          {dictation.error && (
            <p className="mt-2 text-[11px] text-ember/80">{dictation.error}</p>
          )}
          <div className="mt-2 flex justify-end">
            <button
              onClick={save}
              disabled={!entry.trim() || saving}
              className="rounded-xl bg-gradient-to-br from-flux to-cyan-600 px-4 py-2 text-sm font-medium text-white transition-transform hover:scale-105 disabled:opacity-30"
            >
              Save entry
            </button>
          </div>
        </GlassCard>

        {/* Today's entries */}
        <div className="mt-6">
          <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/40">
            <FileText size={14} /> {status?.todayFile ?? "Agentic OS/…"}
          </h2>
          <GlassCard hover={false} className="min-h-[160px] p-6">
            {journalMd ? (
              <Markdown source={journalMd} />
            ) : (
              <p className="py-10 text-center text-sm text-white/35">
                {ready
                  ? "No journal entries yet today. Write one above — type or tap the mic."
                  : "Connect your vault above to start journaling."}
              </p>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
