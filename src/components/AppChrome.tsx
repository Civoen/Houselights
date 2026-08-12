"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BottomNav } from "./BottomNav";
import { WristbandUnlockToast } from "./WristbandUnlockToast";
import { ThemeToggle } from "./ThemeToggle";
import { SettingsButton } from "./SettingsButton";
import { checkForNewWristbands, WRISTBAND_CHECK_EVENT } from "@/lib/wristbandTracker";
import { WristbandDef, colorForWristband } from "@/lib/wristbands";
import { useColorblindMode } from "@/lib/colorblindStore";

const HIDE_NAV_ON = ["/success"];
// Settings excludes itself for the same reason it never shows its own
// SettingsButton — you're already there — and it has its own, more
// detailed theme control further down the page instead of the header icon.
const HIDE_HEADER_ICONS_ON = ["/success", "/settings"];

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const showNav = !HIDE_NAV_ON.includes(pathname);
  const showHeaderIcons = !HIDE_HEADER_ICONS_ON.includes(pathname);
  const [unlockQueue, setUnlockQueue] = useState<WristbandDef[]>([]);
  const { mode: colorblindMode } = useColorblindMode();

  useEffect(() => {
    // Checked on initial load, whenever the PWA comes back to the
    // foreground (a wristband like "Show day" can flip from locked to
    // unlocked purely because time passed, with no action taken in-app),
    // and whenever something explicitly signals a fresh achievement (like
    // finishing a create/save) — that last one matters because navigating
    // within the app is a client-side route change, not a fresh mount, so
    // without it an in-session unlock wouldn't show until the next time
    // the app happens to be backgrounded and reopened.
    function check() {
      const fresh = checkForNewWristbands();
      if (fresh.length > 0) setUnlockQueue((q) => [...q, ...fresh]);
    }
    check();
    function onVisible() {
      if (document.visibilityState === "visible") check();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(WRISTBAND_CHECK_EVENT, check);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(WRISTBAND_CHECK_EVENT, check);
    };
  }, []);

  const current = unlockQueue[0] || null;

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => setUnlockQueue((q) => q.slice(1)), 6000);
    return () => clearTimeout(timer);
  }, [current]);

  return (
    <>
      {children}
      {showHeaderIcons && (
        <div
          className="fixed left-0 right-0 z-40 pointer-events-none"
          style={{ top: "calc(env(safe-area-inset-top) + 1.5rem)" }}
        >
          <div className="max-w-lg mx-auto px-6 flex justify-end">
            <div className="flex items-center gap-2 pointer-events-auto">
              <ThemeToggle className="w-9 h-9 rounded-xl bg-surfaceAlt text-muted" />
              <SettingsButton className="w-9 h-9 rounded-xl bg-surfaceAlt text-muted" />
            </div>
          </div>
        </div>
      )}
      {current && (
        <WristbandUnlockToast
          wristband={current}
          color={colorForWristband(current, colorblindMode)}
          onClick={() => {
            setUnlockQueue((q) => q.slice(1));
            router.push("/wristbands");
          }}
        />
      )}
      {showNav && <BottomNav />}
    </>
  );
}
