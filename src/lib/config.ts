import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

// Single source of truth for the runtime config file (.agentic-os.json in the
// project root). Holds the Obsidian vault path and any real-agent backends the
// user has connected. All writers merge so settings never clobber each other.

export type AgentRuntime = "openai" | "wsl" | "windows" | "direct";

export interface AgentConfig {
  live?: boolean;
  runtime?: AgentRuntime;
  // Spawn runtimes (wsl / windows / direct):
  command?: string;
  cwd?: string;
  args?: string[];
  // HTTP runtime (openai): an OpenAI-compatible endpoint, e.g. Hermes' API
  // server or Ollama.
  baseUrl?: string;
  model?: string;
  apiKey?: string;
}

export interface AppConfig {
  vaultPath?: string;
  agents?: Record<string, AgentConfig>;
}

function configFile(): string {
  return path.join(process.cwd(), ".agentic-os.json");
}

export function readConfig(): AppConfig {
  try {
    const data = JSON.parse(readFileSync(configFile(), "utf8"));
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

export function writeConfig(patch: Partial<AppConfig>): AppConfig {
  const next = { ...readConfig(), ...patch };
  writeFileSync(configFile(), JSON.stringify(next, null, 2));
  return next;
}

export function getAgentConfig(id: string): AgentConfig | undefined {
  return readConfig().agents?.[id];
}

export function setAgentConfig(id: string, cfg: AgentConfig): AppConfig {
  const cur = readConfig();
  const agents = { ...(cur.agents ?? {}), [id]: { ...(cur.agents?.[id] ?? {}), ...cfg } };
  return writeConfig({ agents });
}
