import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LineupProvider } from "@/lib/lineupStore";
import { ThemeProvider } from "@/lib/themeStore";
import { ColorblindProvider } from "@/lib/colorblindStore";
import { AppChrome } from "@/components/AppChrome";
import { copy } from "@/lib/copy";

// iOS's icon-grow launch animation ignores manifest.json's background_color
// entirely (that's an Android/Chrome behavior) — without explicit
// apple-touch-startup-image entries, it defaults to a plain white
// background behind the transition, which is the "white border" that shows
// up before the app opens. These are solid-color images (light/dark to
// match the current theme) sized for each current-generation iPhone.
const splashDevices = [
  { file: "6.7in", w: 430, h: 932, dpr: 3 },
  { file: "6.1in-3x", w: 393, h: 852, dpr: 3 },
  { file: "6.5in", w: 428, h: 926, dpr: 3 },
  { file: "6.1in", w: 390, h: 844, dpr: 3 },
  { file: "4.7in", w: 375, h: 667, dpr: 2 },
];

const startupImage = splashDevices.flatMap(({ file, w, h, dpr }) =>
  (["light", "dark"] as const).map((theme) => ({
    url: `/splash/${file}-${theme}.png`,
    media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait) and (prefers-color-scheme: ${theme})`,
  }))
);

export const metadata: Metadata = {
  title: copy.common.appName,
  description: copy.home.tagline,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: copy.common.appName,
    startupImage,
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
          <ColorblindProvider>
            <LineupProvider>
              <AppChrome>{children}</AppChrome>
            </LineupProvider>
          </ColorblindProvider>
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
