"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { clientTrack } from "@/lib/client-track";

/*
 * 落地页来源追踪：
 * 1. 把 ?from=xhs01 存进 sessionStorage，注册时随 verify 请求写入 users.source
 * 2. 记一条 welcome_view 事件（转化漏斗的分母），每个浏览器会话只记一次
 * 挂在 /welcome 里，Suspense 包裹避免整页变动态渲染。
 */
export const SOURCE_KEY = "fm-source";

/* Fallback de-dupe for when sessionStorage is unavailable. Survives client-side
 * navigation but not a full reload, so welcome_view can still double-count a
 * storage-blocked visitor who reloads. That is deliberate: this is the funnel's
 * denominator, and losing visitors entirely would overstate conversion, which is
 * the more misleading direction. */
let viewedThisSession = false;

function Tracker() {
  const params = useSearchParams();

  useEffect(() => {
    const from = (params.get("from") ?? "").slice(0, 32);

    /* sessionStorage throws (it does not return null) when storage is blocked —
     * WeChat's in-app browser and Safari with "Block All Cookies". This effect
     * runs on /welcome, so an uncaught throw here unmounts the landing page to
     * the error boundary: no sign-up path, and the ICP number required by the
     * filing disappears with it. Storage is best-effort; the page is not. */
    let alreadyViewed = viewedThisSession;
    try {
      if (from) sessionStorage.setItem(SOURCE_KEY, from);
      alreadyViewed = sessionStorage.getItem("fm-welcome-viewed") !== null;
      if (!alreadyViewed) sessionStorage.setItem("fm-welcome-viewed", "1");
    } catch {
      /* storage off — fall back to the in-memory flag above */
    }

    if (!alreadyViewed) {
      viewedThisSession = true;
      clientTrack("welcome_view", from);
    }
  }, [params]);

  return null;
}

export default function SourceTracker() {
  return (
    <Suspense fallback={null}>
      <Tracker />
    </Suspense>
  );
}
