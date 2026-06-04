"use client";

import { useEffect, useRef, useState } from "react";
import { AGENTS, type AgentId } from "@/lib/agents";

export interface AgentMetric {
  load: number;
  latencyMs: number;
  successRate: number;
  tasksDone: number;
  history: number[];
}

export type FleetMetrics = Record<AgentId, AgentMetric>;

function seedMetrics(): FleetMetrics {
  const out = {} as FleetMetrics;
  for (const a of AGENTS) {
    out[a.id] = {
      load: a.baseline.load,
      latencyMs: a.baseline.latencyMs,
      successRate: a.baseline.successRate,
      tasksDone: Math.floor(Math.random() * 4000) + 800,
      history: Array.from({ length: 32 }, () =>
        Math.max(4, a.baseline.load + (Math.random() - 0.5) * 24),
      ),
    };
  }
  return out;
}

function drift(value: number, center: number, spread: number, min: number, max: number) {
  // Pull gently toward center while wandering — keeps numbers lively but stable.
  const pull = (center - value) * 0.08;
  const noise = (Math.random() - 0.5) * spread;
  return Math.max(min, Math.min(max, value + pull + noise));
}

// Simulates telemetry for the non-live agents (and a soft overlay for Claude),
// updating on an interval so gauges, sparklines, and counters keep breathing.
export function useFleetMetrics(intervalMs = 1800) {
  const [metrics, setMetrics] = useState<FleetMetrics>(seedMetrics);
  const ref = useRef(metrics);
  ref.current = metrics;

  useEffect(() => {
    const timer = setInterval(() => {
      const next = {} as FleetMetrics;
      for (const a of AGENTS) {
        const cur = ref.current[a.id];
        const load = drift(cur.load, a.baseline.load, 9, 3, 99);
        next[a.id] = {
          load,
          latencyMs: Math.round(
            drift(cur.latencyMs, a.baseline.latencyMs, a.baseline.latencyMs * 0.18, 20, 5000),
          ),
          successRate: Number(
            drift(cur.successRate, a.baseline.successRate, 0.25, 90, 100).toFixed(1),
          ),
          tasksDone: cur.tasksDone + Math.floor(Math.random() * 4),
          history: [...cur.history.slice(1), load],
        };
      }
      setMetrics(next);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return metrics;
}
