import type { AgentId } from "@/lib/agents";

// Distinct, minimal SVG logo marks for each agent — used as avatars across
// the contact list, chat headers, and message bubbles.

function Claude(props: React.SVGProps<SVGSVGElement>) {
  // Four-point spark.
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M12 2c.4 4.5 2.5 6.6 7 7-4.5.4-6.6 2.5-7 7-.4-4.5-2.5-6.6-7-7 4.5-.4 6.6-2.5 7-7z"
        fill="currentColor"
      />
    </svg>
  );
}

function OpenClaw(props: React.SVGProps<SVGSVGElement>) {
  // Targeting reticle / claw.
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2.4" fill="currentColor" />
      <path
        d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Hermes(props: React.SVGProps<SVGSVGElement>) {
  // Paper plane / winged messenger.
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M21.5 3.5 2.8 11.2c-.9.4-.8 1.7.1 2l5.3 1.6 1.6 5.3c.3.9 1.6 1 2 .1L21.5 3.5z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M21.5 3.5 8.2 14.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function Atlas(props: React.SVGProps<SVGSVGElement>) {
  // Stacked layers / infrastructure.
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M12 3 3 7.5 12 12l9-4.5L12 3z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M3 12l9 4.5L21 12" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M3 16.5 12 21l9-4.5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function Orion(props: React.SVGProps<SVGSVGElement>) {
  // Constellation.
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M5 6.5 11 11l3-5M11 11l2.5 7M14 6.5 19 9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="5" cy="6.5" r="1.6" fill="currentColor" />
      <circle cx="11" cy="11" r="1.8" fill="currentColor" />
      <circle cx="14" cy="6.5" r="1.6" fill="currentColor" />
      <circle cx="19" cy="9" r="1.4" fill="currentColor" />
      <circle cx="13.5" cy="18" r="1.6" fill="currentColor" />
    </svg>
  );
}

const LOGOS: Record<AgentId, (p: React.SVGProps<SVGSVGElement>) => React.ReactElement> = {
  claude: Claude,
  openclaw: OpenClaw,
  hermes: Hermes,
  atlas: Atlas,
  orion: Orion,
};

export function AgentLogo({
  id,
  className,
}: {
  id: AgentId;
  className?: string;
}) {
  const L = LOGOS[id] ?? Claude;
  return <L className={className} />;
}

/** Rounded gradient avatar tile with the agent's logo and optional status dot. */
export function Avatar({
  id,
  accent,
  accentSoft,
  size = 40,
  online,
  ring = false,
}: {
  id: AgentId;
  accent: string;
  accentSoft: string;
  size?: number;
  online?: boolean;
  ring?: boolean;
}) {
  const dot = Math.max(9, Math.round(size * 0.28));
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center rounded-2xl"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(140deg, ${accent} 0%, ${accentSoft}cc 100%)`,
        boxShadow: ring ? `0 0 0 2px ${accent}33, 0 8px 24px -10px ${accent}` : undefined,
      }}
    >
      <span style={{ width: size * 0.55, height: size * 0.55 }} className="text-white">
        <AgentLogo id={id} className="h-full w-full" />
      </span>
      {online !== undefined && (
        <span
          className="absolute -bottom-0.5 -right-0.5 rounded-full border-[2.5px]"
          style={{
            width: dot,
            height: dot,
            borderColor: "#0a0c14",
            background: online ? "#34d399" : "#6b7280",
            boxShadow: online ? "0 0 8px #34d399" : undefined,
          }}
        />
      )}
    </span>
  );
}
