"use client";

import { motion } from "framer-motion";
import {
  Cpu,
  MemoryStick,
  Boxes,
  CheckCircle2,
  ChevronRight,
  Server,
  Clock,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AGENTS, type AgentId } from "@/lib/agents";
import { useSystemStats } from "@/hooks/useSystemStats";
import type { FleetMetrics } from "@/hooks/useFleetMetrics";
import { formatBytes, formatUptime } from "@/lib/format";
import { AnimatedNumber, GlassCard, RadialGauge, Sparkline } from "./widgets";
import { Avatar, AgentLogo } from "./logos";
import type { Section } from "./Sidebar";

export default function MissionControl({
  metrics,
  onOpen,
}: {
  metrics: FleetMetrics;
  onOpen: (s: Section) => void;
}) {
  const { stats } = useSystemStats();
  const { clock, greeting } = useClock();

  const fleetLoad = useMemo(() => {
    const vals = AGENTS.map((a) => metrics[a.id].load);
    return vals.reduce((s, v) => s + v, 0) / vals.length;
  }, [metrics]);

  const tasksTotal = useMemo(
    () => AGENTS.reduce((s, a) => s + metrics[a.id].tasksDone, 0),
    [metrics],
  );

  const avgSuccess = useMemo(() => {
    const vals = AGENTS.map((a) => metrics[a.id].successRate);
    return vals.reduce((s, v) => s + v, 0) / vals.length;
  }, [metrics]);

  return (
    <div className="space-y-6">
      {/* Greeting bar */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs uppercase tracking-[0.3em] text-white/40"
          >
            {greeting} · {clock}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-1 text-3xl font-bold tracking-tight"
          >
            Mission <span className="text-gradient">Control</span>
          </motion.h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill
            ok={stats?.online ?? false}
            label={
              stats?.online
                ? `Claude bridge online${stats.claudeVersion ? ` · v${stats.claudeVersion.split(" ")[0]}` : ""}`
                : "Claude bridge offline"
            }
          />
          {stats && (
            <>
              <InfoPill icon={<Server size={12} />} label={stats.hostname} />
              <InfoPill
                icon={<Clock size={12} />}
                label={`up ${formatUptime(stats.uptimeSec)}`}
              />
            </>
          )}
        </div>
      </div>

      {/* Top metric tiles */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          icon={<Cpu size={16} />}
          label="Host CPU"
          accent="#7c5cff"
          value={stats?.cpuPercent ?? 0}
          suffix="%"
          footer={stats ? `${stats.cpuCores} cores` : "—"}
          gaugeValue={stats?.cpuPercent ?? 0}
          delay={0}
        />
        <MetricTile
          icon={<MemoryStick size={16} />}
          label="Memory"
          accent="#22d3ee"
          value={stats?.memPercent ?? 0}
          suffix="%"
          footer={
            stats
              ? `${formatBytes(stats.memUsed)} / ${formatBytes(stats.memTotal)}`
              : "—"
          }
          gaugeValue={stats?.memPercent ?? 0}
          delay={0.05}
        />
        <MetricTile
          icon={<Boxes size={16} />}
          label="Fleet Load"
          accent="#ff6b9d"
          value={fleetLoad}
          suffix="%"
          footer={`${AGENTS.length} agents online`}
          gaugeValue={fleetLoad}
          delay={0.1}
        />
        <MetricTile
          icon={<CheckCircle2 size={16} />}
          label="Avg Success"
          accent="#9eff5a"
          value={avgSuccess}
          decimals={1}
          suffix="%"
          footer={`${tasksTotal.toLocaleString()} tasks done`}
          gaugeValue={avgSuccess}
          delay={0.15}
        />
      </div>

      {/* Fleet grid + activity */}
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <SectionTitle>Agent Fleet</SectionTitle>
          <div className="grid gap-4 md:grid-cols-2">
            {AGENTS.map((a, i) => (
              <FleetAgentCard
                key={a.id}
                id={a.id}
                metric={metrics[a.id]}
                onOpen={() => onOpen(a.id)}
                delay={i * 0.05}
              />
            ))}
          </div>
        </div>
        <div>
          <SectionTitle>Activity Stream</SectionTitle>
          <ActivityStream metrics={metrics} />
        </div>
      </div>
    </div>
  );
}

function MetricTile({
  icon,
  label,
  accent,
  value,
  suffix,
  decimals = 0,
  footer,
  gaugeValue,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  accent: string;
  value: number;
  suffix?: string;
  decimals?: number;
  footer: string;
  gaugeValue: number;
  delay: number;
}) {
  return (
    <GlassCard delay={delay} className="flex items-center justify-between p-5">
      <div className="min-w-0">
        <div className="mb-3 flex items-center gap-2 text-white/50">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: `${accent}22`, color: accent }}
          >
            {icon}
          </span>
          <span className="text-xs uppercase tracking-widest">{label}</span>
        </div>
        <div className="text-3xl font-bold tracking-tight">
          <AnimatedNumber value={value} decimals={decimals} suffix={suffix} />
        </div>
        <div className="mt-1 truncate text-xs text-white/40">{footer}</div>
      </div>
      <RadialGauge value={gaugeValue} accent={accent} size={84} stroke={7} />
    </GlassCard>
  );
}

