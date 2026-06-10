import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { readConfig, writeConfig } from "./config";

// Server-side writer for your Obsidian vault. Everything the OS produces —
// chats, goals, journal entries — is appended into one markdown file per day
// inside an "Agentic OS" folder in the vault. Append writes are serialized
// through a queue so concurrent saves never clobber each other.

const SUBFOLDER = "Agentic OS";
const DEFAULT_VAULT = "/Users/yourname/Documents/ObsidianVault";

export type EntryType = "chat" | "goal" | "journal";
export type Priority = "high" | "medium" | "low";

export interface VaultEntry {
  type: EntryType;
  text?: string; // goal / journal body
  agent?: string; // chat: agent name
  user?: string; // chat: user message
  assistant?: string; // chat: agent reply
  priority?: Priority; // goal: optional priority
  due?: string; // goal: optional YYYY-MM-DD due date
}

// Obsidian Tasks-plugin compatible priority emoji.
const PRIORITY_EMOJI: Record<Priority, string> = {
  high: "⏫",
  medium: "🔼",
  low: "🔽",
};

function expandHome(p: string): string {
  if (p.startsWith("~")) return path.join(os.homedir(), p.slice(1));
  return p;
}

function configuredPath(): string | null {
  const v = readConfig().vaultPath;
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/** Persist the vault path chosen in the UI (merges with other settings). */
export function setVaultPath(p: string): void {
  writeConfig({ vaultPath: p.trim() });
}

export function vaultRoot(): string {
  return expandHome(
    configuredPath() || process.env.OBSIDIAN_VAULT_PATH || DEFAULT_VAULT,
  );
}

export function folderPath(): string {
  return path.join(vaultRoot(), SUBFOLDER);
}

/** True while the path still points at the literal placeholder username. */
export function isPlaceholder(): boolean {
  const r = vaultRoot();
  return r.includes("/yourname/") || r.includes("\\yourname\\");
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function dateKey(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function clock(d = new Date()): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function prettyDate(d = new Date()): string {
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function dailyFile(d = new Date()): string {
  return path.join(folderPath(), `${dateKey(d)}.md`);
}

const SECTIONS: { type: EntryType | "all"; header: string }[] = [
  { type: "goal", header: "## 🎯 Goals" },
  { type: "journal", header: "## 📓 Journal" },
  { type: "chat", header: "## 💬 Chat Log" },
];

function scaffold(d = new Date()): string {
  return [
    "---",
    `date: ${dateKey(d)}`,
    "tags: [agentic-os]",
    "---",
    "",
    `# Agentic OS — ${prettyDate(d)}`,
    "",
    "## 🎯 Goals",
    "",
    "## 📓 Journal",
    "",
    "## 💬 Chat Log",
    "",
  ].join("\n");
}

function escape(s: string): string {
  return s.replace(/\r/g, "").trim();
}

function renderEntry(entry: VaultEntry): { header: string; block: string } {
  const t = clock();
  switch (entry.type) {
    case "goal": {
      const meta: string[] = [];
      if (entry.priority) meta.push(PRIORITY_EMOJI[entry.priority]);
      if (entry.due && /^\d{4}-\d{2}-\d{2}$/.test(entry.due)) {
        meta.push(`📅 ${entry.due}`);
      }
      const tail = meta.length ? ` ${meta.join(" ")}` : "";
      return {
        header: "## 🎯 Goals",
        block: `- [ ] ${escape(entry.text ?? "")}${tail}  _(${t})_\n`,
      };
    }
    case "journal":
      return {
        header: "## 📓 Journal",
        block: `\n### ${t}\n\n${escape(entry.text ?? "")}\n`,
      };
    case "chat":
      return {
        header: "## 💬 Chat Log",
        block:
          `\n### ${t} · ${escape(entry.agent ?? "Agent")}\n\n` +
          `**You:** ${escape(entry.user ?? "")}\n\n` +
          `**${escape(entry.agent ?? "Agent")}:** ${escape(entry.assistant ?? "")}\n`,
      };
  }
}

/** Insert a block at the end of its section (just before the next "## "). */
function insertIntoSection(content: string, header: string, block: string): string {
  const lines = content.split("\n");
  const start = lines.findIndex((l) => l.trim() === header);
  if (start === -1) {
    // Section missing — append a fresh section at the end.
    return `${content.replace(/\s*$/, "")}\n\n${header}\n${block}\n`;
  }
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) {
      end = i;
      break;
    }
  }
  // Trim trailing blank lines within the section, then insert.
  let insertAt = end;
  while (insertAt - 1 > start && lines[insertAt - 1].trim() === "") insertAt--;
  lines.splice(insertAt, 0, ...block.split("\n"));
  return lines.join("\n");
}

// Serialize all writes.
let chain: Promise<unknown> = Promise.resolve();
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.catch(() => {});
  return run;
}

export interface SaveResult {
  ok: boolean;
  file?: string;
  relativeFile?: string;
  error?: string;
}

export async function appendEntry(entry: VaultEntry): Promise<SaveResult> {
  if (isPlaceholder()) {
    return {
      ok: false,
      error:
        "Vault path is unset. Set OBSIDIAN_VAULT_PATH to your real vault (replace 'yourname').",
    };
  }
  return enqueue(async () => {
    try {
      await fs.mkdir(folderPath(), { recursive: true });
      await ensureTodayUnqueued();
      const file = dailyFile();
      let content: string;
      try {
        content = await fs.readFile(file, "utf8");
      } catch {
        content = scaffold();
      }
      const { header, block } = renderEntry(entry);
      content = insertIntoSection(content, header, block);
      // Collapse runs of blank lines so the note stays tidy as it grows.
      content = content.replace(/\n{3,}/g, "\n\n").replace(/\s*$/, "\n");
      await fs.writeFile(file, content, "utf8");
      return {
        ok: true,
        file,
        relativeFile: path.join(SUBFOLDER, path.basename(file)),
      };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? "write failed" };
    }
  });
}

