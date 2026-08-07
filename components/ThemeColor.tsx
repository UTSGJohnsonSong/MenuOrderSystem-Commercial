"use client";

import { useEffect } from "react";

/*
 * 把 <meta name="theme-color"> 换成指定颜色，组件卸载时还原。
 *
 * 为什么需要它：iOS Safari 的浏览模式下，网页内容**不会**延伸到状态栏底下
 * （那里 env(safe-area-inset-top) 就是 0，那条是 Safari 自己画的），
 * Safari 用 theme-color 给那条上色。点菜页的封面已经通栏顶到内容区最上沿，
 * 但状态栏那条如果还是全局的奶油色，视觉上就是「封面被削掉了上半截」——
 * 用户原话。安卓 Chrome 的地址栏同理。
 *
 * 加到主屏幕之后（standalone）状态栏由系统按 theme-color 画，这里同样生效。
 */
export default function ThemeColor({ color }: { color: string }) {
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) return;
    const previous = meta.content;
    meta.content = color;
    return () => { meta.content = previous; };
  }, [color]);

  return null;
}
