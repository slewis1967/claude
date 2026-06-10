"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Plug, Plus, Square, Wrench, Zap, Clock } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useClaudeStream, type ChatMessage } from "@/hooks/useClaudeStream";
import { useAgentChat } from "@/hooks/useAgentChat";
import { useRealAgentChat } from "@/hooks/useRealAgentChat";
import { useDictation } from "@/hooks/useDictation";
import { useVaultAutosave } from "@/hooks/useVaultAutosave";
import { MicButton } from "./MicButton";
import { SavedBadge } from "./SavedBadge";
import { AgentConnect, type AgentConn } from "./AgentConnect";
import { getAgent, type AgentId } from "@/lib/agents";
import { formatCost, formatMs } from "@/lib/format";
import { Avatar } from "./logos";

export default function ChatView({ id }: { id: AgentId }) {
  const agent = getAgent(id)!;
  // Claude is the built-in live bridge; every other agent is configurable.
  return agent.live ? <LiveChat id={id} /> : <ConfigurableAgentChat id={id} />;
}

/* ---------- Configurable agents (simulated until a backend is connected) ---------- */

function ConfigurableAgentChat({ id }: { id: AgentId }) {
  const agent = getAgent(id)!;
  const [conn, setConn] = useState<AgentConn | null | undefined>(undefined); // undefined = loading
  const [showConnect, setShowConnect] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/agent/config?id=${id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => active && setConn(d.config ?? null))
      .catch(() => active && setConn(null));
    return () => {
      active = false;
    };
  }, [id]);

  const live =
    !!conn?.live &&
    (conn?.runtime === "openai" ? !!conn?.baseUrl : !!conn?.command);

  const connectButton = (
    <button
      onClick={() => setShowConnect((s) => !s)}
      className="flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-colors"
      style={{
        borderColor: live ? `${agent.accent}55` : "rgba(255,255,255,0.1)",
        background: live ? `${agent.accent}1a` : "rgba(255,255,255,0.03)",
        color: live ? agent.accent : "rgba(255,255,255,0.55)",
      }}
      title={live ? "Edit backend connection" : "Connect a real backend"}
    >
      <Plug size={14} />
      <span className="hidden sm:inline">{live ? "Connected" : "Connect"}</span>
    </button>
  );

  return (
    <div className="flex h-full flex-col">
      <AnimatePresence>
        {showConnect && (
          <AgentConnect
            agent={agent}
            current={conn ?? null}
            onClose={() => setShowConnect(false)}
            onSaved={(c) => setConn(c)}
          />
        )}
      </AnimatePresence>
      <div className="min-h-0 flex-1">
        {live ? (
          <RealAgentChat id={id} headerExtra={connectButton} />
        ) : (
          <SimChat id={id} headerExtra={connectButton} />
        )}
      </div>
    </div>
  );
}

function RealAgentChat({ id, headerExtra }: { id: AgentId; headerExtra?: React.ReactNode }) {
  const { messages, busy, send, stop, reset } = useRealAgentChat(id);
  return (
    <ChatPane
      id={id}
      messages={messages}
      busy={busy}
      typing={false}
      onSend={send}
      onStop={stop}
      onReset={reset}
      headerExtra={headerExtra}
      headerStatusOverride="connected backend"
    />
  );
}

/* ---------- Containers (own the hooks) ---------- */

const MODELS = [
  { id: "", label: "Default" },
  { id: "opus", label: "Opus" },
  { id: "sonnet", label: "Sonnet" },
  { id: "haiku", label: "Haiku" },
];

