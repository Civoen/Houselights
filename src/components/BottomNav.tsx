"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNav() {
  const pathname = usePathname();
  const isNewEvent = pathname === "/lineup" || pathname.startsWith("/lineup/");
  const isEvents = pathname.startsWith("/events");

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
    </nav>
  );
}
