import { spawn, type SpawnOptions } from "node:child_process";
import { getAgentConfig, type AgentConfig } from "./config";

// Generic bridge to a user-configured agent backend (e.g. Hermes). Launches
// the configured command, writes the user's message to its stdin, and streams
// whatever it prints on stdout back as the reply — the same CLI contract the
// Claude bridge uses, but transport-agnostic and plain-text.

export type AgentEvent =
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };

export interface ChatTurn {
  role: "user" | "assistant" | "system";
  content: string;
}

const IS_WIN = process.platform === "win32";

/**
 * Streams a reply from an OpenAI-compatible chat endpoint (Hermes' API server,
 * Ollama, LM Studio, etc.). Yields text deltas as they arrive.
 */
async function* runHttpAgent(
  id: string,
  cfg: { baseUrl?: string; model?: string; apiKey?: string },
  messages: ChatTurn[],
  signal?: AbortSignal,
): AsyncGenerator<AgentEvent> {
  const base = (cfg.baseUrl ?? "").trim().replace(/\/+$/, "");
  if (!base) {
    yield { type: "error", message: `${id} has no endpoint URL configured.` };
    return;
  }
  const url = /\/chat\/completions$/.test(base) ? base : `${base}/chat/completions`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: cfg.model || "default",
        messages,
        stream: true,
      }),
      signal,
    });
  } catch (e: any) {
    yield {
      type: "error",
      message: `Couldn't reach ${id} at ${url}. Is its API server running and reachable? (${e?.message ?? "fetch failed"})`,
    };
    return;
  }

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    yield {
      type: "error",
      message: `${id} endpoint returned ${res.status}. ${detail.slice(0, 200)}`.trim(),
    };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let any = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const json = JSON.parse(payload);
          const delta =
            json.choices?.[0]?.delta?.content ??
            json.choices?.[0]?.message?.content ??
            "";
          if (delta) {
            any = true;
            yield { type: "delta", text: delta };
          }
        } catch {
          /* ignore keep-alive / partial lines */
        }
      }
    }
  } catch (e: any) {
    if (e?.name !== "AbortError") {
      yield { type: "error", message: `Stream error from ${id}: ${e?.message ?? "unknown"}` };
      return;
    }
  }

  if (!any) {
    yield {
      type: "error",
      message: `${id} returned no content. Check the model name ("${cfg.model}") is correct for this endpoint.`,
    };
    return;
  }
  yield { type: "done" };
}

function singleQuote(s: string): string {
  // POSIX-safe single quoting for embedding in a bash -lc string.
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

/** Build the spawn invocation for the agent's runtime. */
function buildSpawn(cfg: AgentConfig): { cmd: string; args: string[]; opts: SpawnOptions } {
  const command = (cfg.command ?? "").trim();
  const extra = (cfg.args ?? []).join(" ");
  const cwd = cfg.cwd?.trim();

  if (cfg.runtime === "wsl") {
    // Launch inside WSL via a login shell so the agent is found on the WSL PATH.
    const cdPart = cwd ? `cd ${singleQuote(cwd)} && ` : "";
    const script = `${cdPart}exec ${command} ${extra}`.trim();
    return { cmd: "wsl.exe", args: ["bash", "-lc", script], opts: { stdio: ["pipe", "pipe", "pipe"] } };
  }

  // windows / direct: run the command itself (shell resolves PATH + .cmd/.exe).
  return {
    cmd: command,
    args: cfg.args ?? [],
    opts: {
      stdio: ["pipe", "pipe", "pipe"],
      shell: true,
      cwd: cwd || undefined,
    },
  };
}

export async function* runAgent(
  id: string,
  prompt: string,
  signal?: AbortSignal,
  history?: ChatTurn[],
): AsyncGenerator<AgentEvent> {
  const cfg = getAgentConfig(id);
  if (!cfg?.live) {
    yield { type: "error", message: `${id} has no connected backend.` };
    return;
  }

  // HTTP / OpenAI-compatible endpoint (the right path for TUI agents like
  // Hermes, which expose an API server).
  if (cfg.runtime === "openai") {
    const messages: ChatTurn[] =
      history && history.length
        ? history
        : [{ role: "user", content: prompt }];
    yield* runHttpAgent(id, cfg, messages, signal);
    return;
  }

  if (!cfg.command?.trim()) {
    yield { type: "error", message: `${id} has no command configured.` };
    return;
  }

  const { cmd, args, opts } = buildSpawn(cfg);

  let child;
  try {
    child = spawn(cmd, args, { ...opts, env: process.env });
  } catch (e: any) {
    yield { type: "error", message: `Failed to launch ${id}: ${e?.message ?? "spawn error"}` };
    return;
  }

  const abort = () => child.kill("SIGTERM");
  signal?.addEventListener("abort", abort);

  child.stdin?.on("error", () => {});
  child.stdin?.write(prompt + "\n");
  child.stdin?.end();

  const queue: AgentEvent[] = [];
  let resolveNext: (() => void) | null = null;
  let finished = false;
  let stderr = "";
  let spawnError: string | null = null;
  let sawOutput = false;

  const push = (e: AgentEvent) => {
    queue.push(e);
    resolveNext?.();
    resolveNext = null;
  };

  child.stdout?.on("data", (c: Buffer) => {
    sawOutput = true;
    push({ type: "delta", text: c.toString() });
  });
  child.stderr?.on("data", (c: Buffer) => {
    stderr += c.toString();
  });
  child.on("error", (err) => {
    spawnError = (err as Error).message;
    finished = true;
    resolveNext?.();
  });
  child.on("close", (code) => {
    if (code && code !== 0 && !sawOutput) {
      push({
        type: "error",
        message:
          stderr.trim() ||
          `${id} exited with code ${code}. Check the command, working directory, and that WSL is installed if used.`,
      });
    } else {
      push({ type: "done" });
    }
    finished = true;
    resolveNext?.();
  });

  try {
    while (true) {
      if (queue.length === 0) {
        if (finished) break;
        await new Promise<void>((res) => (resolveNext = res));
      }
      while (queue.length > 0) yield queue.shift()!;
      if (spawnError) {
        const enoent = /ENOENT/.test(spawnError);
        yield {
          type: "error",
          message: enoent
            ? `Couldn't launch ${id}. ${cfg.runtime === "wsl" ? "Is WSL installed and is the command on your WSL PATH?" : "Check the command/path."}`
            : `Failed to launch ${id}: ${spawnError}`,
        };
        break;
      }
    }
  } finally {
    signal?.removeEventListener("abort", abort);
    if (!child.killed) child.kill("SIGTERM");
  }
}
