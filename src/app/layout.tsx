import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LineupProvider } from "@/lib/lineupStore";
import { AppChrome } from "@/components/AppChrome";

export const metadata: Metadata = {
  title: "Houselights",
  description: "Know the artists before you see them.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Houselights",
  },
};

export const viewport: Viewport = {
  themeColor: "#0D9488",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-body min-h-screen">
        <LineupProvider>
          <AppChrome>{children}</AppChrome>
        </LineupProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function () {
                  navigator.serviceWorker.register('/sw.js').catch(function () {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
