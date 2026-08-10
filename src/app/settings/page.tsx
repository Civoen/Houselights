"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { copy } from "@/lib/copy";

export default function SettingsPage() {
  const router = useRouter();
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((d) => setConnected(!!d.connected))
      .catch(() => setConnected(false));
  }, []);

  return (
    <main className="min-h-screen pb-24 animate-fade-slide-up">
      <div className="px-6 pb-2 pt-[calc(env(safe-area-inset-top)+1.5rem)] max-w-lg mx-auto w-full">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-surfaceAlt text-muted flex items-center justify-center transition-transform duration-150 active:scale-90 mb-3"
        >
          ‹
        </button>
        <h1 className="font-display text-3xl font-bold tracking-tight">{copy.settings.title}</h1>
      </div>

      <div className="px-6 py-5 max-w-lg mx-auto">
        <div className="text-[11px] font-extrabold uppercase tracking-wide text-faint mb-2">{copy.settings.accountLabel}</div>
        <div className="bg-surface rounded-2xl p-4 mb-3 shadow-[0_10px_28px_-16px_rgba(10,31,38,0.25)]">
          <div className="flex items-center gap-2 mb-1">
            <span className={"w-2 h-2 rounded-full " + (connected ? "bg-green" : "bg-faint")} />
            <span className="text-sm font-bold">
              {connected === null ? copy.settings.checking : connected ? copy.settings.connected : copy.settings.notConnected}
            </span>
          </div>
          <p className="text-xs text-faint">
            {connected
              ? copy.settings.connectedNote
              : copy.settings.notConnectedNote}
          </p>
        </div>

        {connected && (
          <div className="flex flex-col gap-2">
            <a
              href="/api/auth/login?switch=1"
              className="w-full text-center py-3 rounded-xl bg-surface text-muted text-sm font-bold shadow-[0_6px_18px_-10px_rgba(10,31,38,0.2)] transition-all duration-150 active:scale-[0.98]"
            >
              {copy.settings.switchAccount}
            </a>
            <a
              href="/api/auth/logout"
              className="w-full text-center py-3 rounded-xl bg-surface text-red-500 text-sm font-bold shadow-[0_6px_18px_-10px_rgba(10,31,38,0.2)] transition-all duration-150 active:scale-[0.98]"
            >
              {copy.settings.logout}
            </a>
          </div>
        )}

        <p className="text-[11px] text-faint mt-6 text-center">
          {copy.settings.switchNote}
        </p>
      </div>
    </main>
  );
}