function LiveChat({ id }: { id: AgentId }) {
  const [model, setModel] = useState("");
  const { messages, busy, send, stop, reset, model: liveModel } =
    useClaudeStream(model || undefined);

  const headerExtra = (
    <div className="flex items-center gap-2">
      <div className="hidden rounded-xl border border-white/10 bg-white/[0.03] p-1 sm:flex">
        {MODELS.map((m) => (
          <button
            key={m.id}
            onClick={() => setModel(m.id)}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              model === m.id ? "bg-plasma/25 text-white" : "text-white/45 hover:text-white/70"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <ChatPane
      id={id}
      messages={messages}
      busy={busy}
      typing={false}
      onSend={send}
      onStop={stop}
      onReset={reset}
      headerExtra={headerExtra}
      headerStatusOverride={liveModel ?? undefined}
    />
  );
}

function SimChat({ id, headerExtra }: { id: AgentId; headerExtra?: React.ReactNode }) {
  const { messages, busy, typing, send, reset } = useAgentChat(id);
  return (
    <ChatPane
      id={id}
      messages={messages}
      busy={busy}
      typing={typing}
      onSend={send}
      onReset={reset}
      headerExtra={headerExtra}
    />
  );
}

/* ---------- Presentational pane ---------- */

function ChatPane({
  id,
  messages,
  busy,
  typing,
  onSend,
  onStop,
  onReset,
  headerExtra,
  headerStatusOverride,
}: {
  id: AgentId;
  messages: ChatMessage[];
  busy: boolean;
  typing: boolean;
  onSend: (s: string) => void;
  onStop?: () => void;
  onReset: () => void;
  headerExtra?: React.ReactNode;
  headerStatusOverride?: string;
}) {
  const agent = getAgent(id)!;
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Voice input via the browser's built-in speech recognition.
  const speech = useDictation(input, setInput);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const submit = () => {
    if (speech.listening) speech.stop();
    if (!input.trim() || busy) return;
    onSend(input);
    setInput("");
  };

  // Auto-save every completed turn into the Obsidian vault.
  const [savedAt, setSavedAt] = useState(0);
  useVaultAutosave(
    messages,
    busy,
    agent.name,
    useCallback(() => setSavedAt(Date.now()), []),
  );

  // For the live agent, an empty thread means "no messages yet".
  const showEmpty = agent.live ? messages.length === 0 : false;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-3.5">
        <div className="flex items-center gap-3">
          <Avatar
            id={id}
            accent={agent.accent}
            accentSoft={agent.accentSoft}
            size={40}
            online
          />
          <div>
            <div className="flex items-center gap-2 text-[15px] font-semibold leading-tight">
              {agent.name}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-white/45">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: "#34d399", boxShadow: "0 0 6px #34d399" }}
              />
              {headerStatusOverride
                ? `Live · ${headerStatusOverride}`
                : agent.live
                  ? agent.status
                  : `${agent.status} · ${agent.model}`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SavedBadge trigger={savedAt} />
          {headerExtra}
          <button
            onClick={onReset}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs font-medium text-white/55 transition-colors hover:text-white"
            title="New chat"
          >
            <Plus size={15} /> <span className="hidden sm:inline">New chat</span>
          </button>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6">
          {showEmpty ? (
            <EmptyState id={id} onPick={onSend} />
          ) : (
            <div className="space-y-5">
              <AnimatePresence initial={false}>
                {messages.map((m) => (
                  <Bubble key={m.id} id={id} msg={m} />
                ))}
              </AnimatePresence>
              {typing && <TypingBubble id={id} />}
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="px-4 pb-5 pt-2">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-2 shadow-lg transition-colors focus-within:border-white/25">
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
              placeholder={speech.listening ? "Listening… speak now" : `Message ${agent.name}…`}
              className="max-h-40 flex-1 resize-none bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none"
            />
            <MicButton
              listening={speech.listening}
              supported={speech.supported}
              onClick={speech.toggle}
            />
            {busy && onStop ? (
              <button
                onClick={onStop}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ember/20 text-ember transition-transform hover:scale-105"
                title="Stop"
              >
                <Square size={15} fill="currentColor" />
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={!input.trim() || busy}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white transition-transform hover:scale-105 disabled:opacity-30"
                style={{
                  background: `linear-gradient(140deg, ${agent.accent}, ${agent.accentSoft})`,
                }}
                title="Send"
              >
                <ArrowUp size={17} />
              </button>
            )}
          </div>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[10px] text-white/25">
            {speech.error ? (
              <span className="text-ember/80">{speech.error}</span>
            ) : speech.listening ? (
              <span className="flex items-center gap-1.5 text-ember">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-ember" />
                Listening — click the mic again to stop
              </span>
            ) : agent.live ? (
              "Connected to the Claude Code CLI · responses stream live"
            ) : (
              `${agent.name} runs on a local simulated bridge`
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ id, onPick }: { id: AgentId; onPick: (s: string) => void }) {
  const agent = getAgent(id)!;
  return (
    <div className="flex flex-col items-center pt-10 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 16 }}
      >
        <Avatar id={id} accent={agent.accent} accentSoft={agent.accentSoft} size={64} ring />
      </motion.div>
      <h2 className="mt-5 text-xl font-semibold">{agent.name}</h2>
      <p className="mt-1 max-w-md text-sm text-white/45">{agent.greeting}</p>
      <div className="mt-7 grid w-full max-w-xl gap-2 sm:grid-cols-2">
        {agent.prompts.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-left text-xs text-white/60 transition-all hover:border-white/20 hover:bg-white/[0.04] hover:text-white"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function Bubble({ id, msg }: { id: AgentId; msg: ChatMessage }) {
  const agent = getAgent(id)!;
  const isUser = msg.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      {isUser ? (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/8 text-xs font-semibold text-white/70">
          You
        </span>
      ) : (
        <Avatar id={id} accent={agent.accent} accentSoft={agent.accentSoft} size={36} />
      )}
      <div className={`min-w-0 max-w-[80%] ${isUser ? "items-end" : ""}`}>
        {msg.tools && msg.tools.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            {msg.tools.map((t, i) => (
              <span
                key={i}
                className="flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-medium"
                style={{ borderColor: `${agent.accent}40`, color: agent.accentSoft, background: `${agent.accent}12` }}
              >
                <Wrench size={10} /> {t.name}
              </span>
            ))}
          </div>
        )}
        <div
          className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser ? "text-white" : "border border-white/[0.06] bg-white/[0.035] text-white/90"
          } ${msg.streaming && !msg.content ? "caret" : ""}`}
          style={
            isUser
              ? { background: `linear-gradient(140deg, ${agent.accent}cc, ${agent.accent}99)` }
              : undefined
          }
        >
          {msg.content}
          {msg.streaming && msg.content && <span className="caret" aria-hidden />}
        </div>
        {msg.meta && (msg.meta.costUsd != null || msg.meta.durationMs != null) && (
          <div className="mt-1.5 flex flex-wrap gap-3 px-1 text-[10px] text-white/30">
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
          </div>
        )}
      </div>
    </motion.div>
  );
}

function TypingBubble({ id }: { id: AgentId }) {
  const agent = getAgent(id)!;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      <Avatar id={id} accent={agent.accent} accentSoft={agent.accentSoft} size={36} />
      <div className="flex items-center gap-1.5 rounded-2xl border border-white/[0.06] bg-white/[0.035] px-4 py-3.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: agent.accentSoft }}
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </motion.div>
  );
}