/** Toggle the Nth checkbox in today's Goals section. */
export async function setGoalChecked(
  index: number,
  done: boolean,
): Promise<SaveResult> {
  if (isPlaceholder()) {
    return { ok: false, error: "Vault path is unset." };
  }
  return enqueue(async () => {
    try {
      const file = dailyFile();
      const content = await fs.readFile(file, "utf8");
      const lines = content.split("\n");
      const start = lines.findIndex((l) => l.trim() === "## 🎯 Goals");
      if (start === -1) return { ok: false, error: "No goals section." };

      let count = -1;
      for (let i = start + 1; i < lines.length; i++) {
        if (lines[i].startsWith("## ")) break;
        const m = lines[i].match(/^- \[[ xX]\] (.*)$/);
        if (m) {
          count++;
          if (count === index) {
            lines[i] = `- [${done ? "x" : " "}] ${m[1]}`;
            await fs.writeFile(file, lines.join("\n"), "utf8");
            return { ok: true, file };
          }
        }
      }
      return { ok: false, error: "Goal not found." };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? "write failed" };
    }
  });
}

/* ---------- Carry-over of unfinished tasks ---------- */

const CARRY_MARKER = "<!-- carried -->";

async function listDailyKeys(): Promise<string[]> {
  try {
    const names = await fs.readdir(folderPath());
    return names
      .filter((n) => /^\d{4}-\d{2}-\d{2}\.md$/.test(n))
      .map((n) => n.replace(/\.md$/, ""))
      .sort();
  } catch {
    return [];
  }
}

function goalLines(md: string, onlyUnchecked = false): string[] {
  const lines = md.split("\n");
  const start = lines.findIndex((l) => l.trim() === "## 🎯 Goals");
  if (start === -1) return [];
  const out: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) break;
    const m = lines[i].match(onlyUnchecked ? /^- \[ \] (.*)$/ : /^- \[[ xX]\] (.*)$/);
    if (m) out.push(m[1]);
  }
  return out;
}

function stripCreationTime(s: string): string {
  return s.replace(/\s*_\([^)]*\)_\s*$/, "").trim();
}

