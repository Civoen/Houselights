"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { copy } from "@/lib/copy";
import { BrandMark } from "@/components/BrandMark";
import { useConnectionStatus } from "@/lib/useConnectionStatus";

export default function Home() {
  const router = useRouter();
  const connected = useConnectionStatus();

  useEffect(() => {
    if (connected) router.replace("/lineup");
  }, [connected, router]);

  return (
    <main className="min-h-screen flex items-center justify-center px-6 pb-16 relative">
      <div className="max-w-sm w-full text-center animate-fade-slide-up">
        <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center animate-lights-up">
          <BrandMark size={56} />
        </div>
        <h1 className="font-display text-2xl font-bold mb-2">{copy.common.appName}</h1>
        <p className="text-muted text-sm mb-8">{copy.home.tagline}</p>
        {!connected && (
          <>
            <a
              href="/api/auth/login"
              className="inline-block w-full bg-grad text-white py-4 rounded-2xl font-extrabold text-sm transition-all duration-150 hover:brightness-[1.05] hover:scale-[1.02] active:scale-[0.97]"
            >
              {copy.home.ctaConnect}
            </a>
            <button
              onClick={() => router.push("/lineup")}
              className="block w-full bg-surface text-muted py-4 rounded-2xl font-extrabold text-sm mt-3 shadow-[0_10px_24px_-16px_rgba(10,31,38,0.3)] transition-all duration-150 hover:scale-[1.01] active:scale-[0.97]"
            >
              {copy.home.ctaGuest}
            </button>
            <p className="text-[11px] text-faint mt-2">{copy.home.ctaGuestNote}</p>
          </>
        )}
      </div>
    </main>
  );
}
