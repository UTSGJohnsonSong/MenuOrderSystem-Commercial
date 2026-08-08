"use client";

/*
 * 「添加到主屏幕」引导页。
 * PWA 在 iOS Safari 上没有安装提示，必须图文教；Android/桌面浏览器给通用说明。
 * 纯静态引导，不打断任何主流程。
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clientTrack } from "@/lib/client-track";

type Platform = "ios" | "android" | "desktop" | "standalone" | "inapp";

/* 内置浏览器里**装不了**桌面图标——微信、QQ、微博这些 WebView 都没有
 * 「添加到主屏幕」这个菜单项。而这个产品的流量路径正是
 * 小红书 → 微信群 → 在微信里点开，所以这是最常见的一种情况，
 * 不能让它掉进「安卓通用步骤」里照着一个不存在的菜单找。 */
function detectInApp(ua: string): string | null {
  if (/MicroMessenger/i.test(ua)) return "微信";
  if (/QQ\/[0-9]/i.test(ua) || /QQBrowser/i.test(ua)) return "QQ";
  if (/Weibo/i.test(ua)) return "微博";
  if (/DingTalk/i.test(ua)) return "钉钉";
  if (/XiaoHongShu|discover/i.test(ua)) return "小红书";
  return null;
}

function detectPlatform(): Platform {
  if (typeof window === "undefined") return "desktop";
  if (window.matchMedia("(display-mode: standalone)").matches
    || (navigator as { standalone?: boolean }).standalone) return "standalone";
  const ua = navigator.userAgent;
  if (detectInApp(ua)) return "inapp";
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

/* 一次会话只上报一次曝光，避免来回返回这一页把分母灌大。
 * 和 SourceTracker 一样是模块级变量：整页刷新会重置，这一页没必要更精确。 */
let viewReported = false;

export default function InstallPage() {
  const router = useRouter();
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [inApp, setInApp] = useState<string | null>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const detected = detectPlatform();
    setPlatform(detected);
    setInApp(detectInApp(navigator.userAgent));
    setIsIOS(/iPhone|iPad|iPod/i.test(navigator.userAgent));

    /* meta 带上平台，因为这一页真正要回答的问题是「有多少人卡在
     * 装不了的内置浏览器里」——inapp 的占比决定要不要把引导重心
     * 从「怎么装」改成「先用浏览器打开」。 */
    if (!viewReported) {
      viewReported = true;
      clientTrack("install_prompt_view", detected);
    }
  }, []);

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

        {platform === "inapp" && (
          <>
            <div style={{
              backgroundColor: "#FFF1DD", borderRadius: "18px", padding: "16px",
              border: "1.5px solid rgba(240,210,170,0.7)", marginBottom: "16px", textAlign: "left",
            }}>
              <p style={{ color: "#C47A2C", fontSize: "0.9375rem", fontWeight: 700, lineHeight: 1.6 }}>
                你现在是在{inApp}里打开的
              </p>
              <p style={{ color: "#8A6F5A", fontSize: "0.875rem", marginTop: "6px", lineHeight: 1.6 }}>
                {inApp}自带的浏览器装不了桌面图标，要先跳到手机自己的浏览器。
              </p>
            </div>
            <Step n={1}>
              点右上角的 <strong>···</strong>
              <span style={{ color: "#9A7B5F" }}>（三个点）</span>
            </Step>
            <Step n={2}>
              选 <strong>{isIOS ? "「在Safari中打开」" : "「在浏览器打开」"}</strong>
            </Step>
            <Step n={3}>
              到了浏览器里，再打开这个页面，会有对应的安装步骤
            </Step>
            <p style={{ color: "#C8A878", fontSize: "0.75rem", textAlign: "center", marginTop: "16px", lineHeight: 1.6 }}>
              不装也完全能用，只是每次要翻链接。<br />装了以后点桌面图标就进来。
            </p>
          </>
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
              找不到「添加到主屏幕」的话，<br />确认一下当前是 Safari，不是别的 App 里的浏览器。
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
              各家浏览器叫法不一样：华为叫「添加到桌面」，<br />
              小米 / OPPO / vivo 多是「添加到主屏幕」，Chrome 是「安装应用」。<br />
              都找不到的话，换 Chrome 打开这个页面最稳。
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
