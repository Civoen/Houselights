"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/lib/themeStore";

export function BottomNav() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const isNewEvent = pathname === "/lineup" || pathname.startsWith("/lineup/");
  const isEvents = pathname.startsWith("/events");
  const isDark = theme === "dark";

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 bg-surface border-t border-line flex"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <Link
        href="/lineup"
        className={
          "flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold transition-colors " +
          (isNewEvent ? "text-teal" : "text-faint")
        }
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
        New event
      </Link>
      <Link
        href="/events"
        className={
          "flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold transition-colors " +
          (isEvents ? "text-teal" : "text-faint")
        }
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2.2" />
          <path d="M12 8v4.5l3 2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Previous events
      </Link>
      <button
        onClick={toggleTheme}
        className="flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold text-faint transition-all duration-150 active:scale-90"
      >
        <span key={theme} className="animate-theme-flick">
          {isDark ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2.2" />
              <path
                d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8L6 18M18 6l1.8-1.8"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M20 14.5A8.5 8.5 0 0110.5 4a7 7 0 109.5 10.5z"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
        {isDark ? "Lights up" : "Lights down"}
      </button>
    </nav>
  );
}
