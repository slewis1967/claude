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

const IS_WIN = process.platform === "win32";

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
): AsyncGenerator<AgentEvent> {
  const cfg = getAgentConfig(id);
  if (!cfg?.live || !cfg.command?.trim()) {
    yield { type: "error", message: `${id} has no connected backend.` };
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
