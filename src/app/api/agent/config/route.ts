import { NextRequest } from "next/server";
import { getAgentConfig, setAgentConfig, type AgentRuntime } from "@/lib/config";

// GET  ?id=hermes        → that agent's saved connection config (or null).
// POST { id, ...config } → save / update an agent's backend connection.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RUNTIMES: AgentRuntime[] = ["openai", "wsl", "windows", "direct"];

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "";
  return Response.json(
    { id, config: id ? (getAgentConfig(id) ?? null) : null },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: NextRequest) {
  let body: {
    id?: string;
    live?: boolean;
    runtime?: AgentRuntime;
    command?: string;
    cwd?: string;
    args?: string[];
    baseUrl?: string;
    model?: string;
    apiKey?: string;
  };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const id = (body.id ?? "").toString().trim();
  if (!id) return new Response("Missing id", { status: 400 });

  const runtime = RUNTIMES.includes(body.runtime as AgentRuntime)
    ? (body.runtime as AgentRuntime)
    : "direct";

  setAgentConfig(id, {
    live: body.live !== false,
    runtime,
    command: (body.command ?? "").toString().trim(),
    cwd: (body.cwd ?? "").toString().trim(),
    args: Array.isArray(body.args) ? body.args.map(String) : [],
    baseUrl: (body.baseUrl ?? "").toString().trim(),
    model: (body.model ?? "").toString().trim(),
    apiKey: (body.apiKey ?? "").toString().trim(),
  });

  return Response.json(
    { id, config: getAgentConfig(id) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
