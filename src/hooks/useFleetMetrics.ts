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

// Deterministic seed so server-rendered and client-hydrated markup match
// (no hydration mismatch). Randomized drift only kicks in after mount.
function seedMetrics(): FleetMetrics {
  const out = {} as FleetMetrics;
  for (const a of AGENTS) {
    const base = a.baseline.load;
    out[a.id] = {
      load: base,
      latencyMs: a.baseline.latencyMs,
      successRate: a.baseline.successRate,
      tasksDone: 1000 + a.baseline.latencyMs * 3,
      // A smooth sine wave around the baseline — stable across SSR/CSR.
      history: Array.from({ length: 32 }, (_, i) =>
        Math.max(4, base + Math.sin(i / 3) * 10),
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
