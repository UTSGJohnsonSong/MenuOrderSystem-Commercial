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
  // 键盘弹出时浮在页面上方，而不是压缩布局视口——否则安卓上
  // 100dvh 的页面会在聚焦输入框的瞬间整体上移/重排，很违和
  interactiveWidget: "resizes-visual",
};

/* ── Metadata ── */
export const metadata: Metadata = {
  title: "今天吃什么呀",
  description: "和对象、室友一起维护你们自己的菜单库",
  manifest: "/manifest.json",

  /* iOS PWA */
  appleWebApp: {
    capable: true,
    title: "吃什么呀",
    statusBarStyle: "default",   // Light iOS status bar (fits cream top)
  },

  /* OG / share preview */
  openGraph: {
    title: "今天吃什么呀",
    description: "和对象、室友一起维护你们自己的菜单库",
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
