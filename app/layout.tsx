import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import GuestBar from "@/components/GuestBar";
import SwRegister from "@/components/SwRegister";
import StatusBarBand from "@/components/StatusBarBand";

/* ── Viewport (separate export as required by Next.js 14+) ── */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // 双指缩放会把这个固定 480px 宽的布局拖歪，而且 fixed 定位的底栏会跟着漂。
  // 注意：iOS Safari 标签页里 Apple 出于无障碍会忽略这两个字段（加到主屏后的
  // PWA 会遵守）。真正治「聚焦输入框时页面自己放大」的是把输入框字号设到
  // >= 16px —— 全站输入框都已经这么做了，不要再改回 0.875rem。
  maximumScale: 1,
  userScalable: false,
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
    /* black-translucent 让已安装的 PWA 把页面画到状态栏底下，首页封面因此能真正
     * 铺到屏幕最顶端，而不是补一条颜色（Safari 浏览模式下那条是浏览器自己的 UI，
     * 网页够不到，只能补色——见 components/ThemeColor.tsx）。
     *
     * 代价是 iOS 强制白色状态栏文字，而全站页面顶部实测亮度 0.98。
     * components/StatusBarBand.tsx 在首页以外的每一页垫一条深色带托住它，
     * 首页则由封面自己的顶部遮罩负责。
     *
     * ⚠️ 这个 meta 是**启动时读一次的静态值**，不能跟着封面动态切。所以不存在
     * 「深色封面才开」这种做法，要么全开要么全关。
     * ⚠️ 对浏览模式（微信/小红书点开链接的人）完全无影响。 */
    statusBarStyle: "black-translucent",
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

        {/* 状态栏底下的深色带（首页除外，那一条留给封面）。
            浏览模式下高度为 0，等于不存在。 */}
        <StatusBarBand />

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
          <GuestBar />
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
