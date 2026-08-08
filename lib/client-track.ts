"use client";

/*
 * 客户端埋点，只用于**服务器看不见**的动作（落地页曝光、复制邀请、安装引导曝光）。
 * 经过服务器的动作一律在 lib/track.ts 里打，那边不会被网络抖动和广告拦截漏掉。
 *
 * 事件名必须先加进 app/api/events/route.ts 的白名单，否则服务端返回 400 丢弃。
 *
 * keepalive: 复制完邀请文案的下一步几乎必然是切到微信——页面被挂起时普通 fetch
 * 会被浏览器取消，keepalive 让请求在页面离开后仍然发出去。这正是北极星指标的
 * 分母，漏掉它会让邀请成功率虚高。
 *
 * 失败静默：埋点不能打断用户正在做的事，也不值得弹任何提示。
 */
export function clientTrack(name: string, meta = ""): void {
  fetch("/api/events", {
    method: "POST",
    body: JSON.stringify({ name, meta }),
    keepalive: true,
  }).catch(() => {});
}
