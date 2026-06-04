"use client";

import { motion } from "framer-motion";
import {
  Target,
  NotebookPen,
  FolderOpen,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Markdown } from "./Markdown";
import { GlassCard } from "./widgets";

interface VaultStatus {
  configured: boolean;
  vaultRoot: string;
  folder: string;
  vaultExists: boolean;
  writable: boolean;
  todayFile: string;
  todayMarkdown: string;
  hint?: string;
}

export default function Journal() {
  const [status, setStatus] = useState<VaultStatus | null>(null);
  const [goal, setGoal] = useState("");
  const [entry, setEntry] = useState("");
  const [saving, setSaving] = useState<"goal" | "journal" | null>(null);

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

  const save = async (type: "goal" | "journal", text: string) => {
    if (!text.trim()) return;
    setSaving(type);
    try {
      await fetch("/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, text }),
      });
      if (type === "goal") setGoal("");
      else setEntry("");
      await refresh();
    } finally {
      setSaving(null);
    }
  };

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-5 py-7 lg:px-9">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">{today}</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Daily <span className="text-gradient">Journal</span>
            </h1>
          </div>
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/55 transition-colors hover:text-white"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Vault connector + status */}
        <VaultConnector status={status} onChange={setStatus} />

        {/* Inputs */}
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <GlassCard hover={false} className="p-5">
            <div className="mb-3 flex items-center gap-2 text-white/70">
              <Target size={16} className="text-plasma-soft" />
              <span className="text-sm font-semibold">Add a goal</span>
            </div>
            <div className="flex gap-2">
              <input
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && save("goal", goal)}
                placeholder="e.g. Ship the Obsidian integration"
                className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-plasma/50 focus:outline-none"
              />
              <button
                onClick={() => save("goal", goal)}
                disabled={!goal.trim() || saving === "goal"}
                className="rounded-xl bg-gradient-to-br from-plasma to-plasma-deep px-4 text-sm font-medium text-white transition-transform hover:scale-105 disabled:opacity-30"
              >
                Add
              </button>
            </div>
          </GlassCard>

          <GlassCard hover={false} className="p-5">
            <div className="mb-3 flex items-center gap-2 text-white/70">
              <NotebookPen size={16} className="text-flux" />
              <span className="text-sm font-semibold">Journal entry</span>
            </div>
            <textarea
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save("journal", entry);
              }}
              rows={2}
              placeholder="What happened today? (⌘/Ctrl + Enter to save)"
              className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-flux/50 focus:outline-none"
            />
            <div className="mt-2 flex justify-end">
              <button
                onClick={() => save("journal", entry)}
                disabled={!entry.trim() || saving === "journal"}
                className="rounded-xl bg-gradient-to-br from-flux to-cyan-600 px-4 py-2 text-sm font-medium text-white transition-transform hover:scale-105 disabled:opacity-30"
              >
                Save entry
              </button>
            </div>
          </GlassCard>
        </div>

        {/* Today's note preview */}
        <div className="mt-6">
          <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/40">
            <FolderOpen size={14} /> Today&apos;s note · {status?.todayFile ?? "Agentic OS/…"}
          </h2>
          <GlassCard hover={false} className="min-h-[200px] p-6">
            {status?.todayMarkdown?.trim() ? (
              <Markdown source={status.todayMarkdown} />
            ) : (
              <p className="py-10 text-center text-sm text-white/35">
                Nothing saved today yet. Add a goal, write a journal entry, or
                chat with an agent — it all lands here automatically.
              </p>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

function VaultConnector({
  status,
  onChange,
}: {
  status: VaultStatus | null;
  onChange: (s: VaultStatus) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [path, setPath] = useState("");
  const [connecting, setConnecting] = useState(false);

  // Open the editor automatically until a working vault is connected.
  const ok = !!status && status.configured && status.vaultExists && status.writable;
  useEffect(() => {
    if (status && !ok) {
      setEditing(true);
      setPath((p) => p || (status.configured ? status.vaultRoot : ""));
    }
  }, [status, ok]);

  const connect = async () => {
    if (!path.trim()) return;
    setConnecting(true);
    try {
      const res = await fetch("/api/vault/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      const next = (await res.json()) as VaultStatus;
      onChange(next);
      if (next.configured && next.vaultExists && next.writable) setEditing(false);
    } finally {
      setConnecting(false);
    }
  };

  if (!status) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-3.5 text-sm text-white/40">
        Checking vault…
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border px-5 py-4"
      style={{
        borderColor: ok ? "rgba(52,211,153,0.25)" : "rgba(255,209,102,0.3)",
        background: ok ? "rgba(52,211,153,0.06)" : "rgba(255,209,102,0.06)",
      }}
    >
      <div className="flex items-start gap-3">
        {ok ? (
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-300" />
        ) : (
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-gold" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">
              {ok ? "Auto-saving to your Obsidian vault" : "Connect your Obsidian vault"}
            </p>
            {ok && !editing && (
              <button
                onClick={() => {
                  setPath(status.vaultRoot);
                  setEditing(true);
                }}
                className="shrink-0 text-xs text-white/45 underline-offset-2 hover:text-white hover:underline"
              >
                Change
              </button>
            )}
          </div>

          {ok && !editing && (
            <p className="mt-0.5 break-all font-mono text-xs text-white/45">
              {status.folder}
            </p>
          )}

          {!ok && status.hint && (
            <p className="mt-1 text-xs text-gold/90">{status.hint}</p>
          )}

          {editing && (
            <div className="mt-3">
              <label className="text-xs text-white/50">
                Paste the full path to your vault folder
              </label>
              <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
                <input
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && connect()}
                  spellCheck={false}
                  placeholder={`C:\\Users\\You\\Documents\\Obsidian Vault`}
                  className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 font-mono text-xs text-white placeholder:text-white/25 focus:border-flux/50 focus:outline-none"
                />
                <button
                  onClick={connect}
                  disabled={!path.trim() || connecting}
                  className="rounded-xl bg-gradient-to-br from-flux to-cyan-600 px-4 py-2.5 text-sm font-medium text-white transition-transform hover:scale-[1.03] disabled:opacity-40"
                >
                  {connecting ? "Connecting…" : "Connect"}
                </button>
              </div>
              <p className="mt-2 text-[11px] text-white/35">
                Tip: in Obsidian, right-click a note → “Show in system explorer”,
                then copy the folder path. Backslashes and spaces are fine here.
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