function FleetAgentCard({
  id,
  metric,
  onOpen,
  delay,
}: {
  id: AgentId;
  metric: FleetMetrics[AgentId];
  onOpen: () => void;
  delay: number;
}) {
  const agent = AGENTS.find((a) => a.id === id)!;
  return (
    <GlassCard delay={delay} className="group cursor-pointer p-5" >
      <button onClick={onOpen} className="w-full text-left">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar
              id={agent.id}
              accent={agent.accent}
              accentSoft={agent.accentSoft}
              size={44}
            />
            <div>
              <div className="flex items-center gap-2 font-semibold">
                {agent.name}
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: agent.accent, boxShadow: `0 0 8px ${agent.accent}` }}
                />
              </div>
              <div className="text-[11px] text-white/40">
                {agent.live ? "live bridge" : agent.tagline.split("—")[0]}
              </div>
            </div>
          </div>
          <ChevronRight
            size={18}
            className="text-white/20 transition-transform group-hover:translate-x-1 group-hover:text-white/50"
          />
        </div>

        <div className="mt-4">
          <Sparkline data={metric.history} accent={agent.accent} height={44} />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Mini label="load" value={`${Math.round(metric.load)}%`} />
          <Mini label="latency" value={`${metric.latencyMs}ms`} />
          <Mini label="success" value={`${metric.successRate}%`} />
        </div>
      </button>
    </GlassCard>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] py-2">
      <div className="text-sm font-semibold tabular-nums">{value}</div>
      <div className="text-[9px] uppercase tracking-widest text-white/35">
        {label}
      </div>
    </div>
  );
}

interface ActivityItem {
  id: string;
  agent: AgentId;
  text: string;
  time: string;
}

const VERBS = [
  "completed task",
  "dispatched job",
  "indexed batch",
  "resolved query",
  "synced state",
  "deployed update",
  "processed stream",
  "scheduled run",
];

function ActivityStream({ metrics }: { metrics: FleetMetrics }) {
  const [items, setItems] = useState<ActivityItem[]>([]);

  useEffect(() => {
    const make = (): ActivityItem => {
      const agent = AGENTS[Math.floor(Math.random() * AGENTS.length)];
      const verb = VERBS[Math.floor(Math.random() * VERBS.length)];
      return {
        id: crypto.randomUUID(),
        agent: agent.id,
        text: `${verb} #${Math.floor(Math.random() * 9000) + 1000}`,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      };
    };
    setItems(Array.from({ length: 7 }, make));
    const timer = setInterval(() => {
      setItems((prev) => [make(), ...prev].slice(0, 9));
    }, 2200);
    return () => clearInterval(timer);
  }, []);

  return (
    <GlassCard hover={false} className="p-4">
      <div className="space-y-1">
        {items.map((it) => {
          const agent = AGENTS.find((a) => a.id === it.agent)!;
          return (
            <motion.div
              key={it.id}
              layout
              initial={{ opacity: 0, x: 20, height: 0 }}
              animate={{ opacity: 1, x: 0, height: "auto" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="flex items-center gap-3 rounded-xl px-2 py-2"
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg p-1.5"
                style={{ background: `${agent.accent}1f`, color: agent.accent }}
              >
                <AgentLogo id={agent.id} className="h-full w-full" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs">
                  <span className="font-medium" style={{ color: agent.accentSoft }}>
                    {agent.name}
                  </span>{" "}
                  <span className="text-white/55">{it.text}</span>
                </div>
              </div>
              <span className="shrink-0 font-mono text-[10px] text-white/30">
                {it.time}
              </span>
            </motion.div>
          );
        })}
      </div>
    </GlassCard>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-white/40">
      {children}
    </h2>
  );
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div
      className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs"
      style={{
        borderColor: ok ? "rgba(158,255,90,0.3)" : "rgba(255,107,157,0.3)",
        background: ok ? "rgba(158,255,90,0.07)" : "rgba(255,107,157,0.07)",
        color: ok ? "#9eff5a" : "#ff6b9d",
      }}
    >
      <span
        className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
        style={{
          background: ok ? "#9eff5a" : "#ff6b9d",
          boxShadow: `0 0 8px ${ok ? "#9eff5a" : "#ff6b9d"}`,
        }}
      />
      {label}
    </div>
  );
}

function InfoPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.02] px-3 py-1.5 text-xs text-white/45">
      {icon}
      <span className="font-mono">{label}</span>
    </div>
  );
}

function greetingFor(h: number) {
  if (h < 5) return "Burning the midnight oil";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

// Time-dependent strings are computed only after mount so server and client
// markup match (no hydration mismatch); they start blank and fill in on load.
function useClock() {
  const [clock, setClock] = useState("");
  const [greeting, setGreeting] = useState("");
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setClock(
        d.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
      setGreeting(greetingFor(d.getHours()));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  return { clock, greeting };
}
