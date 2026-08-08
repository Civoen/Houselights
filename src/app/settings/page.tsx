"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/themeStore";
import { haptic, HAPTIC } from "@/lib/haptics";

export default function SettingsPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [connected, setConnected] = useState<boolean | null>(null);
  const isDark = theme === "dark";

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((d) => setConnected(!!d.connected))
      .catch(() => setConnected(false));
  }, []);

  return (
    <main className="min-h-screen pb-24 animate-fade-slide-up">
      <div className="bg-grad text-white px-6 pt-10 pb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center transition-transform duration-150 active:scale-90 hover:bg-white/30"
          >
            ‹
          </button>
          <h1 className="font-display text-xl font-bold">Settings</h1>
        </div>
      </div>

      <div className="px-6 py-5 max-w-lg mx-auto">
        <div className="text-[11px] font-extrabold uppercase tracking-wide text-faint mb-2">Appearance</div>
        <button
          onClick={() => {
            haptic(HAPTIC.tap);
            toggleTheme();
          }}
          className="w-full flex items-center justify-between bg-surface border border-line rounded-2xl px-4 py-4 mb-6 transition-transform duration-150 active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-surfaceAlt flex items-center justify-center text-teal">
              {isDark ? (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" />
                  <path
                    d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8L6 18M18 6l1.8-1.8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M20 14.5A8.5 8.5 0 0110.5 4a7 7 0 109.5 10.5z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <div className="text-left">
              <div className="text-sm font-bold">{isDark ? "Lights down" : "Lights up"}</div>
              <div className="text-xs text-faint">Tap to switch to {isDark ? "light" : "dark"} mode</div>
            </div>
          </div>
          <div
            className={
              "w-11 h-6 rounded-full flex items-center px-0.5 transition-colors duration-200 " +
              (isDark ? "bg-grad justify-end" : "bg-surfaceAlt justify-start border border-lineStrong")
            }
          >
            <div className="w-5 h-5 rounded-full bg-white shadow" />
          </div>
        </button>

        <div className="text-[11px] font-extrabold uppercase tracking-wide text-faint mb-2">Account</div>
        <div className="bg-surface border border-line rounded-2xl p-4 mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className={"w-2 h-2 rounded-full " + (connected ? "bg-green" : "bg-faint")} />
            <span className="text-sm font-bold">
              {connected === null ? "Checking..." : connected ? "Connected to Spotify" : "Not connected"}
            </span>
          </div>
          <p className="text-xs text-faint">
            {connected
              ? "Your session is active on this device."
              : "Connect from the home screen to build a lineup."}
          </p>
        </div>

        {connected && (
          <div className="flex flex-col gap-2">
            <a
              href="/api/auth/login?switch=1"
              className="w-full text-center py-3 rounded-xl border border-lineStrong text-muted text-sm font-bold transition-all duration-150 active:scale-[0.98] hover:bg-surfaceAlt"
            >
              Switch account
            </a>
            <a
              href="/api/auth/logout"
              className="w-full text-center py-3 rounded-xl border border-red-200 text-red-500 text-sm font-bold transition-all duration-150 active:scale-[0.98] hover:bg-red-50"
            >
              Log out
            </a>
          </div>
        )}

        <p className="text-[11px] text-faint mt-6 text-center">
          Switching account sends you back through Spotify's login screen, so you can
          sign in with a different account if you have more than one.
        </p>
      </div>
    </main>
  );
}
