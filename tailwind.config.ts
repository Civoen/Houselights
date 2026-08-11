import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        surfaceAlt: "var(--color-surfaceAlt)",
        line: "var(--color-line)",
        lineStrong: "var(--color-lineStrong)",
        ink: "var(--color-ink)",
        muted: "var(--color-muted)",
        faint: "var(--color-faint)",
        teal: "#115067",
        green: "#14CC9B",
        navy: "#0A1F26",
        accent: "var(--color-accent)",
      },
      backgroundImage: {
        grad: "linear-gradient(115deg, #115067, #14CC9B)",
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
        themeFlick: {
          "0%": { opacity: "0.3", transform: "scale(0.8) rotate(-10deg)" },
          "60%": { opacity: "1", transform: "scale(1.15) rotate(4deg)" },
          "100%": { opacity: "1", transform: "scale(1) rotate(0)" },
        },
        eqBounce: {
          "0%, 100%": { transform: "scaleY(0.35)" },
          "50%": { transform: "scaleY(1)" },
        },
        faderDrift: {
          "0%, 100%": { transform: "translateY(-3px)" },
          "50%": { transform: "translateY(3px)" },
        },
        pillSqueeze: {
          "0%": { transform: "scaleX(0.88) scaleY(1.08)" },
          "45%": { transform: "scaleX(1.1) scaleY(0.94)" },
          "70%": { transform: "scaleX(0.97) scaleY(1.02)" },
          "100%": { transform: "scaleX(1) scaleY(1)" },
        },
        flashFade: {
          "0%": { opacity: "0.55" },
          "100%": { opacity: "0" },
        },
      },
      animation: {
        "fade-slide-up": "fadeSlideUp 0.4s ease-out both",
        "pop-in": "popIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both",
        "check-draw": "checkDraw 0.5s ease-out 0.1s both",
        "ring-pop": "ringPop 0.45s cubic-bezier(0.34,1.56,0.64,1) both",
        "lights-up": "lightsUp 0.8s ease-out both",
        "theme-flick": "themeFlick 0.4s cubic-bezier(0.34,1.56,0.64,1) both",
        "eq-bounce": "eqBounce 0.8s ease-in-out infinite",
        "fader-drift": "faderDrift 3.4s ease-in-out infinite",
        "pill-squeeze": "pillSqueeze 0.5s cubic-bezier(0.34,1.56,0.64,1) both",
        "flash-fade": "flashFade 900ms ease-out both",
      },
    },
  },
  plugins: [],
};
export default config;
