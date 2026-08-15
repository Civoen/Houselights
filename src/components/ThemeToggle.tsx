"use client";
import { useTheme } from "@/lib/themeStore";
import { haptic, HAPTIC } from "@/lib/haptics";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={() => {
        haptic(HAPTIC.tap);
        toggleTheme();
      }}
      aria-label={isDark ? "Switch to lights up (light mode)" : "Switch to lights down (dark mode)"}
      className={"flex items-center justify-center transition-transform duration-150 active:scale-90 " + className}
    >
      <span key={theme} className="animate-theme-flick">
        {isDark ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" />
            <path
              d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8L6 18M18 6l1.8-1.8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M20 14.5A8.5 8.5 0 0110.5 4a7 7 0 109.5 10.5z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
    </button>
  );
}
