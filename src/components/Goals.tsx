"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Target, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useDictation } from "@/hooks/useDictation";
import { MicButton } from "./MicButton";
import { GlassCard } from "./widgets";
import { VaultConnector, vaultReady, type VaultStatus } from "./VaultConnector";

interface Goal {
  text: string;
  time?: string;
  done: boolean;
}

function parseGoals(md: string): Goal[] {
  const lines = md.split("\n");
  const start = lines.findIndex((l) => l.trim() === "## 🎯 Goals");
  if (start === -1) return [];
  const out: Goal[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) break;
    const m = lines[i].match(/^- \[([ xX])\] (.*)$/);
    if (m) {
      const done = m[1].toLowerCase() === "x";
      const tm = m[2].match(/^(.*?)\s*_\((\d{2}:\d{2})\)_\s*$/);
      out.push({
        done,
        text: tm ? tm[1] : m[2],
        time: tm ? tm[2] : undefined,
      });
    }
  }
  return out;
}

export default function Goals() {
  const [status, setStatus] = useState<VaultStatus | null>(null);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const dictation = useDictation(text, setText);

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

  const goals = status ? parseGoals(status.todayMarkdown) : [];
  const doneCount = goals.filter((g) => g.done).length;
  const ready = vaultReady(status);

  const add = async () => {
    if (!text.trim()) return;
    if (dictation.listening) dictation.stop();
    setSaving(true);
    try {
      await fetch("/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "goal", text }),
      });
      setText("");
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (index: number, done: boolean) => {
    // Optimistic update, then persist to the vault file.
    setStatus((s) => s); // keep ref; we re-fetch after
    await fetch("/api/vault/goal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ index, done }),
    });
    await refresh();
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
              <span className="text-gradient">Goals</span>
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

        {/* Add goal (with voice input) */}
        <GlassCard hover={false} className="mt-5 p-5">
          <div className="mb-3 flex items-center gap-2 text-white/70">
            <Target size={16} className="text-plasma-soft" />
            <span className="text-sm font-semibold">Add a task</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder={dictation.listening ? "Listening… speak now" : "What needs doing?"}
              className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-plasma/50 focus:outline-none"
            />
            <MicButton
              listening={dictation.listening}
              supported={dictation.supported}
              onClick={dictation.toggle}
              size={40}
            />
            <button
              onClick={add}
              disabled={!text.trim() || saving}
              className="rounded-xl bg-gradient-to-br from-plasma to-plasma-deep px-4 py-2.5 text-sm font-medium text-white transition-transform hover:scale-105 disabled:opacity-30"
            >
              Add
            </button>
          </div>
          {dictation.error && (
            <p className="mt-2 text-[11px] text-ember/80">{dictation.error}</p>
          )}
        </GlassCard>

        {/* Task list */}
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-white/40">
              Today&apos;s tasks
            </h2>
            {goals.length > 0 && (
              <span className="text-xs text-white/40">
                {doneCount}/{goals.length} done
              </span>
            )}
          </div>

          {goals.length > 0 && (
            <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-plasma to-flux"
                animate={{ width: `${(doneCount / goals.length) * 100}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
              />
            </div>
          )}

          <GlassCard hover={false} className="p-2">
            {goals.length === 0 ? (
              <p className="px-3 py-10 text-center text-sm text-white/35">
                {ready
                  ? "No tasks yet. Add one above (type or tap the mic)."
                  : "Connect your vault above to start adding tasks."}
              </p>
            ) : (
              <ul>
                <AnimatePresence initial={false}>
                  {goals.map((g, i) => (
                    <motion.li
                      key={`${i}-${g.text}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/[0.03]"
                    >
                      <button
                        onClick={() => toggle(i, !g.done)}
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors"
                        style={{
                          borderColor: g.done ? "#34d399" : "rgba(255,255,255,0.25)",
                          background: g.done ? "rgba(52,211,153,0.2)" : "transparent",
                        }}
                        aria-label={g.done ? "Mark incomplete" : "Mark complete"}
                      >
                        {g.done && <span className="text-xs text-emerald-300">✓</span>}
                      </button>
                      <span
                        className={`flex-1 text-sm ${
                          g.done ? "text-white/40 line-through" : "text-white/85"
                        }`}
                      >
                        {g.text}
                      </span>
                      {g.time && (
                        <span className="shrink-0 font-mono text-[10px] text-white/30">
                          {g.time}
                        </span>
                      )}
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
