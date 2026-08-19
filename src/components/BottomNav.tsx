"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { copy } from "@/lib/copy";
import { haptic, HAPTIC } from "@/lib/haptics";
import { hasUnseenPlaylists, PLAYLISTS_CHANGED_EVENT } from "@/lib/unreadPlaylists";
import { hasUnseenWristbands, WRISTBAND_CHECK_EVENT } from "@/lib/wristbandTracker";

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
    href: "/wristbands",
    key: "wristbands",
    label: copy.nav.wristbands,
    match: (p: string) => p.startsWith("/wristbands"),
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="8" width="20" height="8" rx="4" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 8v8" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const activeIndex = TABS.findIndex((t) => t.match(pathname));
  const tabWidthPct = 100 / TABS.length;
  const [unreadPlaylists, setUnreadPlaylists] = useState(false);
  const [unreadWristbands, setUnreadWristbands] = useState(false);

  // Recomputes on every navigation (the page just navigated to may have
  // just acknowledged its own badge, e.g. Playlists/Wristbands clearing
  // themselves on mount) and also listens for both change events directly,
  // rather than relying only on effect ordering between this component and
  // whichever page fired the acknowledgment — a new playlist created while
  // sitting on New Event, for instance, should light up the Playlists dot
  // immediately, with no navigation involved at all.
  useEffect(() => {
    function recompute() {
      setUnreadPlaylists(hasUnseenPlaylists());
      setUnreadWristbands(hasUnseenWristbands());
    }
    recompute();
    window.addEventListener(PLAYLISTS_CHANGED_EVENT, recompute);
    window.addEventListener(WRISTBAND_CHECK_EVENT, recompute);
    return () => {
      window.removeEventListener(PLAYLISTS_CHANGED_EVENT, recompute);
      window.removeEventListener(WRISTBAND_CHECK_EVENT, recompute);
    };
  }, [pathname]);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 nav-frosted border-t border-line px-2"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="relative flex items-stretch h-[72px] lg:max-w-3xl lg:mx-auto">
        {activeIndex >= 0 && (
          <div
            className="absolute top-[6px] h-[60px] rounded-2xl bg-grad shadow-[0_6px_16px_-6px_rgba(17,80,103,0.5)] pointer-events-none"
            style={{
              left: `calc(${activeIndex * tabWidthPct}% + 8px)`,
              width: `calc(${tabWidthPct}% - 16px)`,
              transition: "left 0.45s cubic-bezier(0.3,1.2,0.4,1), width 0.45s cubic-bezier(0.3,1.2,0.4,1)",
            }}
          >
            <div key={activeIndex} className="w-full h-full rounded-2xl animate-pill-squeeze" />
          </div>
        )}

        {TABS.map((tab, i) => {
          const active = i === activeIndex;
          const showDot = (tab.key === "playlists" && unreadPlaylists) || (tab.key === "wristbands" && unreadWristbands);
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
              <span key={active ? `${tab.key}-on` : `${tab.key}-off`} className={"relative " + (active ? "animate-pop-in" : "")}>
                {tab.icon}
                {showDot && (
                  <span
                    className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-green border border-navy"
                    aria-hidden="true"
                  />
                )}
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
