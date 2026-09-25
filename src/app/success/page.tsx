"use client";
import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLineup } from "@/lib/lineupStore";
import { GradientButton } from "@/components/GradientButton";
import { haptic, HAPTIC } from "@/lib/haptics";
import { copy } from "@/lib/copy";

// Bigger, wider-spread version of the same particle-burst technique used
// for Wristband unlocks — this moment (a real playlist just went live on
// Spotify) is arguably the bigger achievement of the two, so it gets more
// particles and more spread rather than reusing the toast's exact values.
const PARTICLES = [
  { x: -70, y: -50, color: "#F5A623", delay: 0 },
  { x: 65, y: -55, color: "#14CC9B", delay: 40 },
  { x: -85, y: 10, color: "#4FA8E8", delay: 80 },
  { x: 80, y: 15, color: "#E14D9F", delay: 20 },
  { x: -40, y: -80, color: "#8BC34A", delay: 120 },
  { x: 40, y: -85, color: "#F5A623", delay: 60 },
  { x: -65, y: 60, color: "#4FA8E8", delay: 100 },
  { x: 70, y: 65, color: "#14CC9B", delay: 140 },
  { x: 0, y: -95, color: "#E14D9F", delay: 30 },
  { x: -95, y: -20, color: "#8BC34A", delay: 90 },
  { x: 95, y: -15, color: "#F5A623", delay: 50 },
  { x: 0, y: 90, color: "#4FA8E8", delay: 110 },
];

function SuccessInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { playlist, reset } = useLineup();
  const url = params.get("url");
  const name = params.get("name") || copy.success.fallbackName;
  const isFirst = params.get("first") === "1";
  const wasUpdated = params.get("updated") === "1";
  const coverFailed = params.get("coverFailed") === "1";
  const coverErrorStatus = params.get("coverErrorStatus");
  const coverErrorBody = params.get("coverErrorBody");
  const totalMs = playlist.reduce((s, t) => s + t.durationMs, 0);
  const totalMin = Math.round(totalMs / 60000);

  useEffect(() => {
    haptic(HAPTIC.success);
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center animate-fade-slide-up">
        <div className="relative w-14 h-14 mx-auto mb-5">
          <div className="absolute inset-0 rounded-full bg-grad blur-lg opacity-60 scale-150 animate-pulse" aria-hidden="true" />
          {!wasUpdated &&
            PARTICLES.map((p, i) => (
              <span
                key={i}
                className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full animate-confetti-burst pointer-events-none"
                style={
                  {
                    backgroundColor: p.color,
                    animationDelay: `${p.delay}ms`,
                    "--burst-transform": `translate(${p.x}px, ${p.y}px) scale(0)`,
                  } as React.CSSProperties
                }
                aria-hidden="true"
              />
            ))}
          <div className="relative w-14 h-14 rounded-full bg-grad flex items-center justify-center animate-ring-pop">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 13l4 4L19 7"
                stroke="#fff"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="24"
                strokeDashoffset="24"
                className="animate-check-draw"
              />
            </svg>
          </div>
        </div>
        <h1 className="font-display text-xl font-bold mb-1">
          {wasUpdated ? copy.success.updatedTitle : isFirst ? copy.success.firstTitle : copy.success.title}
        </h1>
        <p className="text-sm text-muted mb-1">{name}</p>
        <p className="text-xs text-faint mb-8">
          {playlist.length} tracks · {totalMin} min
          {isFirst && ` · ${copy.success.firstSuffix}`}
        </p>
        {coverFailed && (
          <div className="-mt-6 mb-8">
            <p className="text-xs text-red-600">
              {copy.success.coverFailed}
              {coverErrorStatus && ` (${coverErrorStatus})`}
            </p>
            {coverErrorBody && <p className="text-xs text-faint mt-1 font-mono break-words">{coverErrorBody}</p>}
          </div>
        )}
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="block w-full bg-grad text-white py-4 rounded-2xl font-extrabold text-sm mb-3 transition-all duration-150 hover:brightness-[1.05] hover:scale-[1.02] active:scale-[0.97]"
          >
            {copy.success.openInSpotify}
          </a>
        )}
        <button
          onClick={() => {
            haptic(HAPTIC.tap);
            reset();
            router.push("/lineup");
          }}
          className="block w-full bg-surface text-muted py-3.5 rounded-2xl font-bold text-sm shadow-[0_10px_24px_-16px_rgba(10,31,38,0.3)] transition-all duration-150 active:scale-[0.97] mb-3"
        >
          {copy.success.buildAnother}
        </button>
        <button
          onClick={() => {
            haptic(HAPTIC.tap);
            reset();
            router.push("/playlists");
          }}
          className="block w-full bg-surface text-muted py-3.5 rounded-2xl font-bold text-sm shadow-[0_10px_24px_-16px_rgba(10,31,38,0.3)] transition-all duration-150 active:scale-[0.97]"
        >
          {copy.success.viewPlaylists}
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
