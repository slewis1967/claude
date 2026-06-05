"use client";

import { useRef } from "react";
import { useSpeechRecognition } from "./useSpeechRecognition";

// Binds the browser's speech recognition to a controlled text field. Dictated
// words stream into `value` via `onChange`, preserving anything already typed.
export function useDictation(value: string, onChange: (v: string) => void) {
  const speech = useSpeechRecognition();
  const baseRef = useRef("");
  const finalRef = useRef("");

  const start = () => {
    baseRef.current = value.trim();
    finalRef.current = "";
    speech.start(({ final, interim }) => {
      if (final) finalRef.current = `${finalRef.current} ${final.trim()}`.trim();
      onChange(
        [baseRef.current, finalRef.current, interim.trim()]
          .filter(Boolean)
          .join(" "),
      );
    });
  };

  const toggle = () => {
    if (speech.listening) speech.stop();
    else start();
  };

  return {
    supported: speech.supported,
    listening: speech.listening,
    error: speech.error,
    stop: speech.stop,
    toggle,
  };
}
