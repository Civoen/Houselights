import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LineupProvider } from "@/lib/lineupStore";
import { ThemeProvider } from "@/lib/themeStore";
import { AppChrome } from "@/components/AppChrome";

export const metadata: Metadata = {
  title: "Houselights",
  description: "Create better playlists.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Houselights",
  },
};

export const viewport: Viewport = {
  themeColor: "#115067",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-body min-h-screen">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var stored = localStorage.getItem('houselights_theme');
                  var dark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (dark) document.documentElement.classList.add('dark');
                } catch (e) {}
              })();
            `,
          }}
        />
        <ThemeProvider>
          <LineupProvider>
            <AppChrome>{children}</AppChrome>
          </LineupProvider>
        </ThemeProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function () {
                  navigator.serviceWorker.register('/sw.js').catch(function () {});
                });
              }
              (function () {
                var RELOAD_KEY = 'hl_chunk_reload_attempted';
                function isChunkError(msg) {
                  return typeof msg === 'string' && (
                    msg.indexOf('ChunkLoadError') !== -1 ||
                    msg.indexOf('Loading chunk') !== -1 ||
                    msg.indexOf('Failed to fetch dynamically imported module') !== -1
                  );
                }
                function recoverOnce() {
                  if (sessionStorage.getItem(RELOAD_KEY)) return;
                  sessionStorage.setItem(RELOAD_KEY, '1');
                  window.location.reload();
                }
                window.addEventListener('error', function (e) {
                  if (isChunkError(e && e.message)) recoverOnce();
                });
                window.addEventListener('unhandledrejection', function (e) {
                  var msg = e && e.reason && (e.reason.message || String(e.reason));
                  if (isChunkError(msg)) recoverOnce();
                });
                window.addEventListener('load', function () {
                  setTimeout(function () {
                    sessionStorage.removeItem(RELOAD_KEY);
                  }, 8000);
                });
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
