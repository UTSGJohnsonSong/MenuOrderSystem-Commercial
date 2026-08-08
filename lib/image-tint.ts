"use client";

/*
 * 取一张图**顶边**的平均色，用来染 iOS 状态栏那一条。
 *
 * 为什么需要它：Safari 浏览模式下，状态栏那条是浏览器自己的 UI，网页画不进去，
 * 只能给一个纯色（见 components/ThemeColor.tsx）。内置封面是渐变，顶色写死在
 * lib/covers.ts 里就行；但用户上传的照片颜色不可控，只能从图里现取——
 * 否则那条会停在上一个预设的颜色上，接缝比不改还明显。
 *
 * 为什么取的是顶边而不是整图主色：那条紧挨着封面的**最上面一行**。整图主色
 * 可能来自画面下半部分，贴上去照样是两截。
 *
 * 为什么缩到 1×1：浏览器的降采样就是加权平均，比自己遍历像素快也更准。
 * 顶边横向有色差时（半边天空半边墙）平均色是误差最小的单色选择——
 * 反正那一层只能放一个颜色。
 *
 * 同源要求：封面图是 /api/uploads/... 或 data: URL，都不会污染 canvas。
 * 万一以后换成外链图床，getImageData 会抛 SecurityError，这里按失败处理，
 * 调用方退回预设色。
 */

const SLICE = 0.08; // 取顶部 8% 的高度做平均
const cache = new Map<string, string | null>();

export function topEdgeColor(url: string): Promise<string | null> {
  const hit = cache.get(url);
  if (hit !== undefined) return Promise.resolve(hit);

  return new Promise(resolve => {
    const done = (v: string | null) => { cache.set(url, v); resolve(v); };

    const img = new Image();
    // data: URL 加了这个反而在部分浏览器里出问题，只给真实 URL 加
    if (!url.startsWith("data:")) img.crossOrigin = "anonymous";
    img.onerror = () => done(null);
    img.onload = () => {
      try {
        const sh = Math.max(1, Math.round(img.naturalHeight * SLICE));
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext("2d", { willReadFrequently: false });
        if (!ctx) return done(null);
        ctx.drawImage(img, 0, 0, img.naturalWidth, sh, 0, 0, 1, 1);
        const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
        // 全透明说明这张图上边是空的，染上去等于染了黑色
        if (a === 0) return done(null);
        done("#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join(""));
      } catch {
        done(null); // canvas 被跨域污染
      }
    };
    img.src = url;
  });
}
