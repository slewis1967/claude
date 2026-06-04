"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "./useClaudeStream";

// Watches a chat thread and saves each completed user→assistant turn to the
// Obsidian vault exactly once. Fires onSaved so the UI can flash a confirmation.
export function useVaultAutosave(
  messages: ChatMessage[],
  busy: boolean,
  agentName: string,
  onSaved?: () => void,
) {
  const saved = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (busy) return;
    if (messages.length < 2) return;

    const last = messages[messages.length - 1];
    if (
      last.role !== "assistant" ||
      last.streaming ||
      !last.content.trim() ||
      saved.current.has(last.id)
    ) {
      return;
    }

    // Find the user message immediately preceding this reply.
    let user: ChatMessage | undefined;
    for (let i = messages.length - 2; i >= 0; i--) {
      if (messages[i].role === "user") {
        user = messages[i];
        break;
      }
      if (messages[i].role === "assistant") break;
    }
    if (!user) return;

    saved.current.add(last.id);

    fetch("/api/vault", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "chat",
        agent: agentName,
        user: user.content,
        assistant: last.content,
      }),
    })
      .then((r) => {
        if (r.ok) onSaved?.();
        else saved.current.delete(last.id); // allow retry on failure
      })
      .catch(() => saved.current.delete(last.id));
  }, [messages, busy, agentName, onSaved]);
}
