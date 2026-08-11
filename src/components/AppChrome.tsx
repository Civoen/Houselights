"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BottomNav } from "./BottomNav";
import { WristbandUnlockToast } from "./WristbandUnlockToast";
import { checkForNewWristbands } from "@/lib/wristbandTracker";
import { WristbandDef } from "@/lib/wristbands";

const HIDE_NAV_ON = ["/success"];

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const showNav = !HIDE_NAV_ON.includes(pathname);
  const [unlockQueue, setUnlockQueue] = useState<WristbandDef[]>([]);

  useEffect(() => {
    // Checked on initial load and whenever the PWA comes back to the
    // foreground — a wristband like "Show day" can flip from locked to
    // unlocked purely because time passed, with no action taken in-app,
    // so a fresh page load isn't the only moment this needs checking.
    function check() {
      const fresh = checkForNewWristbands();
      if (fresh.length > 0) setUnlockQueue((q) => [...q, ...fresh]);
    }
    check();
    function onVisible() {
      if (document.visibilityState === "visible") check();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
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
      {current && (
        <WristbandUnlockToast
          wristband={current}
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
