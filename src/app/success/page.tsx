"use client";
import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLineup } from "@/lib/lineupStore";
import { GradientButton } from "@/components/GradientButton";

function SuccessInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { playlist, reset } = useLineup();
  const url = params.get("url");
  const name = params.get("name") || "Your playlist";
  const totalMs = playlist.reduce((s, t) => s + t.durationMs, 0);
  const totalMin = Math.round(totalMs / 60000);

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center">
        <div className="w-14 h-14 rounded-full bg-grad mx-auto mb-5 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="font-display text-xl font-bold mb-1">Added to Spotify</h1>
        <p className="text-sm text-muted mb-1">{name}</p>
        <p className="text-xs text-faint mb-8">
          {playlist.length} tracks · {totalMin} min
        </p>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="block w-full bg-grad text-white py-4 rounded-2xl font-extrabold text-sm mb-3"
          >
            Open in Spotify
          </a>
        )}
        <button
          onClick={() => {
            reset();
            router.push("/lineup");
          }}
          className="block w-full border border-lineStrong text-muted py-3.5 rounded-2xl font-bold text-sm"
        >
          Build another
        </button>
      </div>
    </main>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessInner />
    </Suspense>
  );
}
