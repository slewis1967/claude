// The agent fleet registry. Claude is the only "live" agent — it is wired to
// the real Claude Code CLI bridge. The others are full chat experiences too,
// driven by a local simulated responder, and are scaffolded so you can drop in
// their own bridges later (each just needs an API route like Claude's).

export type AgentId = "claude" | "openclaw" | "hermes" | "atlas" | "orion";

export interface AgentDef {
  id: AgentId;
  name: string;
  tagline: string;
  /** One-line status shown under the name in the contact list. */
  status: string;
  /** Tailwind-friendly hex used for glows, rings, and accents. */
  accent: string;
  accentSoft: string;
  /** Short glyph (legacy / fallback). Real marks live in logos.tsx. */
  glyph: string;
  /** Whether this agent is connected to a real backend bridge. */
  live: boolean;
  model?: string;
  capabilities: string[];
  /** Opening message shown when a fresh chat is started. */
  greeting: string;
  /** Suggested prompts surfaced in an empty chat. */
  prompts: string[];
  /** Synthetic baseline metrics for the fleet overview. */
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
    tagline: "Primary reasoning core",
    status: "Live CLI bridge",
    accent: "#7c5cff",
    accentSoft: "#a78bff",
    glyph: "✦",
    live: true,
    model: "claude-opus-4-8",
    capabilities: ["Reasoning", "Code", "Tools", "Long context", "Vision"],
    greeting:
      "Hey — I'm wired straight to the Claude Code CLI on this machine. Ask me anything and I'll stream the answer back live.",
    prompts: [
      "Summarize what you can do as my mission-control core.",
      "Write a haiku about a fleet of AI agents.",
      "What's the git status of this project?",
      "Explain the Claude Code CLI bridge in one paragraph.",
    ],
    baseline: { load: 38, latencyMs: 640, successRate: 99.2 },
  },
  {
    id: "openclaw",
    name: "OpenClaw",
    tagline: "Autonomous web crawler & scraping swarm",
    status: "Online",
    accent: "#22d3ee",
    accentSoft: "#67e8f9",
    glyph: "⌖",
    live: false,
    model: "openclaw-v3",
    capabilities: ["Crawl", "Extract", "Index", "Schedule"],
    greeting:
      "OpenClaw online. Point me at a URL or domain and I'll crawl, extract, and index it. Try `crawl <url>` or just ask.",
    prompts: [
      "Crawl news.ycombinator.com and summarize the top stories",
      "Extract all product prices from a page",
      "Schedule a daily crawl of my competitors",
      "What's your current queue depth?",
    ],
    baseline: { load: 61, latencyMs: 220, successRate: 97.4 },
  },
  {
    id: "hermes",
    name: "Hermes",
    tagline: "Messaging & comms dispatch relay",
    status: "Online",
    accent: "#ff6b9d",
    accentSoft: "#ffa6c4",
    glyph: "✺",
    live: false,
    model: "hermes-pro",
    capabilities: ["Email", "Slack", "SMS", "Routing"],
    greeting:
      "Hermes here ✦ I route messages across email, Slack, and SMS in milliseconds. Tell me what to send and who to.",
    prompts: [
      "Send a launch announcement to all subscribers",
      "Draft a Slack update for the team",
      "Set up an SMS alert for failed deploys",
      "What's my delivery rate today?",
    ],
    baseline: { load: 27, latencyMs: 95, successRate: 99.8 },
  },
  {
    id: "atlas",
    name: "Atlas",
    tagline: "Infrastructure & deployment automation",
    status: "Online",
    accent: "#9eff5a",
    accentSoft: "#c4ff9e",
    glyph: "⏣",
    live: false,
    model: "atlas-ops",
    capabilities: ["Deploy", "Scale", "Monitor", "Rollback"],
    greeting:
      "Atlas standing by. I handle deploys, scaling, monitoring, and rollbacks. Ask me to ship something or check the fleet.",
    prompts: [
      "Deploy the latest build to production",
      "Scale the API to 12 nodes",
      "Show me current resource utilization",
      "Roll back the last deployment",
    ],
    baseline: { load: 44, latencyMs: 310, successRate: 98.1 },
  },
  {
    id: "orion",
    name: "Orion",
    tagline: "Data pipeline & analytics engine",
    status: "Online",
    accent: "#ffd166",
    accentSoft: "#ffe0a3",
    glyph: "✷",
    live: false,
    model: "orion-analytics",
    capabilities: ["ETL", "Query", "Forecast", "Report"],
    greeting:
      "Orion ready. I run pipelines, query warehouses, forecast trends, and build reports. What numbers do you need?",
    prompts: [
      "Query last month's revenue by region",
      "Forecast next quarter's signups",
      "Build a weekly KPI report",
      "How healthy is the data pipeline?",
    ],
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
