"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Play,
  Pause,
  RotateCw,
  Terminal,
  ArrowUp,
  Power,
  Gauge as GaugeIcon,
  Activity,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { getAgent, type AgentId } from "@/lib/agents";
import type { FleetMetrics } from "@/hooks/useFleetMetrics";
import { AnimatedNumber, GlassCard, RadialGauge, Sparkline } from "./widgets";

type PowerState = "running" | "paused";

export default function AgentPanel({
  id,
  metric,
}: {
  id: AgentId;
  metric: FleetMetrics[AgentId];
}) {
  const agent = getAgent(id)!;
  const [power, setPower] = useState<PowerState>("running");
  const [caps, setCaps] = useState<Record<string, boolean>>(
    Object.fromEntries(agent.capabilities.map((c) => [c, true])),
  );
  const [log, setLog] = useState<{ id: string; text: string; kind: "in" | "out" }[]>(
    [
      {
        id: "boot",
        kind: "out",
        text: `${agent.name} bridge initialized. Model: ${agent.model}. Type a command to dispatch.`,
      },
    ],
  );
  const [cmd, setCmd] = useState("");

  const accent = agent.accent;

  const dispatch = () => {
    const text = cmd.trim();
    if (!text) return;
    const inId = crypto.randomUUID();
    setLog((l) => [...l, { id: inId, kind: "in", text }]);
    setCmd("");
    // Simulated agent response — these agents are scaffolded for their own
    // bridges. Swap this for a real API route mirroring /api/claude.
    setTimeout(() => {
      setLog((l) => [
        ...l,
        {
          id: crypto.randomUUID(),
          kind: "out",
          text: simulateResponse(agent.id, text),
        },
      ]);
    }, 420);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex h-14 w-14 items-center justify-center rounded-3xl text-3xl"
            style={{
              background: `${accent}22`,
              color: accent,
              boxShadow: `0 0 36px -8px ${accent}`,
            }}
          >
            {agent.glyph}
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{agent.name}</h1>
            <p className="text-sm text-white/45">{agent.tagline}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ControlBtn
            label={power === "running" ? "Pause" : "Resume"}
            icon={power === "running" ? <Pause size={15} /> : <Play size={15} />}
            accent={accent}
            onClick={() => setPower((p) => (p === "running" ? "paused" : "running"))}
            active={power === "running"}
          />
          <ControlBtn
            label="Restart"
            icon={<RotateCw size={15} />}
            accent={accent}
            onClick={() => {
              setPower("running");
              setLog((l) => [
                ...l,
                {
                  id: crypto.randomUUID(),
                  kind: "out",
                  text: `↻ ${agent.name} restarted. All subsystems green.`,
                },
              ]);
            }}
          />
        </div>
      </div>

      {/* Status banner */}
      <GlassCard hover={false} className="flex items-center gap-3 px-5 py-3">
        <Power
          size={16}
          style={{ color: power === "running" ? accent : "#ff6b9d" }}
        />
        <span className="text-sm">
          Status:{" "}
          <span
            className="font-semibold"
            style={{ color: power === "running" ? accent : "#ff6b9d" }}
          >
            {power === "running" ? "Running" : "Paused"}
          </span>
        </span>
        <span className="ml-auto rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-widest text-white/40">
          scaffolded bridge
        </span>
      </GlassCard>

      {/* Metrics row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <GlassCard className="flex flex-col items-center gap-2 p-5">
          <RadialGauge value={metric.load} accent={accent} label="load" size={120} />
        </GlassCard>
        <GlassCard className="p-5">
          <StatHeader icon={<Activity size={14} />} label="Latency" accent={accent} />
          <div className="mt-2 text-3xl font-bold">
            <AnimatedNumber value={metric.latencyMs} suffix="ms" />
          </div>
          <div className="mt-3">
            <Sparkline data={metric.history} accent={accent} height={48} />
          </div>
        </GlassCard>
        <GlassCard className="p-5">
          <StatHeader icon={<Zap size={14} />} label="Success Rate" accent={accent} />
          <div className="mt-2 text-3xl font-bold">
            <AnimatedNumber value={metric.successRate} decimals={1} suffix="%" />
          </div>
          <div className="mt-4 space-y-1 text-xs text-white/45">
            <div className="flex justify-between">
              <span>Tasks completed</span>
              <span className="font-mono text-white/70">
                {metric.tasksDone.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Model</span>
              <span className="font-mono text-white/70">{agent.model}</span>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Capabilities + console */}
      <div className="grid gap-6 lg:grid-cols-3">
        <GlassCard hover={false} className="p-5 lg:col-span-1">
          <StatHeader icon={<GaugeIcon size={14} />} label="Capabilities" accent={accent} />
          <div className="mt-4 space-y-2">
            {agent.capabilities.map((c) => (
              <button
                key={c}
                onClick={() => setCaps((p) => ({ ...p, [c]: !p[c] }))}
                className="flex w-full items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5 text-sm transition-colors hover:border-white/15"
              >
                <span className={caps[c] ? "text-white/85" : "text-white/35"}>
                  {c}
                </span>
                <Toggle on={caps[c]} accent={accent} />
              </button>
            ))}
          </div>
        </GlassCard>

        <GlassCard hover={false} className="flex flex-col overflow-hidden p-0 lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-white/5 px-5 py-3 text-sm text-white/55">
            <Terminal size={14} style={{ color: accent }} />
            {agent.name} command console
          </div>
          <div className="h-64 space-y-2 overflow-y-auto p-5 font-mono text-xs">
            <AnimatePresence initial={false}>
              {log.map((l) => (
                <motion.div
                  key={l.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={l.kind === "in" ? "text-white/90" : ""}
                  style={l.kind === "out" ? { color: agent.accentSoft } : undefined}
                >
                  <span className="text-white/30">
                    {l.kind === "in" ? "❯ " : "  "}
                  </span>
                  {l.text}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div className="border-t border-white/5 p-3">
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-1.5 focus-within:border-white/25">
              <span className="pl-2 font-mono text-sm" style={{ color: accent }}>
                ❯
              </span>
              <input
                value={cmd}
                onChange={(e) => setCmd(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && dispatch()}
                placeholder={`dispatch a command to ${agent.name}…`}
                className="flex-1 bg-transparent px-1 py-1.5 font-mono text-sm text-white placeholder:text-white/25 focus:outline-none"
              />
              <button
                onClick={dispatch}
                disabled={!cmd.trim()}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white transition-transform hover:scale-105 disabled:opacity-30"
                style={{ background: accent }}
              >
                <ArrowUp size={15} />
              </button>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function ControlBtn({
  label,
  icon,
  accent,
  onClick,
  active,
}: {
  label: string;
  icon: React.ReactNode;
  accent: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all hover:scale-[1.03]"
      style={{
        borderColor: active ? `${accent}55` : "rgba(255,255,255,0.1)",
        background: active ? `${accent}1f` : "rgba(255,255,255,0.03)",
        color: active ? accent : "rgba(255,255,255,0.7)",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function StatHeader({
  icon,
  label,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-2 text-white/50">
      <span style={{ color: accent }}>{icon}</span>
      <span className="text-xs uppercase tracking-widest">{label}</span>
    </div>
  );
}

function Toggle({ on, accent }: { on: boolean; accent: string }) {
  return (
    <span
      className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
      style={{ background: on ? accent : "rgba(255,255,255,0.12)" }}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute h-4 w-4 rounded-full bg-white shadow"
        style={{ left: on ? "calc(100% - 18px)" : "2px" }}
      />
    </span>
  );
}

function simulateResponse(id: AgentId, cmd: string): string {
  const c = cmd.toLowerCase();
  const generic = [
    `acknowledged — queued "${cmd}" for execution.`,
    `dispatched. job id #${Math.floor(Math.random() * 9000) + 1000} accepted.`,
    `processing "${cmd}"… done. 0 errors.`,
  ];
  if (c.includes("status")) return "all subsystems nominal · queue depth 0 · uptime 99.98%";
  if (c.includes("help"))
    return "commands: status · run <task> · scale <n> · pause · flush · report";
  switch (id) {
    case "openclaw":
      return c.includes("crawl")
        ? `crawl started across ${Math.floor(Math.random() * 40) + 5} domains. streaming results…`
        : generic[Math.floor(Math.random() * generic.length)];
    case "hermes":
      return c.includes("send")
        ? `message routed to ${Math.floor(Math.random() * 900) + 100} recipients · delivery 100%`
        : generic[Math.floor(Math.random() * generic.length)];
    case "atlas":
      return c.includes("deploy")
        ? `deploy pipeline triggered · rolling out to ${Math.floor(Math.random() * 12) + 1} nodes…`
        : generic[Math.floor(Math.random() * generic.length)];
    case "orion":
      return c.includes("query")
        ? `query executed · ${Math.floor(Math.random() * 90000).toLocaleString()} rows scanned in ${(Math.random() * 2).toFixed(2)}s`
        : generic[Math.floor(Math.random() * generic.length)];
    default:
      return generic[Math.floor(Math.random() * generic.length)];
  }
}
