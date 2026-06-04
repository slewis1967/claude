"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUp,
  RotateCcw,
  Square,
  Wrench,
  Cpu,
  Zap,
  Clock,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useClaudeStream, type ChatMessage } from "@/hooks/useClaudeStream";
import { formatCost, formatMs } from "@/lib/format";
import { GlassCard } from "./widgets";

const MODELS = [
  { id: "", label: "Default" },
  { id: "opus", label: "Opus" },
  { id: "sonnet", label: "Sonnet" },
  { id: "haiku", label: "Haiku" },
];

const SUGGESTIONS = [
  "Summarize what you can do as my mission-control core.",
  "Write a haiku about a fleet of AI agents.",
  "List the git status of this project.",
  "Explain the Claude Code CLI bridge in one paragraph.",
];

export default function ClaudeConsole() {
  const [model, setModel] = useState("");
  const { messages, busy, sessionId, model: liveModel, send, stop, reset } =
    useClaudeStream(model || undefined);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const submit = () => {
    if (!input.trim() || busy) return;
    send(input);
    setInput("");
  };

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-plasma-deep via-plasma to-plasma-soft text-2xl shadow-glow">
            ✦
          </div>
          <div>
            <h2 className="text-xl font-bold">Claude</h2>
            <p className="flex items-center gap-2 text-xs text-white/45">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-lime shadow-[0_0_8px_#9eff5a]" />
              Live CLI bridge
              {liveModel && (
                <span className="font-mono text-white/35">· {liveModel}</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
            {MODELS.map((m) => (
              <button
                key={m.id}
                onClick={() => setModel(m.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  model === m.id
                    ? "bg-plasma/25 text-white"
                    : "text-white/45 hover:text-white/70"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <button
            onClick={reset}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/50 transition-colors hover:text-white"
            title="New session"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <GlassCard hover={false} className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
        <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <EmptyState onPick={(s) => send(s)} />
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((m) => (
                <Bubble key={m.id} msg={m} />
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-white/5 p-4">
          <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2 transition-colors focus-within:border-plasma/50">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={1}
              placeholder="Message Claude…  (Enter to send, Shift+Enter for newline)"
              className="max-h-40 flex-1 resize-none bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none"
            />
            {busy ? (
              <button
                onClick={stop}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ember/20 text-ember transition-transform hover:scale-105"
                title="Stop"
              >
                <Square size={16} fill="currentColor" />
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={!input.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-plasma to-plasma-deep text-white shadow-glow transition-transform hover:scale-105 disabled:opacity-30 disabled:shadow-none"
                title="Send"
              >
                <ArrowUp size={18} />
              </button>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between px-1 text-[10px] text-white/30">
            <span className="font-mono">
              {sessionId
                ? `session ${sessionId.slice(0, 8)}…`
                : "no active session"}
            </span>
            <span>powered by the Claude Code CLI</span>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (s: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center py-10 text-center">
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-plasma-deep via-plasma to-flux text-4xl shadow-glow"
      >
        ✦
      </motion.div>
      <h3 className="mb-1 text-lg font-semibold">Talk to your Claude</h3>
      <p className="mb-6 max-w-sm text-sm text-white/45">
        This console is wired straight to the Claude Code CLI on this machine.
        Ask anything — responses stream in live.
      </p>
      <div className="grid w-full max-w-xl gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="glass-hover rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 text-left text-xs text-white/60 transition-colors hover:text-white"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
          isUser
            ? "bg-white/8 text-white/70"
            : "bg-gradient-to-br from-plasma-deep via-plasma to-flux text-white shadow-glow"
        }`}
      >
        {isUser ? "You" : "✦"}
      </div>
      <div className={`min-w-0 max-w-[78%] ${isUser ? "items-end" : ""}`}>
        {msg.tools && msg.tools.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {msg.tools.map((t, i) => (
              <span
                key={i}
                className="flex items-center gap-1 rounded-lg border border-flux/30 bg-flux/10 px-2 py-1 text-[10px] font-medium text-flux"
              >
                <Wrench size={10} /> {t.name}
              </span>
            ))}
          </div>
        )}
        <div
          className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-plasma/20 text-white"
              : "border border-white/8 bg-white/[0.03] text-white/85"
          } ${msg.streaming && !msg.content ? "caret" : ""}`}
        >
          {msg.content}
          {msg.streaming && msg.content && (
            <span className="caret" aria-hidden />
          )}
        </div>
        {msg.meta && (msg.meta.costUsd != null || msg.meta.durationMs != null) && (
          <div className="mt-2 flex flex-wrap gap-3 px-1 text-[10px] text-white/35">
            {msg.meta.durationMs != null && (
              <span className="flex items-center gap-1">
                <Clock size={10} /> {formatMs(msg.meta.durationMs)}
              </span>
            )}
            {msg.meta.costUsd != null && (
              <span className="flex items-center gap-1">
                <Zap size={10} /> {formatCost(msg.meta.costUsd)}
              </span>
            )}
            {msg.meta.numTurns != null && (
              <span className="flex items-center gap-1">
                <Cpu size={10} /> {msg.meta.numTurns} turns
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
