"use client";

import { motion } from "framer-motion";
import { Plug, X } from "lucide-react";
import { useState } from "react";
import type { AgentId, AgentDef } from "@/lib/agents";

export type AgentRuntime = "openai" | "wsl" | "windows" | "direct";

export interface AgentConn {
  live?: boolean;
  runtime?: AgentRuntime;
  command?: string;
  cwd?: string;
  args?: string[];
  baseUrl?: string;
  model?: string;
  apiKey?: string;
}

const RUNTIMES: { id: AgentRuntime; label: string; hint: string }[] = [
  { id: "openai", label: "HTTP API", hint: "An OpenAI-compatible endpoint (Hermes API server, Ollama, LM Studio…)" },
  { id: "wsl", label: "WSL / Linux", hint: "Spawns via `wsl` (use a /mnt/c/… path)" },
  { id: "windows", label: "Windows", hint: "A native .exe/.cmd (use a C:\\… path)" },
  { id: "direct", label: "Direct", hint: "Same OS as the app (mac/Linux)" },
];

// Inline panel to connect a real backend to an agent. Saves to .agentic-os.json
// via /api/agent/config and flips the agent live.
export function AgentConnect({
  agent,
  current,
  onClose,
  onSaved,
}: {
  agent: AgentDef;
  current: AgentConn | null;
  onClose: () => void;
  onSaved: (c: AgentConn) => void;
}) {
  const [runtime, setRuntime] = useState<AgentRuntime>(current?.runtime ?? "openai");
  const [command, setCommand] = useState(current?.command ?? "");
  const [cwd, setCwd] = useState(current?.cwd ?? "");
  const [args, setArgs] = useState((current?.args ?? []).join(" "));
  const [baseUrl, setBaseUrl] = useState(current?.baseUrl ?? "");
  const [model, setModel] = useState(current?.model ?? "");
  const [apiKey, setApiKey] = useState(current?.apiKey ?? "");
  const [busy, setBusy] = useState(false);

  const isHttp = runtime === "openai";
  const canConnect = isHttp ? !!baseUrl.trim() && !!model.trim() : !!command.trim();

  const post = async (live: boolean) => {
    setBusy(true);
    try {
      const res = await fetch("/api/agent/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: agent.id,
          live,
          runtime,
          command,
          cwd,
          args: args.trim() ? args.trim().split(/\s+/) : [],
          baseUrl,
          model,
          apiKey,
        }),
      });
      const data = await res.json();
      onSaved(data.config ?? null);
      if (live) onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="border-b border-white/[0.06] bg-white/[0.02]"
    >
      <div className="mx-auto max-w-3xl px-5 py-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Plug size={15} style={{ color: agent.accent }} />
            Connect {agent.name} to a real backend
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Runtime */}
        <div className="mb-3">
          <label className="text-[11px] uppercase tracking-wide text-white/40">Runtime</label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {RUNTIMES.map((r) => (
              <button
                key={r.id}
                onClick={() => setRuntime(r.id)}
                title={r.hint}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  borderColor: runtime === r.id ? `${agent.accent}88` : "rgba(255,255,255,0.12)",
                  background: runtime === r.id ? `${agent.accent}22` : "transparent",
                  color: runtime === r.id ? "#fff" : "rgba(255,255,255,0.55)",
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {isHttp ? (
          <>
            <Field label="Endpoint URL">
              <input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                spellCheck={false}
                placeholder="http://localhost:8080/v1"
                className="w-full rounded-lg border border-white/12 bg-black/30 px-3 py-2 font-mono text-xs text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none"
              />
            </Field>
            <Field label="Model">
              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                spellCheck={false}
                placeholder="qwen3.5:latest"
                className="w-full rounded-lg border border-white/12 bg-black/30 px-3 py-2 font-mono text-xs text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none"
              />
            </Field>
            <Field label="API key (optional)">
              <input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                spellCheck={false}
                type="password"
                placeholder="leave blank for local servers"
                className="w-full rounded-lg border border-white/12 bg-black/30 px-3 py-2 font-mono text-xs text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none"
              />
            </Field>
            <p className="mt-2 text-[11px] text-white/35">
              Nexus OS sends chats to this OpenAI-compatible endpoint and streams
              the reply back. For Hermes, start its API server and use that URL.
            </p>
          </>
        ) : (
          <>
            <Field label="Command">
              <input
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                spellCheck={false}
                placeholder="hermes"
                className="w-full rounded-lg border border-white/12 bg-black/30 px-3 py-2 font-mono text-xs text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none"
              />
            </Field>
            <Field label="Working directory">
              <input
                value={cwd}
                onChange={(e) => setCwd(e.target.value)}
                spellCheck={false}
                placeholder="/mnt/c/Users/You/AppData/Local/Hermes/hermes-agent"
                className="w-full rounded-lg border border-white/12 bg-black/30 px-3 py-2 font-mono text-xs text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none"
              />
            </Field>
            <Field label="Extra arguments (optional)">
              <input
                value={args}
                onChange={(e) => setArgs(e.target.value)}
                spellCheck={false}
                placeholder="--flag value"
                className="w-full rounded-lg border border-white/12 bg-black/30 px-3 py-2 font-mono text-xs text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none"
              />
            </Field>
            <p className="mt-2 text-[11px] text-white/35">
              Nexus OS launches this command and chats with it over stdin/stdout.
              Note: this only works for agents with a non-interactive print mode —
              not full-screen TUIs (use the HTTP API option for those).
            </p>
          </>
        )}

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => post(true)}
            disabled={!canConnect || busy}
            className="rounded-xl px-4 py-2 text-sm font-medium text-white transition-transform hover:scale-[1.03] disabled:opacity-40"
            style={{ background: agent.accent }}
          >
            {busy ? "Saving…" : current?.live ? "Update connection" : "Connect"}
          </button>
          {current?.live && (
            <button
              onClick={() => post(false)}
              disabled={busy}
              className="rounded-xl border border-white/12 px-4 py-2 text-sm font-medium text-white/60 hover:text-white"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2.5">
      <label className="text-[11px] uppercase tracking-wide text-white/40">{label}</label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

// Keep AgentId import meaningful for consumers.
export type { AgentId };
