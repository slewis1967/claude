"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Thin wrapper around the browser's built-in Web Speech API
// (SpeechRecognition / webkitSpeechRecognition). No API keys, no network setup
// on our side — recognition runs through the browser. Works in Chromium-based
// browsers and Safari over https:// or on localhost.

// The Web Speech types aren't in the standard DOM lib, so we describe the
// minimal surface we use.
interface SRAlternative {
  transcript: string;
}
interface SRResult {
  isFinal: boolean;
  0: SRAlternative;
}
interface SRResultList {
  length: number;
  [i: number]: SRResult;
}
interface SREvent {
  resultIndex: number;
  results: SRResultList;
}
interface SRErrorEvent {
  error: string;
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: SRErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

function getSR(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export interface SpeechResult {
  /** Newly finalized text from this event (commit it). */
  final: string;
  /** Current in-progress text (not yet final; shown as a live preview). */
  interim: string;
}

export function useSpeechRecognition() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const onResultRef = useRef<((r: SpeechResult) => void) | null>(null);
  const manualStopRef = useRef(false);

  useEffect(() => {
    setSupported(getSR() != null);
    return () => recRef.current?.abort();
  }, []);

  const stop = useCallback(() => {
    manualStopRef.current = true;
    recRef.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(
    (onResult: (r: SpeechResult) => void) => {
      const SR = getSR();
      if (!SR) {
        setError("Voice input isn't supported in this browser.");
        return;
      }
      // Tear down any previous instance.
      recRef.current?.abort();

      const rec = new SR();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang =
        (typeof navigator !== "undefined" && navigator.language) || "en-US";

      onResultRef.current = onResult;
      manualStopRef.current = false;

      rec.onresult = (e: SREvent) => {
        let final = "";
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const seg = e.results[i];
          const text = seg[0]?.transcript ?? "";
          if (seg.isFinal) final += text;
          else interim += text;
        }
        onResultRef.current?.({ final, interim });
      };

      rec.onerror = (e: SRErrorEvent) => {
        if (e.error === "no-speech" || e.error === "aborted") return;
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          setError("Microphone access was blocked. Allow it and try again.");
        } else {
          setError(`Voice input error: ${e.error}`);
        }
        setListening(false);
      };

      rec.onend = () => {
        // Chrome stops after pauses; keep going until the user clicks stop.
        if (!manualStopRef.current) {
          try {
            rec.start();
            return;
          } catch {
            /* already started or cannot restart */
          }
        }
        setListening(false);
      };

      try {
        rec.start();
        recRef.current = rec;
        setError(null);
        setListening(true);
      } catch {
        setError("Couldn't start voice input.");
      }
    },
    [],
  );

  const toggle = useCallback(
    (onResult: (r: SpeechResult) => void) => {
      if (listening) stop();
      else start(onResult);
    },
    [listening, start, stop],
  );

  return { supported, listening, error, start, stop, toggle };
}
