import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F6F7F5",
        surface: "#FFFFFF",
        surfaceAlt: "#EEF1F0",
        line: "rgba(10,31,38,0.08)",
        lineStrong: "rgba(10,31,38,0.14)",
        ink: "#0A1F26",
        muted: "#64748B",
        faint: "#93A0AB",
        teal: "#14B8A6",
        green: "#4ADE80",
        navy: "#0A1F26",
      },
      backgroundImage: {
        grad: "linear-gradient(115deg, #14B8A6, #4ADE80)",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      borderRadius: {
        xl2: "20px",
      },
      keyframes: {
        fadeSlideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        popIn: {
          "0%": { transform: "scale(0.85)", opacity: "0" },
          "60%": { transform: "scale(1.06)", opacity: "1" },
          "100%": { transform: "scale(1)" },
        },
        softGlow: {
          "0%, 100%": { boxShadow: "0 8px 26px -10px rgba(13,148,136,0.45)" },
          "50%": { boxShadow: "0 10px 34px -8px rgba(61,220,151,0.65)" },
        },
        checkDraw: {
          "0%": { strokeDashoffset: "24", opacity: "0" },
          "40%": { opacity: "1" },
          "100%": { strokeDashoffset: "0", opacity: "1" },
        },
        ringPop: {
          "0%": { transform: "scale(0.6)", opacity: "0" },
          "60%": { transform: "scale(1.08)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        lightsUp: {
          "0%": { opacity: "0", filter: "brightness(0.35)", transform: "scale(0.88)" },
          "55%": { opacity: "1", filter: "brightness(1.2)" },
          "100%": { opacity: "1", filter: "brightness(1)", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-slide-up": "fadeSlideUp 0.4s ease-out both",
        "pop-in": "popIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both",
        "soft-glow": "softGlow 3.4s ease-in-out infinite",
        "check-draw": "checkDraw 0.5s ease-out 0.1s both",
        "ring-pop": "ringPop 0.45s cubic-bezier(0.34,1.56,0.64,1) both",
        "lights-up": "lightsUp 0.8s ease-out both",
      },
    },
  },
  plugins: [],
};
export default config;
