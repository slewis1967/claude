// The agent fleet registry. Claude is the only "live" agent — it is wired to
// the real Claude Code CLI bridge. The others are presented as separately
// controllable sections in mission control; they are scaffolded so you can
// drop in their own bridges later (each just needs an API route like Claude's).

export type AgentId = "claude" | "openclaw" | "hermes" | "atlas" | "orion";

export interface AgentDef {
  id: AgentId;
  name: string;
  tagline: string;
  /** Tailwind-friendly hex used for glows, rings, and accents. */
  accent: string;
  accentSoft: string;
  /** Short glyph shown in the dock + cards. */
  glyph: string;
  /** Whether this agent is connected to a real backend bridge. */
  live: boolean;
  model?: string;
  capabilities: string[];
  /** Synthetic baseline metrics for the non-live agents. */
  baseline: {
    load: number; // 0..100
    latencyMs: number;
    successRate: number; // 0..100
  };
}

export const AGENTS: AgentDef[] = [
  {
    id: "claude",
    name: "Claude",
    tagline: "Primary reasoning core — live CLI bridge",
    accent: "#7c5cff",
    accentSoft: "#a78bff",
    glyph: "✦",
    live: true,
    model: "claude-opus-4-8",
    capabilities: ["Reasoning", "Code", "Tools", "Long context", "Vision"],
    baseline: { load: 38, latencyMs: 640, successRate: 99.2 },
  },
  {
    id: "openclaw",
    name: "OpenClaw",
    tagline: "Autonomous web crawler & scraping swarm",
    accent: "#22d3ee",
    accentSoft: "#67e8f9",
    glyph: "⌖",
    live: false,
    model: "openclaw-v3",
    capabilities: ["Crawl", "Extract", "Index", "Schedule"],
    baseline: { load: 61, latencyMs: 220, successRate: 97.4 },
  },
  {
    id: "hermes",
    name: "Hermes",
    tagline: "Messaging & comms dispatch relay",
    accent: "#ff6b9d",
    accentSoft: "#ffa6c4",
    glyph: "✺",
    live: false,
    model: "hermes-pro",
    capabilities: ["Email", "Slack", "SMS", "Routing"],
    baseline: { load: 27, latencyMs: 95, successRate: 99.8 },
  },
  {
    id: "atlas",
    name: "Atlas",
    tagline: "Infrastructure & deployment automation",
    accent: "#9eff5a",
    accentSoft: "#c4ff9e",
    glyph: "⏣",
    live: false,
    model: "atlas-ops",
    capabilities: ["Deploy", "Scale", "Monitor", "Rollback"],
    baseline: { load: 44, latencyMs: 310, successRate: 98.1 },
  },
  {
    id: "orion",
    name: "Orion",
    tagline: "Data pipeline & analytics engine",
    accent: "#ffd166",
    accentSoft: "#ffe0a3",
    glyph: "✷",
    live: false,
    model: "orion-analytics",
    capabilities: ["ETL", "Query", "Forecast", "Report"],
    baseline: { load: 52, latencyMs: 480, successRate: 96.9 },
  },
];

export const AGENTS_BY_ID: Record<AgentId, AgentDef> = AGENTS.reduce(
  (acc, a) => {
    acc[a.id] = a;
    return acc;
  },
  {} as Record<AgentId, AgentDef>,
);

export function getAgent(id: string): AgentDef | undefined {
  return AGENTS_BY_ID[id as AgentId];
}
