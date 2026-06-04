import os from "node:os";
import { getClaudeVersion } from "@/lib/claude-bridge";

// Live host telemetry for the mission-control gauges. Reads real OS metrics
// so the dashboard reflects the machine actually hosting Nexus OS.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let lastCpu = os.cpus().map((c) => c.times);
let lastSample = Date.now();

function cpuUsagePercent(): number {
  const now = os.cpus().map((c) => c.times);
  let idleDelta = 0;
  let totalDelta = 0;
  for (let i = 0; i < now.length; i++) {
    const prev = lastCpu[i] ?? now[i];
    const cur = now[i];
    const prevTotal =
      prev.user + prev.nice + prev.sys + prev.idle + prev.irq;
    const curTotal = cur.user + cur.nice + cur.sys + cur.idle + cur.irq;
    idleDelta += cur.idle - prev.idle;
    totalDelta += curTotal - prevTotal;
  }
  lastCpu = now;
  lastSample = Date.now();
  if (totalDelta <= 0) return 0;
  return Math.max(0, Math.min(100, (1 - idleDelta / totalDelta) * 100));
}

export async function GET() {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  const version = await getClaudeVersion();

  const payload = {
    online: version != null,
    claudeVersion: version,
    hostname: os.hostname(),
    platform: `${os.type()} ${os.release()}`,
    arch: os.arch(),
    cpuModel: os.cpus()[0]?.model ?? "Unknown",
    cpuCores: os.cpus().length,
    cpuPercent: Math.round(cpuUsagePercent()),
    loadAvg: os.loadavg().map((n) => Number(n.toFixed(2))),
    memTotal: total,
    memUsed: used,
    memPercent: Math.round((used / total) * 100),
    uptimeSec: Math.round(os.uptime()),
    sampledAt: Date.now(),
  };

  return Response.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
