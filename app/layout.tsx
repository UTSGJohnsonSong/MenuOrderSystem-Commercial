import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import SwRegister from "@/components/SwRegister";

/* ── Viewport (separate export as required by Next.js 14+) ── */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",          // Extend behind iPhone notch / home bar
  themeColor: "#F5B460",         // Matches tab bar when app is active
};

/* ── Metadata ── */
export const metadata: Metadata = {
  title: "泽泽专属厨房",
  description: "我们的私家菜单",
  manifest: "/manifest.json",

  /* iOS PWA */
  appleWebApp: {
    capable: true,
    title: "泽泽厨房",
    statusBarStyle: "default",   // Light iOS status bar (fits cream top)
  },

  /* Prevent indexing (private family app) */
  robots: { index: false, follow: false },

  /* OG / share preview */
  openGraph: {
    title: "泽泽专属厨房",
    description: "我们的私家菜单",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        {/* Splash screen background while JS loads */}
        <meta name="msapplication-TileColor" content="#F5B460" />

        {/*
          apple-touch-startup-image is complex (one per screen size).
          We set background-color in manifest + theme-color to match
          the cream gradient so the launch splash looks intentional.
        */}
      </head>
      <body>
        {/* Register service worker (client-side, no-op in dev) */}
        <SwRegister />

        {/* App container — centered on desktop, full-width on mobile */}
        <div
          style={{
            maxWidth: "480px",
            margin: "0 auto",
            height: "100dvh",
            backgroundColor: "#FFF8EF",
            position: "relative",
            overflow: "hidden",   /* Body scroll locked; pages scroll internally */
          }}
        >
          {children}
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
