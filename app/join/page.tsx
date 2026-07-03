"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function JoinContent() {
  const router = useRouter();
  const params = useSearchParams();
  const code = (params.get("code") ?? "").trim().toUpperCase();

  const [state, setState] = useState<"loading" | "ready" | "joining" | "error">(code ? "loading" : "error");
  const [spaceName, setSpaceName] = useState("");
  const [error, setError] = useState(code ? "" : "邀请链接不完整");
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    if (!code) return;
    Promise.all([
      fetch(`/api/space/preview?code=${code}`).then(r => r.json().then(d => ({ ok: r.ok, d }))),
      fetch("/api/auth/me").then(r => r.json()),
    ]).then(([preview, me]) => {
      if (!preview.ok) { setError(preview.d.error ?? "邀请码无效"); setState("error"); return; }
      if (preview.d.full) { setError("这个小厨房已经满员啦"); setState("error"); return; }
      setSpaceName(preview.d.name);
      setLoggedIn(!!me.user);
      setState("ready");
    }).catch(() => { setError("网络开小差了，请重试"); setState("error"); });
  }, [code]);

  const join = async () => {
    if (!loggedIn) {
      router.push(`/login?code=${code}`);
      return;
    }
    setState("joining");
    try {
      const res = await fetch("/api/space/join", { method: "POST", body: JSON.stringify({ code }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "加入失败");
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "加入失败");
      setState("error");
    }
  };

  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex", flexDirection: "column", justifyContent: "center",
      background: "linear-gradient(180deg, #FFFDF8 0%, #FFF3E0 100%)",
      padding: "0 28px 60px", textAlign: "center",
    }}>
      <div style={{ fontSize: "3.5rem", marginBottom: "16px" }}>💌</div>

      {state === "loading" && <p style={{ color: "#9A7B5F" }}>正在打开邀请…</p>}

      {state === "error" && (
        <>
          <h1 style={{ color: "#3A2A1A", fontSize: "1.25rem", fontWeight: 800 }}>{error}</h1>
          <button onClick={() => router.replace("/welcome")} style={{
            marginTop: "24px", padding: "14px", borderRadius: "16px", border: "none",
            backgroundColor: "#FFF1DD", color: "#C47A2C",
            fontSize: "0.9375rem", fontWeight: 700, cursor: "pointer",
          }}>
            回到首页
          </button>
        </>
      )}

      {(state === "ready" || state === "joining") && (
        <>
          <h1 style={{ color: "#3A2A1A", fontSize: "1.5rem", fontWeight: 800, lineHeight: 1.4 }}>
            TA 邀请你加入<br />「{spaceName}」
          </h1>
          <p style={{ color: "#9A7B5F", fontSize: "0.9375rem", marginTop: "10px" }}>
            加入后就能一起点菜、一起记录每天吃了什么
          </p>
          <button onClick={join} disabled={state === "joining"} style={{
            marginTop: "32px", padding: "16px", borderRadius: "18px", border: "none",
            background: "linear-gradient(180deg, #F5B460 0%, #E8991E 100%)",
            color: "#FFFFFF", fontSize: "1rem", fontWeight: 700, cursor: "pointer",
            boxShadow: "0 6px 20px rgba(232,153,30,0.4)",
          }}>
            {state === "joining" ? "正在加入…" : loggedIn ? "加入小厨房" : "登录并加入"}
          </button>
        </>
      )}
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinContent />
    </Suspense>
  );
}
