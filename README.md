<div align="center">

# ✦ NEXUS OS

### A dopamine-inducing mission control dashboard for Claude & your AI agent fleet

Next.js · Tailwind CSS · Framer Motion · Claude Code CLI bridge

</div>

---

Nexus OS is a locally-hosted operating system for your agents. It wires a
**gorgeous, animated mission-control UI** directly to the **Claude Code CLI**
running on your machine — and gives every other agent in your fleet
(OpenClaw, Hermes, Atlas, Orion) its own themed control section.

## ✨ Features

- **Live Claude bridge** — the Claude console talks to your local `claude`
  binary in streaming print mode. Tokens stream in real time, with live
  session continuity, model switching (Opus/Sonnet/Haiku), tool-use chips,
  and per-turn cost / latency / token telemetry.
- **Mission Control** — real host telemetry (CPU, memory, uptime, load avg)
  rendered as animated radial gauges, plus a live agent-fleet grid, drifting
  sparklines, and a rolling activity stream.
- **Per-agent sections** — each non-Claude agent gets its own accent-themed
  panel with gauges, a capability matrix, power controls (pause / resume /
  restart), and a command console scaffolded for its own future bridge.
- **Dopamine by design** — animated boot sequence, aurora + starfield
  background, glassmorphism, gradient text, spring transitions, and a
  texture/noise overlay throughout.

## 🚀 Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

You need the **Claude Code CLI** installed and authenticated on the same
machine (`claude --version` should work). The bridge invokes it under the
hood.

```bash
npm run build && npm run start   # production build
```

## 🔌 How the Claude bridge works

```
Browser ──fetch(SSE)──▶ /api/claude ──spawn──▶ claude --print
                                                 --output-format stream-json
                                                 --include-partial-messages
                            ◀── normalized events: init · delta · tool · done
```

- `src/lib/claude-bridge.ts` — spawns the CLI, parses its stream-json output,
  and yields normalized events.
- `src/app/api/claude/route.ts` — exposes the bridge as a Server-Sent Events
  endpoint.
- `src/hooks/useClaudeStream.ts` — client hook that posts prompts and renders
  streaming deltas.

### Configuration (env vars)

| Variable | Default | Purpose |
| --- | --- | --- |
| `CLAUDE_BIN` | `claude` | Path to the Claude Code CLI binary. |
| `CLAUDE_PERMISSION_MODE` | `dontAsk` | CLI `--permission-mode` so the bridge runs unattended. |

## 🛰 Adding a real bridge for another agent

The non-Claude agents are scaffolded. To make one live, add an API route that
mirrors `src/app/api/claude/route.ts`, point its console at it, and flip
`live: true` in `src/lib/agents.ts`.

## 🗂 Project structure

```
src/
  app/
    layout.tsx            # fonts, aurora + starfield + noise background
    page.tsx              # boot → sidebar + animated section switcher
    api/claude/route.ts   # SSE bridge to the Claude Code CLI
    api/system/route.ts   # live host telemetry
  components/
    BootSequence.tsx      # animated startup
    Sidebar.tsx           # fleet navigation rail
    MissionControl.tsx    # dashboard: gauges, fleet grid, activity
    ClaudeConsole.tsx     # live streaming chat
    AgentPanel.tsx        # per-agent control surface
    widgets.tsx           # gauges, sparklines, animated numbers, glass cards
  hooks/                  # useClaudeStream · useSystemStats · useFleetMetrics
  lib/                    # agent registry · CLI bridge · formatters
```

Built to be hacked on. Make it yours.
