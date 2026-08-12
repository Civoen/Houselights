"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { copy } from "@/lib/copy";
import { BrandMark } from "@/components/BrandMark";

export default function Home() {
  const router = useRouter();
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((d) => setConnected(!!d.connected))
      .catch(() => setConnected(false));
  }, []);

  useEffect(() => {
    if (connected) router.replace("/playlists");
  }, [connected, router]);

  return (
    <main className="min-h-screen flex items-center justify-center px-6 pb-16 relative">
      <div className="max-w-sm w-full text-center animate-fade-slide-up">
        <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center animate-lights-up">
          <BrandMark size={56} />
        </div>
        <h1 className="font-display text-2xl font-bold mb-2">Houselights</h1>
        <p className="text-muted text-sm mb-8">{copy.home.tagline}</p>
        {!connected && (
          <a
            href="/api/auth/login"
            className="inline-block w-full bg-grad text-white py-4 rounded-2xl font-extrabold text-sm transition-all duration-150 hover:brightness-[1.05] hover:scale-[1.02] active:scale-[0.97]"
          >
            {copy.home.ctaConnect}
          </a>
        )}
      </div>
    </main>
  );
}
