"use client";

import { useEffect, useState } from "react";

export interface SystemStats {
  online: boolean;
  claudeVersion: string | null;
  hostname: string;
  platform: string;
  arch: string;
  cpuModel: string;
  cpuCores: number;
  cpuPercent: number;
  loadAvg: number[];
  memTotal: number;
  memUsed: number;
  memPercent: number;
  uptimeSec: number;
  sampledAt: number;
}

// Polls the host telemetry endpoint on an interval so the gauges feel alive.
export function useSystemStats(intervalMs = 2500) {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      try {
        const res = await fetch("/api/system", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as SystemStats;
        if (active) {
          setStats(data);
          setError(null);
        }
      } catch (e: any) {
        if (active) setError(e?.message ?? "telemetry offline");
      } finally {
        if (active) timer = setTimeout(tick, intervalMs);
      }
    };

    tick();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [intervalMs]);

  return { stats, error };
}
