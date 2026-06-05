"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Target, RefreshCw, Flag, Calendar, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useDictation } from "@/hooks/useDictation";
import { MicButton } from "./MicButton";
import { GlassCard } from "./widgets";
import { VaultConnector, vaultReady, type VaultStatus } from "./VaultConnector";

type Priority = "high" | "medium" | "low" | "none";

interface Goal {
  index: number; // position in the file (for toggling)
  text: string;
  time?: string;
  due?: string;
  priority: Priority;
  carried: boolean;
  done: boolean;
}

const PRIO_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2, none: 3 };
const PRIO_META: Record<
  Exclude<Priority, "none">,
  { label: string; color: string }
> = {
  high: { label: "High", color: "#ff6b9d" },
  medium: { label: "Med", color: "#ffd166" },
  low: { label: "Low", color: "#9eff5a" },
};

function parseGoals(md: string): Goal[] {
  const lines = md.split("\n");
  const start = lines.findIndex((l) => l.trim() === "## 🎯 Goals");
  if (start === -1) return [];
  const out: Goal[] = [];
  let index = -1;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) break;
    const m = lines[i].match(/^- \[([ xX])\] (.*)$/);
    if (!m) continue;
    index++;
    const done = m[1].toLowerCase() === "x";
    let rest = m[2];

    let time: string | undefined;
    let carried = false;
    const meta = rest.match(/\s*_\(([^)]*)\)_\s*$/);
    if (meta) {
      if (meta[1] === "carried") carried = true;
      else time = meta[1];
      rest = rest.slice(0, meta.index).trim();
    }
    let due: string | undefined;
    const dm = rest.match(/📅\s*(\d{4}-\d{2}-\d{2})/);
    if (dm) {
      due = dm[1];
      rest = rest.replace(/📅\s*\d{4}-\d{2}-\d{2}/, "").trim();
    }
    let priority: Priority = "none";
    if (/⏫/.test(rest)) priority = "high";
    else if (/🔼/.test(rest)) priority = "medium";
    else if (/🔽/.test(rest)) priority = "low";
    rest = rest.replace(/[⏫🔼🔽]/g, "").replace(/\s+/g, " ").trim();

    out.push({ index, text: rest, time, due, priority, carried, done });
  }
  return out;
}

function todayKey() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function Goals() {
  const [status, setStatus] = useState<VaultStatus | null>(null);
  const [text, setText] = useState("");
  const [priority, setPriority] = useState<Priority>("none");
  const [due, setDue] = useState("");
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
  const sorted = [...goals].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (PRIO_RANK[a.priority] !== PRIO_RANK[b.priority])
      return PRIO_RANK[a.priority] - PRIO_RANK[b.priority];
    if (a.due && b.due) return a.due.localeCompare(b.due);
    if (a.due) return -1;
    if (b.due) return 1;
    return a.index - b.index;
  });
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
        body: JSON.stringify({
          type: "goal",
          text,
          priority: priority === "none" ? undefined : priority,
          due: due || undefined,
        }),
      });
      setText("");
      setPriority("none");
      setDue("");
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (index: number, done: boolean) => {
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

        {/* Add task */}
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

          {/* Priority + due toolbar */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Flag size={13} className="text-white/35" />
            {(["high", "medium", "low"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPriority((cur) => (cur === p ? "none" : p))}
                className="rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors"
                style={{
                  borderColor: priority === p ? PRIO_META[p].color : "rgba(255,255,255,0.12)",
                  background: priority === p ? `${PRIO_META[p].color}22` : "transparent",
                  color: priority === p ? PRIO_META[p].color : "rgba(255,255,255,0.5)",
                }}
              >
                {PRIO_META[p].label}
              </button>
            ))}
            <span className="mx-1 h-4 w-px bg-white/10" />
            <Calendar size={13} className="text-white/35" />
            <input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className="rounded-lg border border-white/12 bg-white/[0.03] px-2 py-1 text-xs text-white/70 focus:border-plasma/50 focus:outline-none [color-scheme:dark]"
            />
            {due && (
              <button
                onClick={() => setDue("")}
                className="text-white/35 hover:text-white"
                title="Clear due date"
              >
                <X size={13} />
              </button>
            )}
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
                  {sorted.map((g) => (
                    <GoalRow key={`${g.index}-${g.text}`} goal={g} onToggle={toggle} />
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

function GoalRow({
  goal: g,
  onToggle,
}: {
  goal: Goal;
  onToggle: (index: number, done: boolean) => void;
}) {
  const today = todayKey();
  const overdue = g.due && g.due < today && !g.done;
  const dueToday = g.due === today;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/[0.03]"
    >
      <button
        onClick={() => onToggle(g.index, !g.done)}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors"
        style={{
          borderColor: g.done ? "#34d399" : "rgba(255,255,255,0.25)",
          background: g.done ? "rgba(52,211,153,0.2)" : "transparent",
        }}
        aria-label={g.done ? "Mark incomplete" : "Mark complete"}
      >
        {g.done && <span className="text-xs text-emerald-300">✓</span>}
      </button>

      <span className={`flex-1 text-sm ${g.done ? "text-white/40 line-through" : "text-white/85"}`}>
        {g.text}
      </span>

      <div className="flex shrink-0 items-center gap-1.5">
        {g.priority !== "none" && (
          <span
            className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
            style={{
              color: PRIO_META[g.priority].color,
              background: `${PRIO_META[g.priority].color}1f`,
            }}
          >
            {PRIO_META[g.priority].label}
          </span>
        )}
        {g.due && (
          <span
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium"
            style={{
              color: overdue ? "#ff6b9d" : dueToday ? "#ffd166" : "rgba(255,255,255,0.5)",
              background: overdue
                ? "rgba(255,107,157,0.14)"
                : dueToday
                  ? "rgba(255,209,102,0.14)"
                  : "rgba(255,255,255,0.06)",
            }}
          >
            <Calendar size={9} />
            {formatDue(g.due)}
          </span>
        )}
        {g.carried && (
          <span
            className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-white/40"
            title="Carried over from a previous day"
          >
            ⏳ carried
          </span>
        )}
      </div>
    </motion.li>
  );
}

function formatDue(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
