"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

/*
 * 落地页来源追踪：
 * 1. 把 ?from=xhs01 存进 sessionStorage，注册时随 verify 请求写入 users.source
 * 2. 记一条 welcome_view 事件（转化漏斗的分母），每个浏览器会话只记一次
 * 挂在 /welcome 里，Suspense 包裹避免整页变动态渲染。
 */
export const SOURCE_KEY = "fm-source";

function Tracker() {
  const params = useSearchParams();

  useEffect(() => {
    const from = (params.get("from") ?? "").slice(0, 32);
    if (from) sessionStorage.setItem(SOURCE_KEY, from);

    if (!sessionStorage.getItem("fm-welcome-viewed")) {
      sessionStorage.setItem("fm-welcome-viewed", "1");
      fetch("/api/events", {
        method: "POST",
        body: JSON.stringify({ name: "welcome_view", meta: from }),
      }).catch(() => {});
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
