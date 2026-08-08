"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((d) => setConnected(!!d.connected))
      .catch(() => setConnected(false));
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center animate-fade-slide-up">
        <div className="w-16 h-16 rounded-full bg-grad mx-auto mb-6 flex items-center justify-center animate-lights-up">
          <span className="font-display text-2xl font-bold text-white">H</span>
        </div>
        <h1 className="font-display text-2xl font-bold mb-2">Houselights</h1>
        <p className="text-muted text-sm mb-8">Know the artists before you see them.</p>

        {connected ? (
          <Link
            href="/lineup"
            className="inline-block w-full bg-grad text-white py-4 rounded-2xl font-extrabold text-sm transition-all duration-150 hover:brightness-[1.05] active:scale-[0.97]"
          >
            Build your lineup
          </Link>
        ) : (
          <>
            <a
              href="/api/auth/login"
              className="inline-block w-full bg-grad text-white py-4 rounded-2xl font-extrabold text-sm transition-all duration-150 hover:brightness-[1.05] active:scale-[0.97] animate-soft-glow"
            >
              Connect Spotify
            </a>
            <p className="text-xs text-faint mt-3">
              You'll need Spotify Premium, and your account added to this app's allowlist.
            </p>
          </>
        )}

        {connected && (
          <p className="text-xs text-faint mt-3">Connected to Spotify</p>
        )}
      </div>
    </main>
  );
}
