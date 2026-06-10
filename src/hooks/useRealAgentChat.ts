"use client";

import { useCallback, useRef, useState } from "react";
import type { ChatMessage } from "./useClaudeStream";
import { getAgent, type AgentId } from "@/lib/agents";

// Drives a connected real-agent backend over /api/agent/run (SSE), streaming
// the agent's stdout into the chat. Mirrors the shape of the other chat hooks.
export function useRealAgentChat(id: AgentId) {
  const agent = getAgent(id)!;
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "greeting",
      role: "assistant",
      content: `${agent.name} is connected to your real backend. Send a message to talk to it.`,
    },
  ]);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  const stop = useCallback(() => abortRef.current?.abort(), []);
  const reset = useCallback(() => {
    abortRef.current?.abort();
    setBusy(false);
    setMessages([
      {
        id: "greeting",
        role: "assistant",
        content: `${agent.name} is connected to your real backend. Send a message to talk to it.`,
      },
    ]);
  }, [agent.name]);

  const send = useCallback(
    async (prompt: string) => {
      const text = prompt.trim();
      if (!text || busy) return;

      // Conversation history for multi-turn HTTP backends (drop the greeting
      // and any empty/streaming placeholders).
      const history = messagesRef.current
        .filter((m) => m.id !== "greeting" && m.content.trim())
        .map((m) => ({ role: m.role, content: m.content }));
      history.push({ role: "user" as const, content: text });

      const assistantId = crypto.randomUUID();
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: "user", content: text },
        { id: assistantId, role: "assistant", content: "", streaming: true },
      ]);
      setBusy(true);

      const patch = (fn: (m: ChatMessage) => ChatMessage) =>
        setMessages((s) => s.map((m) => (m.id === assistantId ? fn(m) : m)));

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/agent/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, prompt: text, messages: history }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) throw new Error(`Bridge responded ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buffer.indexOf("\n\n")) !== -1) {
            const frame = buffer.slice(0, nl);
            buffer = buffer.slice(nl + 2);
            const line = frame.split("\n").find((l) => l.startsWith("data:"));
            if (!line) continue;
            const json = line.slice(5).trim();
            if (!json) continue;
            let ev: any;
            try {
              ev = JSON.parse(json);
            } catch {
              continue;
            }
            if (ev.type === "delta") patch((m) => ({ ...m, content: m.content + ev.text }));
            else if (ev.type === "error")
              patch((m) => ({
                ...m,
                content: (m.content ? m.content + "\n\n" : "") + `⚠ ${ev.message}`,
                streaming: false,
              }));
          }
        }
      } catch (e: any) {
        if (e?.name !== "AbortError")
          patch((m) => ({
            ...m,
            content: m.content || `⚠ ${e?.message ?? "bridge error"}`,
            streaming: false,
          }));
      } finally {
        patch((m) => ({ ...m, streaming: false }));
        setBusy(false);
        abortRef.current = null;
      }
    },
    [busy, id],
  );

  return { messages, busy, typing: false, send, stop, reset };
}
