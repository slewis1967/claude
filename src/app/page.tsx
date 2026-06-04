"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import BootSequence from "@/components/BootSequence";
import Sidebar, { type Section } from "@/components/Sidebar";
import MissionControl from "@/components/MissionControl";
import ClaudeConsole from "@/components/ClaudeConsole";
import AgentPanel from "@/components/AgentPanel";
import { useFleetMetrics } from "@/hooks/useFleetMetrics";
import { useSystemStats } from "@/hooks/useSystemStats";
import { AGENTS, type AgentId } from "@/lib/agents";

export default function Home() {
  const [booted, setBooted] = useState(false);
  const [section, setSection] = useState<Section>("mission");
  const metrics = useFleetMetrics();
  const { stats } = useSystemStats(5000);

  // Live status flags for the sidebar dots (only Claude is truly live).
  const agentStatus: Record<string, boolean> = {
    claude: stats?.online ?? false,
  };
  for (const a of AGENTS) if (!a.live) agentStatus[a.id] = true;

  return (
    <>
      <AnimatePresence>
        {!booted && <BootSequence onDone={() => setBooted(true)} />}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: booted ? 1 : 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 flex h-screen w-screen overflow-hidden"
      >
        <Sidebar active={section} onSelect={setSection} agentStatus={agentStatus} />

        <main className="relative flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1400px] px-5 py-7 lg:px-10 lg:py-9">
            <AnimatePresence mode="wait">
              <motion.div
                key={section}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className={section === "claude" ? "h-[calc(100vh-4.5rem)]" : ""}
              >
                {section === "mission" && (
                  <MissionControl metrics={metrics} onOpen={setSection} />
                )}
                {section === "claude" && <ClaudeConsole />}
                {section !== "mission" && section !== "claude" && (
                  <AgentPanel
                    id={section as AgentId}
                    metric={metrics[section as AgentId]}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </motion.div>
    </>
  );
}
