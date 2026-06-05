"use client";

import { motion } from "framer-motion";
import { NotebookPen, RefreshCw, FileText, Flame, ChevronLeft } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDictation } from "@/hooks/useDictation";
import { MicButton } from "./MicButton";
import { Markdown } from "./Markdown";
import { GlassCard } from "./widgets";
import { VaultConnector, vaultReady, type VaultStatus } from "./VaultConnector";

interface DaySummary {
  date: string;
  goals: number;
  goalsDone: number;
  journal: number;
  chats: number;
}

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

function isoKey(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function Journal() {
  const [status, setStatus] = useState<VaultStatus | null>(null);
  const [entry, setEntry] = useState("");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<{ days: DaySummary[]; streak: number }>({
    days: [],
    streak: 0,
  });
  const [selected, setSelected] = useState<string | null>(null); // null = today
  const [selectedMd, setSelectedMd] = useState("");
  const dictation = useDictation(entry, setEntry);

  const today = isoKey(new Date());

  const refresh = useCallback(async () => {
    try {
      const [s, d] = await Promise.all([
        fetch("/api/vault", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/vault/days", { cache: "no-store" }).then((r) => r.json()),
      ]);
      setStatus(s);
      setHistory(d);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const ready = vaultReady(status);

  const selectDay = async (date: string) => {
    if (date === today) {
      setSelected(null);
      return;
    }
    setSelected(date);
    try {
      const res = await fetch(`/api/vault/day?date=${date}`, { cache: "no-store" });
      const data = await res.json();
      setSelectedMd(data.markdown ?? "");
    } catch {
      setSelectedMd("");
    }
  };

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

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const viewingPast = selected && selected !== today;
  const journalMd = viewingPast
    ? extractSection(selectedMd, "## 📓 Journal")
    : status
      ? extractSection(status.todayMarkdown, "## 📓 Journal")
      : "";

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-5 py-7 lg:px-9">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">{todayLabel}</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              <span className="text-gradient">Journal</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {history.streak > 0 && (
              <span className="flex items-center gap-1.5 rounded-xl border border-gold/30 bg-gold/10 px-3 py-2 text-xs font-semibold text-gold">
                <Flame size={14} /> {history.streak}-day streak
              </span>
            )}
            <button
              onClick={refresh}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/55 transition-colors hover:text-white"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        <VaultConnector status={status} onChange={setStatus} />

        {/* Calendar heatmap */}
        {ready && (
          <GlassCard hover={false} className="mt-5 p-5">
            <Heatmap
              days={history.days}
              today={today}
              selected={selected ?? today}
              onSelect={selectDay}
            />
          </GlassCard>
        )}

        {/* New entry */}
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

        {/* Entries (today, or a selected past day) */}
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/40">
              <FileText size={14} />
              {viewingPast ? prettyIso(selected!) : status?.todayFile ?? "Agentic OS/…"}
            </h2>
            {viewingPast && (
              <button
                onClick={() => setSelected(null)}
                className="flex items-center gap-1 text-xs text-flux hover:underline"
              >
                <ChevronLeft size={13} /> Back to today
              </button>
            )}
          </div>
          <GlassCard hover={false} className="min-h-[160px] p-6">
            {journalMd ? (
              <Markdown source={journalMd} />
            ) : (
              <p className="py-10 text-center text-sm text-white/35">
                {viewingPast
                  ? "No journal entries on this day."
                  : ready
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

/* ---------- GitHub-style activity heatmap ---------- */

const WEEKS = 18;

function Heatmap({
  days,
  today,
  selected,
  onSelect,
}: {
  days: DaySummary[];
  today: string;
  selected: string;
  onSelect: (date: string) => void;
}) {
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of days) m.set(d.date, d.goals + d.journal + d.chats);
    return m;
  }, [days]);

  // Build columns of 7 days (Sun→Sat), with today in the last column.
  const columns = useMemo(() => {
    const todayD = new Date(today + "T00:00:00");
    const weekStart = new Date(todayD);
    weekStart.setDate(todayD.getDate() - todayD.getDay()); // Sunday of this week
    const start = new Date(weekStart);
    start.setDate(weekStart.getDate() - (WEEKS - 1) * 7);
    const cols: { date: string; count: number; future: boolean }[][] = [];
    const cur = new Date(start);
    for (let w = 0; w < WEEKS; w++) {
      const col: { date: string; count: number; future: boolean }[] = [];
      for (let dow = 0; dow < 7; dow++) {
        const key = isoKey(cur);
        col.push({ date: key, count: counts.get(key) ?? 0, future: key > today });
        cur.setDate(cur.getDate() + 1);
      }
      cols.push(col);
    }
    return cols;
  }, [counts, today]);

  const color = (count: number, future: boolean) => {
    if (future) return "transparent";
    if (count === 0) return "rgba(255,255,255,0.05)";
    if (count <= 2) return "rgba(34,211,238,0.30)";
    if (count <= 5) return "rgba(34,211,238,0.55)";
    return "rgba(34,211,238,0.9)";
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-white/40">
          Activity
        </span>
        <div className="flex items-center gap-1.5 text-[10px] text-white/35">
          Less
          {[0.05, 0.3, 0.55, 0.9].map((o, i) => (
            <span
              key={i}
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: i === 0 ? "rgba(255,255,255,0.05)" : `rgba(34,211,238,${o})` }}
            />
          ))}
          More
        </div>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {columns.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-1">
            {col.map((cell) => {
              const isToday = cell.date === today;
              const isSel = cell.date === selected;
              return (
                <button
                  key={cell.date}
                  onClick={() => !cell.future && onSelect(cell.date)}
                  disabled={cell.future}
                  title={cell.future ? "" : `${cell.date} · ${cell.count} entries`}
                  className="h-3 w-3 rounded-sm transition-transform hover:scale-125 disabled:cursor-default"
                  style={{
                    background: color(cell.count, cell.future),
                    outline: isSel && !cell.future ? "1.5px solid #67e8f9" : isToday ? "1.5px solid rgba(255,255,255,0.3)" : "none",
                    outlineOffset: "1px",
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function prettyIso(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
