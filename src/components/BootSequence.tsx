"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const LINES = [
  "initializing nexus kernel…",
  "mounting agent fleet registry…",
  "establishing claude code cli bridge…",
  "calibrating telemetry gauges…",
  "warming reasoning core…",
  "all systems nominal.",
];

export default function BootSequence({ onDone }: { onDone: () => void }) {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    if (visible >= LINES.length) {
      const t = setTimeout(onDone, 650);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setVisible((v) => v + 1), 360);
    return () => clearTimeout(t);
  }, [visible, onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-void"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04, filter: "blur(8px)" }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 12 }}
        className="relative mb-10"
      >
        <div className="absolute inset-0 animate-pulse-ring rounded-full border border-plasma" />
        <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-plasma-deep via-plasma to-flux text-5xl shadow-glow">
          <motion.span
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          >
            ✦
          </motion.span>
        </div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8 text-3xl font-bold tracking-[0.3em] text-gradient"
      >
        NEXUS&nbsp;OS
      </motion.h1>

      <div className="h-40 w-[min(90vw,420px)] font-mono text-sm">
        {LINES.slice(0, visible).map((line, i) => (
          <motion.div
            key={line}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 py-1 text-white/60"
          >
            <span className="text-lime">›</span>
            <span className={i === LINES.length - 1 ? "text-lime" : ""}>
              {line}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
