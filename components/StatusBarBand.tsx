"use client";

import { usePathname } from "next/navigation";

/*
 * 已安装到主屏幕时，托在状态栏底下的深色带。
 *
 * 为什么需要它：app/layout.tsx 的 statusBarStyle 是 black-translucent——装到桌面后
 * 页面一直延伸到状态栏底下，好处是首页封面能真正铺到屏幕最顶端，代价是 iOS 会把
 * 时间/信号/电量画成**白色**压在页面内容上。而全站页面顶部实测亮度 0.98（接近纯白，
 * /shiji 和 /chufang 都是 rgb(255,248,239)），白字直接看不见。这条带子把它们托住。
 *
 * 为什么首页不渲染：首页那一条要留给封面本身——那正是做这件事的目的。封面自己在
 * 顶部画了一层渐变遮罩保证白字可读（见 app/page.tsx 的 scrim）。
 *
 * 为什么不需要 @media (display-mode: standalone)：env(safe-area-inset-top) 在 Safari
 * 标签页里本来就是 0，这条带子在浏览模式下高度为 0，等于不存在。也就是说这整个
 * 改动对「在微信里点开链接」的人没有任何影响。
 *
 * z-index 取 999：全站最高的是 100（弹层）。弹层多是浅色的，盖在带子上面同样会让
 * 白字消失，所以这条必须在所有内容之上。pointer-events: none 保证它不吃任何点击。
 */
export default function StatusBarBand() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "env(safe-area-inset-top)",
        backgroundColor: "#3A2A1A", // 全站正文色，白字对比度约 12:1
        zIndex: 999,
        pointerEvents: "none",
      }}
    />
  );
}
