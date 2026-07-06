"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Me {
  user: { id: string } | null;
  space: { name: string; invite_code: string } | null;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [copied, setCopied] = useState<"" | "code" | "text">("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then((data: Me) => {
        if (!data.user) { router.replace("/welcome"); return; }
        if (!data.space) {
          // 理论上登录时已自动建空间；兜底再拉一次
          router.replace("/welcome");
          return;
        }
        setMe(data);
      })
      .catch(() => router.replace("/welcome"));
  }, [router]);

  if (!me?.space) return null;

  const inviteLink = `${window.location.origin}/join?code=${me.space.invite_code}`;

  const copyCode = () => {
    navigator.clipboard.writeText(me.space!.invite_code).then(() => {
      setCopied("code");
      setTimeout(() => setCopied(""), 2200);
    });
  };

  const copyText = () => {
    navigator.clipboard.writeText(
      `我建了一个我们的小厨房，以后想吃什么就来这里点～\n${inviteLink}\n邀请码：${me.space!.invite_code}`
    ).then(() => {
      setCopied("text");
      setTimeout(() => setCopied(""), 2200);
    });
  };

  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex", flexDirection: "column", justifyContent: "center",
      background: "linear-gradient(180deg, #FFFDF8 0%, #FFF3E0 100%)",
      padding: "0 28px 60px", textAlign: "center",
    }}>
      <div style={{ fontSize: "3.5rem", marginBottom: "16px" }}>🏠</div>
      <h1 style={{ color: "#3A2A1A", fontSize: "1.5rem", fontWeight: 800, lineHeight: 1.4 }}>
        你们的小厨房已经准备好啦
      </h1>
      <p style={{ color: "#9A7B5F", fontSize: "0.9375rem", marginTop: "10px", lineHeight: 1.6 }}>
        我们帮你放好了一些家常菜谱，<br />现在把 TA 拉进来才好玩。
      </p>

      <div style={{
        marginTop: "32px", backgroundColor: "#FFFFFF",
        borderRadius: "20px", padding: "22px",
        border: "1.5px solid rgba(240,210,170,0.6)",
        boxShadow: "0 6px 20px rgba(120,80,40,0.08)",
      }}>
        <p style={{ color: "#9A7B5F", fontSize: "0.8125rem" }}>你们的邀请码</p>
        <p style={{
          color: "#C47A2C", fontSize: "2rem", fontWeight: 800,
          letterSpacing: "0.35em", marginTop: "8px", marginLeft: "0.35em",
        }}>
          {me.space.invite_code}
        </p>
        <button onClick={copyText} style={{
          marginTop: "16px", width: "100%", padding: "14px",
          borderRadius: "14px", border: "none",
          background: copied === "text"
            ? "#FFE8CC"
            : "linear-gradient(180deg, #F5B460 0%, #E8991E 100%)",
          color: copied === "text" ? "#C47A2C" : "#FFFFFF",
          fontSize: "0.9375rem", fontWeight: 700, cursor: "pointer",
          boxShadow: copied === "text" ? "none" : "0 5px 16px rgba(232,153,30,0.35)",
        }}>
          {copied === "text" ? "已复制，去微信发给 TA 吧 ✓" : "复制邀请文案，发给 TA"}
        </button>
        <button onClick={copyCode} style={{
          marginTop: "10px", width: "100%", padding: "12px",
          borderRadius: "14px", cursor: "pointer",
          backgroundColor: copied === "code" ? "#FFE8CC" : "#FFFFFF",
          color: "#C47A2C", fontSize: "0.8125rem", fontWeight: 600,
          border: "1.5px solid rgba(240,210,170,0.7)",
        }}>
          {copied === "code" ? "邀请码已复制 ✓" : "只复制邀请码"}
        </button>
      </div>

      <button onClick={() => router.replace("/")} style={{
        marginTop: "24px", padding: "16px", borderRadius: "18px",
        backgroundColor: "#FFFFFF",
        border: "1.5px solid rgba(240,210,170,0.7)",
        color: "#C47A2C", fontSize: "0.9375rem", fontWeight: 700, cursor: "pointer",
      }}>
        先去看看菜单 →
      </button>
      <p style={{ color: "#C8A878", fontSize: "0.75rem", marginTop: "8px" }}>
        邀请码随时可以在「厨房 → 小厨房设置」里找到
      </p>
      <p style={{ marginTop: "18px" }}>
        <a href="/install" style={{ color: "#C8A878", fontSize: "0.75rem", textDecoration: "underline" }}>
          把小厨房放到手机桌面，下次点菜不用翻链接 →
        </a>
      </p>
    </div>
  );
}
