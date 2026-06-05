"use client";

import { Mic } from "lucide-react";

// Reusable voice-input button. Pink + pulsing while listening; disabled with a
// tooltip when the browser has no speech recognition.
export function MicButton({
  listening,
  supported,
  onClick,
  size = 36,
}: {
  listening: boolean;
  supported: boolean;
  onClick: () => void;
  size?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!supported}
      aria-label={listening ? "Stop voice input" : "Start voice input"}
      title={
        supported
          ? listening
            ? "Stop listening"
            : "Click to talk"
          : "Voice input isn't supported in this browser"
      }
      className="relative flex shrink-0 items-center justify-center rounded-xl transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-30"
      style={{
        width: size,
        height: size,
        background: listening ? "#ff6b9d" : "rgba(255,255,255,0.05)",
        color: listening ? "#fff" : "rgba(255,255,255,0.6)",
      }}
    >
      {listening && (
        <span
          className="absolute inset-0 animate-ping rounded-xl"
          style={{ background: "#ff6b9d", opacity: 0.4 }}
        />
      )}
      <Mic size={Math.round(size * 0.45)} className="relative" />
    </button>
  );
}
