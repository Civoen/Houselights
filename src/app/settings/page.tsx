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
      <div className="bg-grad text-white px-6 pt-10 pb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center transition-transform duration-150 active:scale-90 hover:bg-white/30"
          >
            ‹
          </button>
          <h1 className="font-display text-xl font-bold">{copy.settings.title}</h1>
        </div>
      </div>

      <div className="px-6 py-5 max-w-lg mx-auto">
        <div className="text-[11px] font-extrabold uppercase tracking-wide text-faint mb-2">{copy.settings.accountLabel}</div>
        <div className="bg-surface border border-line rounded-2xl p-4 mb-3">
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
              className="w-full text-center py-3 rounded-xl border border-lineStrong text-muted text-sm font-bold transition-all duration-150 active:scale-[0.98] hover:bg-surfaceAlt"
            >
              {copy.settings.switchAccount}
            </a>
            <a
              href="/api/auth/logout"
              className="w-full text-center py-3 rounded-xl border border-red-200 text-red-500 text-sm font-bold transition-all duration-150 active:scale-[0.98] hover:bg-red-50"
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
