"use client";

import { useCallback, useRef, useState } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  tools?: { name: string }[];
  meta?: { costUsd?: number; durationMs?: number; numTurns?: number };
}

export interface ClaudeStreamState {
  messages: ChatMessage[];
  busy: boolean;
  sessionId: string | null;
  model: string | null;
  error: string | null;
}

// Drives the /api/claude SSE bridge: posts a prompt, appends an assistant
// message, and streams text deltas into it as Claude responds.
export function useClaudeStream(model?: string) {
  const [state, setState] = useState<ClaudeStreamState>({
    messages: [],
    busy: false,
    sessionId: null,
    model: null,
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState({
      messages: [],
      busy: false,
      sessionId: null,
      model: null,
      error: null,
    });
  }, []);

  const send = useCallback(
    async (prompt: string) => {
      const text = prompt.trim();
      if (!text) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
      };
      const assistantId = crypto.randomUUID();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        streaming: true,
        tools: [],
      };

      let currentSession: string | null = null;
      setState((s) => {
        currentSession = s.sessionId;
        return {
          ...s,
          busy: true,
          error: null,
          messages: [...s.messages, userMsg, assistantMsg],
        };
      });

      const patch = (fn: (m: ChatMessage) => ChatMessage) =>
        setState((s) => ({
          ...s,
          messages: s.messages.map((m) => (m.id === assistantId ? fn(m) : m)),
        }));

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/claude", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: text,
            sessionId: currentSession ?? undefined,
            model,
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error(`Bridge responded ${res.status}`);
        }

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
            handleEvent(ev);
          }
        }
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          patch((m) => ({
            ...m,
            content:
              m.content ||
              `⚠ Bridge error: ${e?.message ?? "unknown"}. Make sure the \`claude\` CLI is installed and authenticated.`,
            streaming: false,
          }));
          setState((s) => ({ ...s, error: e?.message ?? "bridge error" }));
        }
      } finally {
        patch((m) => ({ ...m, streaming: false }));
        setState((s) => ({ ...s, busy: false }));
        abortRef.current = null;
      }

      function handleEvent(ev: any) {
        switch (ev.type) {
          case "init":
            setState((s) => ({
              ...s,
              sessionId: ev.sessionId || s.sessionId,
              model: ev.model || s.model,
            }));
            break;
          case "delta":
            patch((m) => ({ ...m, content: m.content + ev.text }));
            break;
          case "tool":
            patch((m) => ({
              ...m,
              tools: [...(m.tools ?? []), { name: ev.name }],
            }));
            break;
          case "done":
            setState((s) => ({
              ...s,
              sessionId: ev.sessionId || s.sessionId,
            }));
            patch((m) => ({
              ...m,
              content: m.content || ev.result,
              streaming: false,
              meta: {
                costUsd: ev.costUsd,
                durationMs: ev.durationMs,
                numTurns: ev.numTurns,
              },
            }));
            break;
          case "error":
            patch((m) => ({
              ...m,
              content:
                (m.content ? m.content + "\n\n" : "") + `⚠ ${ev.message}`,
              streaming: false,
            }));
            setState((s) => ({ ...s, error: ev.message }));
            break;
        }
      }
    },
    [model],
  );

  return { ...state, send, stop, reset };
}
