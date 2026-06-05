import { spawn } from "node:child_process";

// Server-side bridge to the Claude Code CLI. We invoke the real `claude`
// binary in non-interactive print mode and stream its structured JSON output
// back so the dashboard can render tokens as they arrive.

export interface BridgeOptions {
  prompt: string;
  /** Resume an existing CLI session for multi-turn continuity. */
  sessionId?: string;
  /** Model alias or full id, e.g. "opus", "sonnet", "claude-opus-4-8". */
  model?: string;
  /** Abort signal wired to the HTTP request lifecycle. */
  signal?: AbortSignal;
}

export type BridgeEvent =
  | { type: "init"; sessionId: string; model: string; tools: string[]; cwd: string }
  | { type: "delta"; text: string }
  | { type: "tool"; name: string; input: unknown }
  | {
      type: "done";
      sessionId: string;
      result: string;
      costUsd?: number;
      durationMs?: number;
      numTurns?: number;
      usage?: unknown;
    }
  | { type: "error"; message: string };

const CLAUDE_BIN = process.env.CLAUDE_BIN || "claude";
// "dontAsk" lets the bridge run unattended without hanging on tool prompts.
const PERMISSION_MODE = process.env.CLAUDE_PERMISSION_MODE || "dontAsk";

// On Windows the CLI is a `claude.cmd` shim, which Node's spawn can't launch
// directly — it needs a shell to resolve it. We only ever pass fixed/validated
// flags through the shell (the user's prompt goes via stdin), so this is safe.
const IS_WIN = process.platform === "win32";

/** Allow only safe characters for values that may pass through a shell. */
function safeArg(v: string | undefined, re: RegExp): string | undefined {
  return v && re.test(v) ? v : undefined;
}

/**
 * Spawns the CLI and yields normalized bridge events as an async generator.
 */
export async function* runClaude(
  opts: BridgeOptions,
): AsyncGenerator<BridgeEvent> {
  const args = [
    "--print",
    "--output-format",
    "stream-json",
    "--include-partial-messages",
    "--verbose",
    "--permission-mode",
    PERMISSION_MODE,
  ];

  const model = safeArg(opts.model, /^[a-zA-Z0-9._-]+$/);
  const session = safeArg(opts.sessionId, /^[a-zA-Z0-9-]+$/);
  if (model) args.push("--model", model);
  if (session) args.push("--resume", session);
  // The prompt is written to stdin (never the argv/shell) to avoid any quoting
  // or injection issues and to work identically across platforms.

  const child = spawn(CLAUDE_BIN, args, {
    env: process.env,
    stdio: ["pipe", "pipe", "pipe"],
    shell: IS_WIN,
  });

  // Feed the prompt over stdin, then close it so the CLI runs the single turn.
  child.stdin?.on("error", () => {});
  child.stdin?.write(opts.prompt);
  child.stdin?.end();

  const abort = () => child.kill("SIGTERM");
  opts.signal?.addEventListener("abort", abort);

  let stderr = "";
  child.stderr.on("data", (d) => {
    stderr += d.toString();
  });

  // Bridge the event-emitter stdout into an async queue we can `for await`.
  const queue: BridgeEvent[] = [];
  let resolveNext: (() => void) | null = null;
  let finished = false;
  let spawnError: string | null = null;

  const push = (e: BridgeEvent) => {
    queue.push(e);
    resolveNext?.();
    resolveNext = null;
  };

  let buffer = "";
  child.stdout.on("data", (chunk: Buffer) => {
    buffer += chunk.toString();
    let idx: number;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;
      const ev = parseCliLine(line);
      if (ev) push(ev);
    }
  });

  child.on("error", (err) => {
    spawnError = (err as Error).message;
    finished = true;
    resolveNext?.();
    resolveNext = null;
  });

  child.on("close", (code) => {
    if (buffer.trim()) {
      const ev = parseCliLine(buffer.trim());
      if (ev) queue.push(ev);
    }
    if (code && code !== 0 && !queue.some((e) => e.type === "done")) {
      queue.push({
        type: "error",
        message:
          stderr.trim() ||
          `Claude CLI exited with code ${code}. Is the \`claude\` binary on PATH and authenticated?`,
      });
    }
    finished = true;
    resolveNext?.();
    resolveNext = null;
  });

  try {
    while (true) {
      if (queue.length === 0) {
        if (finished) break;
        await new Promise<void>((res) => (resolveNext = res));
      }
      while (queue.length > 0) {
        yield queue.shift()!;
      }
      if (spawnError) {
        const enoent = /ENOENT/.test(spawnError);
        yield {
          type: "error",
          message: enoent
            ? "Claude Code CLI not found. Install it with `npm install -g @anthropic-ai/claude-code`, then run `claude` once to sign in. (Set CLAUDE_BIN to its full path if it lives elsewhere.)"
            : `Failed to launch Claude CLI: ${spawnError}`,
        };
        break;
      }
    }
  } finally {
    opts.signal?.removeEventListener("abort", abort);
    if (!child.killed) child.kill("SIGTERM");
  }
}

/** Translates a single stream-json line from the CLI into a BridgeEvent. */
function parseCliLine(line: string): BridgeEvent | null {
  let msg: any;
  try {
    msg = JSON.parse(line);
  } catch {
    return null;
  }

  switch (msg.type) {
    case "system":
      if (msg.subtype === "init") {
        return {
          type: "init",
          sessionId: msg.session_id ?? "",
          model: msg.model ?? "",
          tools: Array.isArray(msg.tools) ? msg.tools : [],
          cwd: msg.cwd ?? "",
        };
      }
      return null;

    case "stream_event": {
      const event = msg.event;
      if (event?.type === "content_block_delta") {
        const delta = event.delta;
        if (delta?.type === "text_delta" && typeof delta.text === "string") {
          return { type: "delta", text: delta.text };
        }
      }
      return null;
    }

    case "assistant": {
      // Surface tool-use blocks so the UI can show what Claude reached for.
      const blocks = msg.message?.content;
      if (Array.isArray(blocks)) {
        for (const b of blocks) {
          if (b?.type === "tool_use") {
            return { type: "tool", name: b.name, input: b.input };
          }
        }
      }
      return null;
    }

    case "result":
      return {
        type: "done",
        sessionId: msg.session_id ?? "",
        result: typeof msg.result === "string" ? msg.result : "",
        costUsd: msg.total_cost_usd,
        durationMs: msg.duration_ms,
        numTurns: msg.num_turns,
        usage: msg.usage,
      };

    default:
      return null;
  }
}

/** Returns the installed CLI version string, or null if unavailable. */
export async function getClaudeVersion(): Promise<string | null> {
  return new Promise((resolve) => {
    const child = spawn(CLAUDE_BIN, ["--version"], {
      stdio: ["ignore", "pipe", "ignore"],
      shell: IS_WIN,
    });
    let out = "";
    child.stdout.on("data", (d) => (out += d.toString()));
    child.on("error", () => resolve(null));
    child.on("close", () => resolve(out.trim() || null));
  });
}
