"use client";

import { useEffect } from "react";

const STYLE_ID = "ktn-cover-tint";

/*
 * 让状态栏那一条跟着当前封面的颜色走，组件卸载时全部还原。
 *
 * 背景：点菜页的封面已经通栏顶到内容区最上沿，但状态栏那条仍是奶油色，
 * 视觉上就是「封面被削掉了上半截」——用户两次指出同一处。
 *
 * 这里同时改两样，因为它们各管一种情况，缺一不可：
 *
 * ① <meta name="theme-color">
 *    管的是安卓 Chrome 的地址栏、以及加到主屏幕之后（standalone）的状态栏。
 *
 * ② 手机宽度下的 body 背景色 ← 这个才是 iOS Safari 那条的决定因素
 *    Safari 浏览模式下网页内容不会延伸到状态栏底下（env(safe-area-inset-top) 在
 *    那里就是 0），那条是 Safari 用 **body 的背景色** 画的，而不是最顶端那个
 *    元素的颜色。只改 theme-color 在 iOS Safari 上没有效果——实测过。
 *
 *    用注入 <style> 而不是直接写 body.style：globals.css 里的 #EDE5D8 是
 *    桌面版 480px 列两侧的边框色，是有意为之的。媒体查询把改动限制在手机宽度，
 *    桌面上那圈框保持原样。
 */
export default function ThemeColor({ color }: { color: string }) {
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previousMeta = meta?.content;
    if (meta) meta.content = color;

    let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    // 断点跟 globals.css 里那条 body 底色规则保持一致（520px），
    // 否则 481~520px 的视口会落回那条的奶油色，接缝又回来了。
    style.textContent = `@media (max-width: 520px) { body { background-color: ${color}; } }`;

    return () => {
      if (meta && previousMeta !== undefined) meta.content = previousMeta;
      document.getElementById(STYLE_ID)?.remove();
    };
  }, [color]);

  return null;
}
