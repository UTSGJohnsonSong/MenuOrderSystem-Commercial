"use client";

/*
 * 「添加到主屏幕」引导页。
 * PWA 在 iOS Safari 上没有安装提示，必须图文教；Android/桌面浏览器给通用说明。
 * 纯静态引导，不打断任何主流程。
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Platform = "ios" | "android" | "desktop" | "standalone";

function detectPlatform(): Platform {
  if (typeof window === "undefined") return "desktop";
  if (window.matchMedia("(display-mode: standalone)").matches
    || (navigator as { standalone?: boolean }).standalone) return "standalone";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", gap: "14px", alignItems: "flex-start",
      backgroundColor: "#FFFFFF", borderRadius: "18px", padding: "16px",
      border: "1.5px solid rgba(240,210,170,0.5)",
      marginBottom: "12px", textAlign: "left",
    }}>
      <span style={{
        flexShrink: 0, width: "26px", height: "26px", borderRadius: "50%",
        backgroundColor: "#FFF1DD", color: "#C47A2C",
        fontSize: "0.8125rem", fontWeight: 800,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>{n}</span>
      <p style={{ color: "#3A2A1A", fontSize: "0.9375rem", lineHeight: 1.6, paddingTop: "2px" }}>
        {children}
      </p>
    </div>
  );
}

export default function InstallPage() {
  const router = useRouter();
  const [platform, setPlatform] = useState<Platform | null>(null);

  useEffect(() => { setPlatform(detectPlatform()); }, []);

  if (!platform) return null;

  return (
    <div style={{
      minHeight: "100dvh",
      background: "linear-gradient(180deg, #FFFDF8 0%, #FFF3E0 100%)",
      padding: "0 28px 40px",
    }}>
      <div style={{ padding: "20px 0 8px" }}>
        <button onClick={() => router.back()} style={{
          color: "#9A7B5F", fontSize: "0.875rem",
          border: "none", background: "none", cursor: "pointer", padding: 0,
        }}>← 返回</button>
      </div>

      <div style={{ textAlign: "center", paddingTop: "16px" }}>
        <div style={{ fontSize: "3rem", marginBottom: "12px" }}>📱</div>
        <h1 style={{ color: "#3A2A1A", fontSize: "1.375rem", fontWeight: 800, lineHeight: 1.4 }}>
          把小厨房放到手机桌面
        </h1>
        <p style={{ color: "#9A7B5F", fontSize: "0.875rem", marginTop: "8px", lineHeight: 1.6 }}>
          下次点菜不用翻链接，点图标就进来。
        </p>
      </div>

      <div style={{ marginTop: "28px" }}>
        {platform === "standalone" && (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <p style={{ fontSize: "2rem" }}>🎉</p>
            <p style={{ color: "#3A2A1A", fontSize: "1rem", fontWeight: 700, marginTop: "10px" }}>
              已经装好啦！
            </p>
            <p style={{ color: "#9A7B5F", fontSize: "0.875rem", marginTop: "6px" }}>
              你现在就是从桌面图标打开的，去点菜吧～
            </p>
          </div>
        )}

        {platform === "ios" && (
          <>
            <Step n={1}>
              点击 Safari 底部中间的<strong>分享按钮</strong>
              <span style={{ color: "#9A7B5F" }}>（方框加向上箭头 ⬆️ 的那个图标）</span>
            </Step>
            <Step n={2}>
              往下滑，找到并点击<strong>「添加到主屏幕」</strong>
            </Step>
            <Step n={3}>
              点右上角<strong>「添加」</strong>，就完成啦
            </Step>
            <p style={{ color: "#C8A878", fontSize: "0.75rem", textAlign: "center", marginTop: "16px", lineHeight: 1.6 }}>
              如果你是在微信里打开的，先点右上角「···」<br />选「在浏览器打开」，再按上面的步骤来。
            </p>
          </>
        )}

        {platform === "android" && (
          <>
            <Step n={1}>
              点击浏览器右上角的<strong>菜单按钮</strong>（通常是 ⋮）
            </Step>
            <Step n={2}>
              选择<strong>「添加到主屏幕」</strong>或<strong>「安装应用」</strong>
            </Step>
            <Step n={3}>
              确认添加，桌面上就有小厨房的图标啦
            </Step>
            <p style={{ color: "#C8A878", fontSize: "0.75rem", textAlign: "center", marginTop: "16px", lineHeight: 1.6 }}>
              不同手机浏览器的菜单位置略有不同，<br />找「添加到主屏幕」这几个字就对了。
            </p>
          </>
        )}

        {platform === "desktop" && (
          <>
            <Step n={1}>
              用<strong>手机浏览器</strong>打开这个网站（电脑上不需要安装）
            </Step>
            <Step n={2}>
              iPhone 用 Safari 的分享按钮 → 「添加到主屏幕」；<br />
              安卓用浏览器菜单 → 「添加到主屏幕」
            </Step>
            <p style={{ color: "#C8A878", fontSize: "0.75rem", textAlign: "center", marginTop: "16px" }}>
              也可以把链接发到手机上再打开这个页面，会有对应的步骤。
            </p>
          </>
        )}
      </div>
    </div>
  );
}
