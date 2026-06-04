"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";

// Flashes a brief "Saved to Obsidian" confirmation whenever `trigger` changes.
export function SavedBadge({ trigger }: { trigger: number }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!trigger) return;
    setShow(true);
    const t = setTimeout(() => setShow(false), 2400);
    return () => clearTimeout(t);
  }, [trigger]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="flex items-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1.5 text-[11px] font-medium text-emerald-300"
        >
          <Check size={13} /> Saved to Obsidian
        </motion.div>
      )}
    </AnimatePresence>
  );
}
