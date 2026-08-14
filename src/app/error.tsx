"use client";
import { useEffect, useState } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [showStack, setShowStack] = useState(false);

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-sm w-full">
        <h1 className="font-display text-xl font-bold mb-2">Something broke</h1>
        <p className="text-sm text-ink font-semibold mb-1">{error.message || "An unknown error occurred."}</p>
        {error.digest && <p className="text-xs text-faint font-mono mb-4">Code: {error.digest}</p>}

        {error.stack && (
          <>
            <button
              onClick={() => setShowStack((v) => !v)}
              className="text-xs font-bold text-accent underline decoration-dotted underline-offset-4 mb-2"
            >
              {showStack ? "Hide" : "Show"} stack trace
            </button>
            {showStack && (
              <pre className="text-left text-[10px] leading-relaxed text-faint bg-surfaceAlt rounded-xl p-3 overflow-auto max-h-52 mb-4 whitespace-pre-wrap">
                {error.stack}
              </pre>
            )}
          </>
        )}

        <div className="flex flex-col gap-2 mt-4">
          <button
            onClick={reset}
            className="w-full bg-grad text-white py-3 rounded-2xl font-bold text-sm transition-all duration-150 active:scale-[0.97]"
          >
            Try again
          </button>
          
            href="/playlists"
            className="block w-full text-center bg-surface text-muted py-3 rounded-2xl font-bold text-sm shadow-[0_10px_24px_-16px_rgba(10,31,38,0.3)] transition-all duration-150 active:scale-[0.97]"
          >
            Go to Playlists
          </a>
        </div>
      </div>
    </main>
  );
}
