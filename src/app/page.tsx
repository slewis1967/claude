"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import BootSequence from "@/components/BootSequence";
import Sidebar, { type Section } from "@/components/Sidebar";
import MissionControl from "@/components/MissionControl";
import Goals from "@/components/Goals";
import Journal from "@/components/Journal";
import ChatView from "@/components/ChatView";
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
        transition={{ duration: 0.5 }}
        className="relative z-10 flex h-screen w-screen overflow-hidden"
      >
        <Sidebar active={section} onSelect={setSection} agentStatus={agentStatus} />

        <main className="relative min-w-0 flex-1 overflow-hidden">
          {/* Keyed by section with an enter-only animation. No AnimatePresence
              "wait" here — exit animations could strand the view on the old
              page when switching quickly, which looked like pages "not loading". */}
          <motion.div
            key={section}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="h-full"
          >
            {section === "mission" ? (
              <div className="h-full overflow-y-auto">
                <div className="mx-auto max-w-[1400px] px-5 py-7 lg:px-9">
                  <MissionControl metrics={metrics} onOpen={setSection} />
                </div>
              </div>
            ) : section === "goals" ? (
              <Goals />
            ) : section === "journal" ? (
              <Journal />
            ) : (
              <ChatView id={section as AgentId} />
            )}
          </motion.div>
        </main>
      </motion.div>
    </>
  );
}
