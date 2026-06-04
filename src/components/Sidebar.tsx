"use client";

import { motion } from "framer-motion";
import { LayoutGrid, Activity } from "lucide-react";
import { AGENTS } from "@/lib/agents";

export type Section = "mission" | (typeof AGENTS)[number]["id"];

interface Props {
  active: Section;
  onSelect: (s: Section) => void;
  agentStatus: Record<string, boolean>;
}

export default function Sidebar({ active, onSelect, agentStatus }: Props) {
  return (
    <aside className="relative z-20 flex w-[88px] shrink-0 flex-col items-center gap-2 py-6 lg:w-[260px] lg:items-stretch lg:px-4">
      {/* Brand */}
      <div className="mb-6 flex items-center gap-3 px-2 lg:px-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-plasma-deep via-plasma to-flux text-2xl shadow-glow">
          ✦
        </div>
        <div className="hidden lg:block">
          <div className="text-sm font-bold tracking-[0.2em] text-gradient">
            NEXUS OS
          </div>
          <div className="text-[10px] uppercase tracking-widest text-white/40">
            mission control
          </div>
        </div>
      </div>

      <NavButton
        icon={<LayoutGrid size={20} />}
        label="Mission Control"
        sub="fleet overview"
        active={active === "mission"}
        accent="#7c5cff"
        onClick={() => onSelect("mission")}
      />

      <div className="my-3 hidden px-3 text-[10px] uppercase tracking-widest text-white/30 lg:block">
        Agents
      </div>

      <div className="flex flex-1 flex-col gap-2">
        {AGENTS.map((a) => (
          <NavButton
            key={a.id}
            icon={<span className="text-lg leading-none">{a.glyph}</span>}
            label={a.name}
            sub={a.live ? "live bridge" : a.model}
            active={active === a.id}
            accent={a.accent}
            online={agentStatus[a.id]}
            live={a.live}
            onClick={() => onSelect(a.id)}
          />
        ))}
      </div>

      <div className="mt-auto hidden items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 lg:flex">
        <Activity size={14} className="text-lime" />
        <span className="text-[11px] text-white/50">
          All systems nominal
        </span>
      </div>
    </aside>
  );
}

function NavButton({
  icon,
  label,
  sub,
  active,
  accent,
  online,
  live,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  active: boolean;
  accent: string;
  online?: boolean;
  live?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative flex items-center gap-3 rounded-2xl px-2 py-3 transition-colors lg:px-3"
      style={{ color: active ? "#fff" : "rgba(255,255,255,0.55)" }}
    >
      {active && (
        <motion.div
          layoutId="nav-active"
          className="absolute inset-0 rounded-2xl border"
          style={{
            borderColor: `${accent}55`,
            background: `linear-gradient(120deg, ${accent}22, transparent)`,
            boxShadow: `0 0 30px -8px ${accent}88`,
          }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      )}
      <span
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
        style={{
          background: active ? `${accent}22` : "rgba(255,255,255,0.04)",
          color: active ? accent : "currentColor",
        }}
      >
        {icon}
      </span>
      <span className="relative hidden min-w-0 flex-1 text-left lg:block">
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          {label}
          {live && (
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{
                background: online === false ? "#ff6b9d" : "#9eff5a",
                boxShadow:
                  online === false ? "0 0 8px #ff6b9d" : "0 0 8px #9eff5a",
              }}
            />
          )}
        </span>
        {sub && (
          <span className="block truncate text-[11px] text-white/35">
            {sub}
          </span>
        )}
      </span>
    </button>
  );
}
