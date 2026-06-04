"use client";

import { useCallback, useRef, useState } from "react";
import type { ChatMessage } from "./useClaudeStream";
import { respond } from "@/lib/agent-responder";
import { getAgent, type AgentId } from "@/lib/agents";

// Local simulated chat for the non-live agents. Mirrors the shape of
// useClaudeStream so the unified ChatView can drive either one. Adds a typing
// pause and word-by-word reveal so it reads like a real messaging app.
export function useAgentChat(id: AgentId) {
  const agent = getAgent(id)!;
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { id: "greeting", role: "assistant", content: agent.greeting },
  ]);
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const reset = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setBusy(false);
    setTyping(false);
    setMessages([{ id: "greeting", role: "assistant", content: agent.greeting }]);
  }, [agent.greeting]);

  const send = useCallback(
    (prompt: string) => {
      const text = prompt.trim();
      if (!text || busy) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
      };
      setMessages((m) => [...m, userMsg]);
      setBusy(true);
      setTyping(true);

      const full = respond(id, text);
      const words = full.split(/(\s+)/); // keep whitespace tokens
      const assistantId = crypto.randomUUID();

      // Typing pause scaled a little to message length.
      const thinkMs = 480 + Math.min(900, full.length * 4);

      timers.current.push(
        setTimeout(() => {
          setTyping(false);
          setMessages((m) => [
            ...m,
            { id: assistantId, role: "assistant", content: "", streaming: true },
          ]);

          let i = 0;
          const stream = () => {
            i += 1;
            const partial = words.slice(0, i).join("");
            setMessages((m) =>
              m.map((msg) =>
                msg.id === assistantId
                  ? { ...msg, content: partial, streaming: i < words.length }
                  : msg,
              ),
            );
            if (i < words.length) {
              timers.current.push(setTimeout(stream, 22 + Math.random() * 28));
            } else {
              setBusy(false);
            }
          };
          stream();
        }, thinkMs),
      );
    },
    [busy, id],
  );

  return { messages, busy, typing, send, reset };
}
