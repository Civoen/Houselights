"use client";
import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLineup } from "@/lib/lineupStore";
import { GradientButton } from "@/components/GradientButton";
import { haptic, HAPTIC } from "@/lib/haptics";
import { copy } from "@/lib/copy";

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
        <div className="w-14 h-14 rounded-full bg-grad mx-auto mb-5 flex items-center justify-center animate-ring-pop">
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
