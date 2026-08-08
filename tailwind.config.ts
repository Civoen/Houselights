import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#EFEDE6",
        surface: "#FFFFFF",
        surfaceAlt: "#F6F5F0",
        line: "rgba(20,22,20,0.08)",
        lineStrong: "rgba(20,22,20,0.14)",
        ink: "#14181A",
        muted: "#666F6B",
        faint: "#9CA39F",
        teal: "#0D9488",
        green: "#3DDC97",
      },
      backgroundImage: {
        grad: "linear-gradient(115deg, #0D9488, #3DDC97)",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      borderRadius: {
        xl2: "20px",
      },
    },
  },
  plugins: [],
};
export default config;
