"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { copy } from "@/lib/copy";
import { haptic, HAPTIC } from "@/lib/haptics";

const TABS = [
  {
    href: "/playlists",
    key: "playlists",
    label: copy.nav.playlists,
    match: (p: string) => p.startsWith("/playlists"),
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
        <path d="M4 6h13M4 12h13M4 18h9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="19.5" cy="17" r="2.2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M21.5 17V8.5l-2 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
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
    href: "/lanyards",
    key: "lanyards",
    label: copy.nav.lanyards,
    match: (p: string) => p.startsWith("/lanyards"),
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
        <rect x="8" y="3" width="8" height="7" rx="3.5" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="15" r="6" stroke="currentColor" strokeWidth="1.8" />
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
      className="fixed bottom-0 left-0 right-0 z-30 nav-frosted border-t border-line"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="relative flex items-stretch px-2 h-[72px]">
        <div
          className="absolute top-[6px] h-[60px] rounded-full bg-grad shadow-[0_6px_16px_-6px_rgba(17,80,103,0.5)] pointer-events-none"
          style={{
            left: `calc(${activeIndex * tabWidthPct}% + 8px)`,
            width: `calc(${tabWidthPct}% - 16px)`,
            transition: "left 0.45s cubic-bezier(0.3,1.2,0.4,1), width 0.45s cubic-bezier(0.3,1.2,0.4,1)",
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