/** Normalized goal text (no priority/due/time meta) for de-duplication. */
function goalKey(content: string): string {
  return stripCreationTime(content)
    .replace(/[⏫🔼🔽]/g, "")
    .replace(/📅\s*\d{4}-\d{2}-\d{2}/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function withMarker(content: string): string {
  if (content.includes(CARRY_MARKER)) return content;
  const lines = content.split("\n");
  const start = lines.findIndex((l) => l.trim() === "## 🎯 Goals");
  if (start === -1) return content;
  lines.splice(start + 1, 0, CARRY_MARKER);
  return lines.join("\n");
}

// Rolls unchecked goals from the most recent previous day into today, once.
// Idempotent via CARRY_MARKER. Does not create an empty note just from viewing.
async function ensureTodayUnqueued(): Promise<void> {
  if (isPlaceholder()) return;
  const file = dailyFile();
  let content: string | null = null;
  try {
    content = await fs.readFile(file, "utf8");
  } catch {
    content = null;
  }
  if (content && content.includes(CARRY_MARKER)) return;

  const today = dateKey();
  const prev = (await listDailyKeys()).filter((d) => d < today).reverse();
  let carried: string[] = [];
  for (const d of prev) {
    const md = await fs
      .readFile(path.join(folderPath(), `${d}.md`), "utf8")
      .catch(() => "");
    const u = goalLines(md, true);
    if (u.length) {
      carried = u;
      break;
    }
  }

  // Don't materialize an empty file just because the page was opened.
  if (content === null && carried.length === 0) return;

  let base = withMarker(content ?? scaffold());
  const seen = new Set(goalLines(base).map(goalKey));
  for (const c of carried) {
    const key = goalKey(c);
    if (seen.has(key)) continue;
    seen.add(key);
    base = insertIntoSection(
      base,
      "## 🎯 Goals",
      `- [ ] ${stripCreationTime(c)}  _(carried)_\n`,
    );
  }
  base = base.replace(/\n{3,}/g, "\n\n").replace(/\s*$/, "\n");
  await fs.mkdir(folderPath(), { recursive: true });
  await fs.writeFile(file, base, "utf8");
}

/* ---------- Calendar / streak ---------- */

export interface DaySummary {
  date: string;
  goals: number;
  goalsDone: number;
  journal: number;
  chats: number;
}

function sectionLines(md: string, header: string): string[] {
  const lines = md.split("\n");
  const start = lines.findIndex((l) => l.trim() === header);
  if (start === -1) return [];
  const out: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) break;
    out.push(lines[i]);
  }
  return out;
}

function summarize(date: string, md: string): DaySummary {
  const goals = goalLines(md);
  const goalsDone = md
    .split("\n")
    .filter((l) => /^- \[[xX]\] /.test(l)).length;
  const journal = sectionLines(md, "## 📓 Journal").filter((l) =>
    /^### \d{2}:\d{2}\b/.test(l),
  ).length;
  const chats = sectionLines(md, "## 💬 Chat Log").filter((l) =>
    /^### /.test(l),
  ).length;
  return { date, goals: goals.length, goalsDone, journal, chats };
}

function computeStreak(days: DaySummary[]): number {
  const active = new Set(
    days.filter((d) => d.goals + d.journal + d.chats > 0).map((d) => d.date),
  );
  const d = new Date();
  if (!active.has(dateKey(d))) d.setDate(d.getDate() - 1);
  let streak = 0;
  while (active.has(dateKey(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export async function listDays(): Promise<{ days: DaySummary[]; streak: number }> {
  if (isPlaceholder()) return { days: [], streak: 0 };
  const keys = await listDailyKeys();
  const days: DaySummary[] = [];
  for (const k of keys) {
    const md = await fs
      .readFile(path.join(folderPath(), `${k}.md`), "utf8")
      .catch(() => "");
    if (md) days.push(summarize(k, md));
  }
  return { days, streak: computeStreak(days) };
}

export async function readDay(date: string): Promise<string> {
  if (isPlaceholder() || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return "";
  return fs
    .readFile(path.join(folderPath(), `${date}.md`), "utf8")
    .catch(() => "");
}

export interface VaultStatus {
  configured: boolean;
  vaultRoot: string;
  folder: string;
  vaultExists: boolean;
  writable: boolean;
  todayFile: string;
  todayMarkdown: string;
  hint?: string;
}

export async function readStatus(): Promise<VaultStatus> {
  const root = vaultRoot();
  const folder = folderPath();
  const file = dailyFile();
  const placeholder = isPlaceholder();

  let vaultExists = false;
  let writable = false;
  let todayMarkdown = "";

  if (!placeholder) {
    try {
      await fs.access(root);
      vaultExists = true;
    } catch {
      vaultExists = false;
    }
    try {
      await fs.mkdir(folder, { recursive: true });
      await fs.access(folder);
      writable = true;
    } catch {
      writable = false;
    }
    // Roll yesterday's unfinished tasks into today (idempotent), then read.
    await enqueue(() => ensureTodayUnqueued().catch(() => {}));
    try {
      todayMarkdown = await fs.readFile(file, "utf8");
    } catch {
      todayMarkdown = "";
    }
  }

  return {
    configured: !placeholder,
    vaultRoot: root,
    folder,
    vaultExists,
    writable,
    todayFile: path.join(SUBFOLDER, `${dateKey()}.md`),
    todayMarkdown,
    hint: placeholder
      ? "Set the OBSIDIAN_VAULT_PATH environment variable to your vault path."
      : !vaultExists
        ? "That vault folder doesn't exist yet on this machine — check the path."
        : undefined,
  };
}
