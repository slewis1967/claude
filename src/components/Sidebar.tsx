"use client";

import { motion } from "framer-motion";
import { LayoutGrid } from "lucide-react";
import { AGENTS } from "@/lib/agents";
import { Avatar } from "./logos";

export type Section = "mission" | (typeof AGENTS)[number]["id"];

interface Props {
  active: Section;
  onSelect: (s: Section) => void;
  agentStatus: Record<string, boolean>;
}

export default function Sidebar({ active, onSelect, agentStatus }: Props) {
  return (
    <aside className="z-20 flex w-[76px] shrink-0 flex-col border-r border-white/[0.06] bg-white/[0.015] py-4 md:w-[290px]">
      {/* Brand */}
      <div className="flex items-center gap-3 px-3 pb-4 md:px-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-plasma-deep via-plasma to-flux text-xl shadow-glow">
          ✦
        </div>
        <div className="hidden md:block">
          <div className="text-[15px] font-bold leading-tight tracking-tight">
            Nexus OS
          </div>
          <div className="text-[11px] text-white/40">Agent control</div>
        </div>
      </div>

      <div className="mx-3 mb-3 h-px bg-white/[0.06] md:mx-4" />

      {/* Overview */}
      <div className="px-2 md:px-3">
        <Row
          active={active === "mission"}
          accent="#7c5cff"
          onClick={() => onSelect("mission")}
          leading={
            <span
              className="flex h-10 w-10 items-center justify-center rounded-2xl"
              style={{ background: "rgba(124,92,255,0.16)", color: "#a78bff" }}
            >
              <LayoutGrid size={18} />
            </span>
          }
          title="Mission Control"
          subtitle="Fleet overview"
        />
      </div>

      <div className="px-5 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-white/30 md:block">
        <span className="hidden md:inline">Agents</span>
      </div>

      {/* Agent contacts */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 md:px-3">
        {AGENTS.map((a) => (
          <Row
            key={a.id}
            active={active === a.id}
            accent={a.accent}
            onClick={() => onSelect(a.id)}
            leading={
              <Avatar
                id={a.id}
                accent={a.accent}
                accentSoft={a.accentSoft}
                size={40}
                online={agentStatus[a.id] ?? true}
              />
            }
            title={a.name}
            subtitle={a.live ? a.status : a.tagline}
            live={a.live}
          />
        ))}
      </nav>

      {/* Footer status */}
      <div className="mx-3 mt-2 hidden items-center gap-2.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 md:flex">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        <span className="text-[11px] text-white/50">All systems nominal</span>
      </div>
    </aside>
  );
}

function Row({
  active,
  accent,
  onClick,
  leading,
  title,
  subtitle,
  live,
}: {
  active: boolean;
  accent: string;
  onClick: () => void;
  leading: React.ReactNode;
  title: string;
  subtitle: string;
  live?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-white/[0.04] md:px-2.5"
    >
      {active && (
        <motion.div
          layoutId="contact-active"
          className="absolute inset-0 rounded-2xl"
          style={{ background: `${accent}1a`, border: `1px solid ${accent}33` }}
          transition={{ type: "spring", stiffness: 400, damping: 34 }}
        />
      )}
      <span className="relative">{leading}</span>
      <span className="relative hidden min-w-0 flex-1 md:block">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-white/90">
            {title}
          </span>
          {live && (
            <span className="rounded-md bg-emerald-400/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-300">
              Live
            </span>
          )}
        </span>
        <span className="block truncate text-xs text-white/40">{subtitle}</span>
      </span>
    </button>
  );
}
