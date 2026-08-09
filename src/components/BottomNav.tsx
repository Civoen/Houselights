"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { copy } from "@/lib/copy";

export function BottomNav() {
  const pathname = usePathname();
  const isNextUp = pathname === "/";
  const isNewEvent = pathname === "/lineup" || pathname.startsWith("/lineup/");
  const isEvents = pathname.startsWith("/events");

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 bg-surface border-t border-line flex"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <Link
        href="/"
        className={
          "flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold transition-colors " +
          (isNextUp ? "text-accent" : "text-faint")
        }
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="2" />
          <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        {copy.nav.nextUp}
      </Link>
      <Link
        href="/lineup"
        className={
          "flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold transition-colors " +
          (isNewEvent ? "text-accent" : "text-faint")
        }
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
        {copy.nav.newEvent}
      </Link>
      <Link
        href="/events"
        className={
          "flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold transition-colors " +
          (isEvents ? "text-accent" : "text-faint")
        }
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="-scale-x-100">
          <path d="M7 4.5v15l13-7.5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" />
        </svg>
        {copy.nav.previousEvents}
      </Link>
    </nav>
  );
}
