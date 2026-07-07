"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "15px 16px",
  border: "1.5px solid #F0D8B4", borderRadius: "14px",
  fontSize: "1rem", backgroundColor: "#FFFFFF", color: "#2F241D",
  outline: "none",
};

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const inviteCode = params.get("code") ?? "";

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [devCode, setDevCode] = useState("");

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const phoneOk = /^1[3-9]\d{9}$/.test(phone);

  const sendCode = async () => {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "发送失败");
      setSent(true);
      setCountdown(60);
      if (data.devCode) setDevCode(data.devCode);
    } catch (e) {
      setError(e instanceof Error ? e.message : "发送失败，请重试");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setError("");
    setBusy(true);
    try {
      // 注册来源：落地页 ?from= 参数由 SourceTracker 存进 sessionStorage，这里透传
      const source = sessionStorage.getItem("fm-source") ?? "";
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        body: JSON.stringify({ phone, code, source, ...(inviteCode ? { inviteCode } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "登录失败");
      router.replace(data.created ? "/onboarding" : "/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "登录失败，请重试");
      setBusy(false);
    }
  };

  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex", flexDirection: "column",
      background: "linear-gradient(180deg, #FFFDF8 0%, #FFF3E0 100%)",
      padding: "96px 28px 60px",
    }}>
      {/* 品牌图标：与落地页/App 图标同源，不断品牌 */}
      <img src="/icon.png" alt="" style={{
        width: "56px", height: "56px", borderRadius: "16px",
        marginBottom: "16px", display: "block",
        boxShadow: "0 4px 14px rgba(232,153,30,0.25)",
      }} />
      <h1 style={{ color: "#2F241D", fontSize: "1.5rem", fontWeight: 800 }}>
        {inviteCode ? "欢迎来一起点菜" : "欢迎回来"}
      </h1>
      <p style={{ color: "#6F5A48", fontSize: "0.875rem", marginTop: "8px", lineHeight: 1.6 }}>
        {inviteCode
          ? `用手机号登录，就能加入 TA 的小厨房（邀请码 ${inviteCode}）`
          : "用手机号登录你们的小厨房"}
      </p>
      {!inviteCode && (
        <p style={{ color: "#A58A72", fontSize: "0.75rem", marginTop: "4px" }}>
          第一次登录会自动创建一个新的小厨房
        </p>
      )}

      <div style={{ marginTop: "32px", display: "flex", flexDirection: "column", gap: "14px" }}>
        <input
          type="tel" inputMode="numeric" maxLength={11}
          placeholder="输入手机号"
          value={phone}
          onChange={e => { setPhone(e.target.value.replace(/\D/g, "")); setError(""); }}
          style={inputStyle}
        />

        <div style={{ display: "flex", gap: "10px" }}>
          <input
            type="text" inputMode="numeric" maxLength={6}
            placeholder="输入验证码"
            value={code}
            onChange={e => { setCode(e.target.value.replace(/\D/g, "")); setError(""); }}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            onClick={sendCode}
            disabled={!phoneOk || countdown > 0 || busy}
            style={{
              padding: "0 18px", borderRadius: "14px", border: "none",
              backgroundColor: !phoneOk || countdown > 0 ? "#F3E4C8" : "#E8A63C",
              color: !phoneOk || countdown > 0 ? "#BFA77C" : "#FFFFFF",
              fontSize: "0.875rem", fontWeight: 700, whiteSpace: "nowrap",
              cursor: !phoneOk || countdown > 0 ? "default" : "pointer",
              boxShadow: !phoneOk || countdown > 0 ? "none" : "0 3px 10px rgba(232,166,60,0.35)",
            }}
          >
            {countdown > 0 ? `${countdown} 秒后重试` : sent ? "重新发送" : "获取验证码"}
          </button>
        </div>

        {devCode && (
          <p style={{ color: "#C47A2C", fontSize: "0.8125rem" }}>
            开发模式验证码：<strong>{devCode}</strong>
          </p>
        )}
        {error && <p style={{ color: "#D9534F", fontSize: "0.8125rem" }}>{error}</p>}

        <button
          onClick={verify}
          disabled={!phoneOk || code.length !== 6 || busy}
          style={{
            marginTop: "8px", padding: "16px", borderRadius: "14px", border: "none",
            background: !phoneOk || code.length !== 6
              ? "#F3E4C8"
              : "linear-gradient(180deg, #F5B460 0%, #E8991E 100%)",
            color: !phoneOk || code.length !== 6 ? "#BFA77C" : "#FFFFFF",
            fontSize: "1rem", fontWeight: 700,
            cursor: !phoneOk || code.length !== 6 ? "default" : "pointer",
            boxShadow: phoneOk && code.length === 6 ? "0 6px 20px rgba(232,153,30,0.4)" : "none",
          }}
        >
          {busy ? "请稍等…" : "登录"}
        </button>

        <p style={{ color: "#A58A72", fontSize: "0.75rem", textAlign: "center", lineHeight: 1.6, marginTop: "8px" }}>
          登录即表示你已阅读并同意
          <a href="/terms" style={{ color: "#C9831F" }}>《用户协议》</a>和
          <a href="/privacy" style={{ color: "#C9831F" }}>《隐私政策》</a>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
