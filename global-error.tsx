"use client";
import { useEffect } from "react";

// Catches errors in the root layout itself, which the regular error.tsx
// can't — it's rendered inside that layout, so if the layout is what
// broke, error.tsx never mounts. This replaces the entire document when
// triggered, so it needs its own <html>/<body> rather than relying on
// the (possibly broken) root layout to provide them.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body style={{ margin: 0, fontFamily: "sans-serif", background: "#F6F7F5", color: "#0A1F26" }}>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <div style={{ maxWidth: 360, width: "100%" }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Something broke</h1>
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
              {error.message || "An unknown error occurred."}
            </p>
            {error.digest && (
              <p style={{ fontSize: 12, color: "#93A0AB", fontFamily: "monospace", marginBottom: 16 }}>
                Code: {error.digest}
              </p>
            )}
            {error.stack && (
              <pre
                style={{
                  textAlign: "left",
                  fontSize: 10,
                  lineHeight: 1.5,
                  color: "#93A0AB",
                  background: "#EEF1F0",
                  borderRadius: 12,
                  padding: 12,
                  overflow: "auto",
                  maxHeight: 200,
                  marginBottom: 16,
                  whiteSpace: "pre-wrap",
                }}
              >
                {error.stack}
              </pre>
            )}
            <button
              onClick={reset}
              style={{
                width: "100%",
                background: "linear-gradient(115deg, #115067, #14CC9B)",
                color: "white",
                padding: "12px 0",
                borderRadius: 16,
                fontWeight: 700,
                fontSize: 14,
                border: "none",
              }}
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
