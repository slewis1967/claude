"use client";

import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

export interface VaultStatus {
  configured: boolean;
  vaultRoot: string;
  folder: string;
  vaultExists: boolean;
  writable: boolean;
  todayFile: string;
  todayMarkdown: string;
  hint?: string;
}

export function vaultReady(s: VaultStatus | null): boolean {
  return !!s && s.configured && s.vaultExists && s.writable;
}

// Shared "Connect your Obsidian vault" card. Paste a path → Connect.
// Auto-opens its editor until a working vault is wired up.
export function VaultConnector({
  status,
  onChange,
}: {
  status: VaultStatus | null;
  onChange: (s: VaultStatus) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [path, setPath] = useState("");
  const [connecting, setConnecting] = useState(false);

  const ok = vaultReady(status);
  useEffect(() => {
    if (status && !ok) {
      setEditing(true);
      setPath((p) => p || (status.configured ? status.vaultRoot : ""));
    }
  }, [status, ok]);

  const connect = async () => {
    if (!path.trim()) return;
    setConnecting(true);
    try {
      const res = await fetch("/api/vault/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      const next = (await res.json()) as VaultStatus;
      onChange(next);
      if (vaultReady(next)) setEditing(false);
    } finally {
      setConnecting(false);
    }
  };

  if (!status) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-3.5 text-sm text-white/40">
        Checking vault…
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border px-5 py-4"
      style={{
        borderColor: ok ? "rgba(52,211,153,0.25)" : "rgba(255,209,102,0.3)",
        background: ok ? "rgba(52,211,153,0.06)" : "rgba(255,209,102,0.06)",
      }}
    >
      <div className="flex items-start gap-3">
        {ok ? (
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-300" />
        ) : (
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-gold" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">
              {ok ? "Auto-saving to your Obsidian vault" : "Connect your Obsidian vault"}
            </p>
            {ok && !editing && (
              <button
                onClick={() => {
                  setPath(status.vaultRoot);
                  setEditing(true);
                }}
                className="shrink-0 text-xs text-white/45 underline-offset-2 hover:text-white hover:underline"
              >
                Change
              </button>
            )}
          </div>

          {ok && !editing && (
            <p className="mt-0.5 break-all font-mono text-xs text-white/45">
              {status.folder}
            </p>
          )}

          {!ok && status.hint && (
            <p className="mt-1 text-xs text-gold/90">{status.hint}</p>
          )}

          {editing && (
            <div className="mt-3">
              <label className="text-xs text-white/50">
                Paste the full path to your vault folder
              </label>
              <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
                <input
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && connect()}
                  spellCheck={false}
                  placeholder={`C:\\Users\\You\\Documents\\Obsidian Vault`}
                  className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 font-mono text-xs text-white placeholder:text-white/25 focus:border-flux/50 focus:outline-none"
                />
                <button
                  onClick={connect}
                  disabled={!path.trim() || connecting}
                  className="rounded-xl bg-gradient-to-br from-flux to-cyan-600 px-4 py-2.5 text-sm font-medium text-white transition-transform hover:scale-[1.03] disabled:opacity-40"
                >
                  {connecting ? "Connecting…" : "Connect"}
                </button>
              </div>
              <p className="mt-2 text-[11px] text-white/35">
                Tip: in Obsidian, right-click a note → “Show in system explorer”,
                then copy the folder path. Backslashes and spaces are fine here.
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
