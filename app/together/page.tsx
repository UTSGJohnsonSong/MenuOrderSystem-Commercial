"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/*
 * 「你们的小厨房成立了」——邀请被接受的那一刻。
 *
 * 在这之前，输完邀请码是 router.replace("/")：直接进厨房，什么都没有发生过。
 * 而这是整个产品情绪最高的一个位置——两个人第一次在同一个空间里。
 * 这个页面存在的唯一目的就是把那一秒留出来。
 *
 * 刻意不做的两件事：
 * 1. **不放任何付费入口。** 这一刻只用来建立情感锚点，在这里要钱是把它花掉
 *    （见 Obsidian 22 购买场景与情绪设计 · 场景 A）
 * 2. **不显示手机号。** 后端给的是脱敏号（139****7777），但在一个庆祝画面里
 *    摆两串号码是冷的。没设昵称就用「你」和「TA」——含糊但温度对，
 *    而假名字会更糟
 *
 * 两条进入路径都落在这里：
 *   已注册的人输邀请码  → app/join/page.tsx
 *   带着邀请码注册      → app/login/page.tsx（verify 返回 joined 时）
 *
 * 不在 proxy.ts 的 PUBLIC_PATHS 里，所以没有会话的人进不来——不用额外配。
 */

interface Member { id: string; nickname: string; is_me: boolean }

export default function TogetherPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [members, setMembers] = useState<Member[] | null>(null);

  useEffect(() => {
    fetch("/api/space")
      .then(r => r.ok ? r.json() : Promise.reject(new Error(String(r.status))))
      .then(d => { setName(d.name ?? ""); setMembers(d.members ?? []); })
      /* 拿不到就直接进厨房：这是一个锦上添花的页面，
       * 绝不能因为它把人卡在半路 */
      .catch(() => router.replace("/"));
  }, [router]);

  // 等数据时不闪一屏空白庆祝画面
  if (!members) return null;

  const me = members.find(m => m.is_me);
  const other = members.find(m => !m.is_me);
  const label = (m: Member | undefined, fallback: string) =>
    (m?.nickname || "").trim() || fallback;

  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "linear-gradient(180deg, #FFFDF8 0%, #FFF3E0 100%)",
      padding: "0 32px calc(40px + env(safe-area-inset-bottom))",
      textAlign: "center",
    }}>
      {/* 两个人。圆圈相交，中间那口锅是他们的交集 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "26px" }}>
        <Circle text={label(me, "你")} tone="warm" />
        <div style={{
          fontSize: "1.75rem", margin: "0 -10px", zIndex: 1,
          filter: "drop-shadow(0 2px 6px rgba(120,80,40,0.18))",
        }}>🍲</div>
        <Circle text={label(other, "TA")} tone="cool" />
      </div>

      <h1 style={{ color: "#3A2A1A", fontSize: "1.5rem", fontWeight: 800, lineHeight: 1.4 }}>
        你们的小厨房成立了
      </h1>

      {name && (
        <p style={{
          display: "inline-block", marginTop: "14px",
          padding: "6px 16px", borderRadius: "999px",
          backgroundColor: "#FFF1DD", color: "#C47A2C",
          fontSize: "0.875rem", fontWeight: 700,
        }}>
          {name}
        </p>
      )}

      <p style={{ color: "#9A7B5F", fontSize: "0.9375rem", marginTop: "18px", lineHeight: 1.8 }}>
        以后想吃什么，<br />在这里点给对方看就好。
      </p>

      <button
        onClick={() => router.replace("/")}
        style={{
          marginTop: "36px", width: "100%", maxWidth: "320px",
          height: "56px", borderRadius: "999px", border: "none",
          background: "linear-gradient(180deg, #F5B460 0%, #E8991E 100%)",
          boxShadow: "0 6px 18px rgba(232,153,30,0.3)",
          color: "#FFFFFF", fontSize: "1rem", fontWeight: 700,
          letterSpacing: "0.06em", cursor: "pointer",
        }}>
        进小厨房
      </button>
    </div>
  );
}

function Circle({ text, tone }: { text: string; tone: "warm" | "cool" }) {
  const warm = tone === "warm";
  return (
    <div style={{
      width: "84px", height: "84px", borderRadius: "50%",
      background: warm
        ? "linear-gradient(140deg, #FFD9A8 0%, #F5B460 100%)"
        : "linear-gradient(140deg, #FFE3D2 0%, #F0A98C 100%)",
      border: "3px solid #FFFDF8",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#FFFFFF", fontSize: "0.9375rem", fontWeight: 800,
      // 昵称可能很长，别把圆圈撑破
      padding: "0 8px", overflow: "hidden",
      boxShadow: "0 4px 14px rgba(120,80,40,0.14)",
    }}>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
        {text}
      </span>
    </div>
  );
}
