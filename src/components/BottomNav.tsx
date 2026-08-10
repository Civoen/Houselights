"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { copy } from "@/lib/copy";
import { haptic, HAPTIC } from "@/lib/haptics";

const TABS = [
  {
    href: "/",
    key: "nextUp",
    label: copy.nav.nextUp,
    match: (p: string) => p === "/",
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="2" />
        <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/lineup",
    key: "newEvent",
    label: copy.nav.newEvent,
    match: (p: string) => p === "/lineup" || p.startsWith("/lineup/"),
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/events",
    key: "previousEvents",
    label: copy.nav.previousEvents,
    match: (p: string) => p.startsWith("/events"),
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" style={{ transform: "scaleX(-1)" }}>
        <path d="M7 4.5v15l13-7.5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const foundIndex = TABS.findIndex((t) => t.match(pathname));
  const activeIndex = foundIndex === -1 ? 0 : foundIndex;
  const tabWidthPct = 100 / TABS.length;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 bg-surface border-t border-line"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="relative flex items-stretch px-2 h-16">
        <div
          className="absolute top-[-10px] h-[74px] rounded-full bg-grad shadow-[0_10px_24px_-8px_rgba(17,80,103,0.6)] pointer-events-none"
          style={{
            left: `calc(${activeIndex * tabWidthPct}% + 8px)`,
            width: `calc(${tabWidthPct}% - 16px)`,
            transition: "left 0.5s cubic-bezier(0.34,1.56,0.64,1), width 0.5s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          <div key={activeIndex} className="w-full h-full rounded-full animate-pill-squeeze" />
        </div>

        {TABS.map((tab, i) => {
          const active = i === activeIndex;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              onClick={() => haptic(HAPTIC.tap)}
              className={
                "relative z-10 flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-bold transition-colors duration-300 " +
                (active ? "text-white" : "text-faint")
              }
            >
              <span key={active ? `${tab.key}-on` : `${tab.key}-off`} className={active ? "animate-pop-in" : ""}>
                {tab.icon}
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
