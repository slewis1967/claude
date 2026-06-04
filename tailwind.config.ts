import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        // Core surface palette — deep space blacks with a hint of indigo.
        void: "#05060f",
        abyss: "#0a0c1a",
        carbon: "#0f1222",
        slate: {
          850: "#161a2e",
        },
        // Signature accent ramp.
        plasma: {
          DEFAULT: "#7c5cff",
          soft: "#a78bff",
          deep: "#5a36ff",
        },
        flux: "#22d3ee",
        ember: "#ff6b9d",
        lime: "#9eff5a",
        gold: "#ffd166",
      },
      boxShadow: {
        glow: "0 0 40px -8px rgba(124, 92, 255, 0.55)",
        "glow-flux": "0 0 40px -8px rgba(34, 211, 238, 0.5)",
        "inner-top": "inset 0 1px 0 0 rgba(255,255,255,0.06)",
      },
      backgroundImage: {
        "grid-faint":
          "linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)",
      },
      keyframes: {
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.8)", opacity: "0.7" },
          "100%": { transform: "scale(2.4)", opacity: "0" },
        },
        float: {
          "0%,100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        "gradient-pan": {
          "0%,100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        shimmer: "shimmer 2s infinite",
        "pulse-ring": "pulse-ring 2.4s cubic-bezier(0.215,0.61,0.355,1) infinite",
        float: "float 6s ease-in-out infinite",
        "gradient-pan": "gradient-pan 8s ease infinite",
      },
    },
  },
  plugins: [],
};

export default config;
