"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Member {
  id: string;
  phone_masked: string;
  nickname: string;
  role: string;
  is_me: boolean;
}

interface SpaceDetail {
  id: string;
  name: string;
  invite_code: string;
  member_limit: number;
  is_owner: boolean;
  members: Member[];
}

const cardStyle: React.CSSProperties = {
  backgroundColor: "#FFFFFF", borderRadius: "18px", padding: "18px",
  border: "1.5px solid rgba(240,210,170,0.5)",
  boxShadow: "0 3px 12px rgba(120,80,40,0.06)",
};

export default function SettingsPage() {
  const router = useRouter();
  const [space, setSpace] = useState<SpaceDetail | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(() => {
    fetch("/api/space").then(async r => {
      if (r.status === 401) { router.replace("/welcome"); return; }
      if (r.status === 403) { router.replace("/onboarding"); return; }
      const data = await r.json();
      setSpace(data);
      setNameDraft(data.name);
    }).catch(() => {});
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  const saveName = async () => {
    const res = await fetch("/api/space", { method: "PATCH", body: JSON.stringify({ name: nameDraft }) });
    const data = await res.json();
    if (!res.ok) { showToast(data.error ?? "保存失败"); return; }
    setEditingName(false);
    setSpace(s => s ? { ...s, name: data.name } : s);
    showToast("已保存");
  };

  const resetCode = async () => {
    if (!confirm("重置后旧邀请码会立刻失效，确定吗？")) return;
    const res = await fetch("/api/space/invite-code", { method: "POST" });
    const data = await res.json();
    if (!res.ok) { showToast(data.error ?? "重置失败"); return; }
    setSpace(s => s ? { ...s, invite_code: data.invite_code } : s);
    showToast("邀请码已重置");
  };

  const copyInvite = () => {
    if (!space) return;
    const link = `${window.location.origin}/join?code=${space.invite_code}`;
    navigator.clipboard.writeText(
      `来「${space.name}」和我一起点菜吧！\n${link}\n邀请码：${space.invite_code}`
    ).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const leaveSpace = async () => {
    if (!confirm("退出后将看不到这个小厨房的菜单和食记，确定退出吗？")) return;
    const res = await fetch("/api/space/leave", { method: "POST" });
    const data = await res.json();
    if (!res.ok) { showToast(data.error ?? "退出失败"); return; }
    router.replace("/");
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/welcome");
  };

  const kickMember = async (m: Member) => {
    const label = m.nickname || m.phone_masked;
    if (!confirm(`把 ${label} 移出小厨房？\nTA 将看不到这里的菜单和食记。`)) return;
    const res = await fetch("/api/space/kick", { method: "POST", body: JSON.stringify({ member_id: m.id }) });
    const data = await res.json();
    if (!res.ok) { showToast(data.error ?? "操作失败"); return; }
    showToast(`已移出 ${label}`);
    load();
  };

  const dissolveSpace = async () => {
    if (!space) return;
    const input = prompt(
      `解散后，所有成员都会失去这个厨房的菜单和食记，无法恢复。\n\n请输入小厨房的名字「${space.name}」确认解散：`
    );
    if (input === null) return;
    const res = await fetch("/api/space/dissolve", { method: "POST", body: JSON.stringify({ confirm_name: input }) });
    const data = await res.json();
    if (!res.ok) { showToast(data.error ?? "操作失败"); return; }
    alert("小厨房已解散。我们为你准备了一个新的小厨房。");
    router.replace("/");
  };

  const deleteAccount = async () => {
    const input = prompt(
      "注销后，你的账号和你作为主人的小厨房都会被删除，无法恢复。\n加入的其他厨房会自动退出。\n\n请输入「注销」两个字确认："
    );
    if (input === null) return;
    const res = await fetch("/api/auth/delete-account", { method: "POST", body: JSON.stringify({ confirm: input }) });
    const data = await res.json();
    if (!res.ok) { showToast(data.error ?? "操作失败"); return; }
    router.replace("/welcome");
  };

  if (!space) return null;

  const navH = "calc(56px + env(safe-area-inset-bottom))";

  return (
    <div style={{
      height: `calc(100dvh - ${navH})`, overflowY: "auto",
      overscrollBehavior: "contain", backgroundColor: "#FFF8EF",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "12px",
        padding: "20px 16px 12px",
      }}>
        <button onClick={() => router.back()} style={{ color: "#9A7B5F", fontSize: "0.875rem", border: "none", background: "none", cursor: "pointer" }}>
          ← 返回
        </button>
        <h1 style={{ color: "#3A2A1A", fontSize: "1rem", fontWeight: 700 }}>小厨房设置</h1>
      </div>

      <div style={{ padding: "8px 16px 120px", display: "flex", flexDirection: "column", gap: "14px" }}>
        {/* 空间名称 */}
        <div style={cardStyle}>
          <p style={{ color: "#9A7B5F", fontSize: "0.75rem", marginBottom: "8px" }}>小厨房名字</p>
          {editingName ? (
            <div style={{ display: "flex", gap: "8px" }}>
              <input value={nameDraft} maxLength={20}
                onChange={e => setNameDraft(e.target.value)}
                style={{
                  flex: 1, padding: "10px 12px", borderRadius: "12px",
                  border: "1.5px solid #FFE2BD", fontSize: "0.9375rem",
                  color: "#3D2C22", outline: "none",
                }} />
              <button onClick={saveName} style={{
                padding: "0 16px", borderRadius: "12px", border: "none",
                backgroundColor: "#F5B460", color: "#FFF", fontWeight: 700, cursor: "pointer",
              }}>保存</button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ color: "#3A2A1A", fontSize: "1.0625rem", fontWeight: 800 }}>{space.name}</p>
              {space.is_owner && (
                <button onClick={() => setEditingName(true)} style={{
                  color: "#C47A2C", fontSize: "0.8125rem", border: "none", background: "none", cursor: "pointer",
                }}>改名字</button>
              )}
            </div>
          )}
        </div>

        {/* 邀请 */}
        <div style={cardStyle}>
          <p style={{ color: "#9A7B5F", fontSize: "0.75rem", marginBottom: "8px" }}>
            邀请对象 / 室友（{space.members.length}/{space.member_limit} 人）
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ color: "#C47A2C", fontSize: "1.375rem", fontWeight: 800, letterSpacing: "0.25em" }}>
              {space.invite_code}
            </p>
            {space.is_owner && (
              <button onClick={resetCode} style={{
                color: "#B08A68", fontSize: "0.75rem", border: "none", background: "none", cursor: "pointer",
              }}>重置</button>
            )}
          </div>
          <button onClick={copyInvite} style={{
            marginTop: "12px", width: "100%", padding: "12px",
            borderRadius: "13px", border: "none",
            backgroundColor: copied ? "#FFE8CC" : "#FFF1DD",
            color: "#C47A2C", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer",
          }}>
            {copied ? "已复制 ✓" : "复制邀请链接"}
          </button>
        </div>

        {/* 成员 */}
        <div style={cardStyle}>
          <p style={{ color: "#9A7B5F", fontSize: "0.75rem", marginBottom: "10px" }}>厨房成员</p>
          {space.members.map(m => (
            <div key={m.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 0",
            }}>
              <span style={{ color: "#3A2A1A", fontSize: "0.9375rem", fontWeight: 600 }}>
                {m.nickname || m.phone_masked}{m.is_me ? "（我）" : ""}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{
                  fontSize: "0.6875rem", color: m.role === "owner" ? "#C47A2C" : "#B8A18D",
                  backgroundColor: m.role === "owner" ? "#FFF1DD" : "#F7F0E6",
                  padding: "2px 10px", borderRadius: "999px",
                }}>
                  {m.role === "owner" ? "主人" : "成员"}
                </span>
                {space.is_owner && !m.is_me && (
                  <button onClick={() => kickMember(m)} style={{
                    color: "#D9534F", fontSize: "0.75rem",
                    border: "none", background: "none", cursor: "pointer",
                  }}>移出</button>
                )}
              </span>
            </div>
          ))}
        </div>

        {/* 数据与隐私 */}
        <div style={cardStyle}>
          <p style={{ color: "#9A7B5F", fontSize: "0.75rem", marginBottom: "10px" }}>更多</p>
          <Link href="/install" style={{ display: "block", color: "#3A2A1A", fontSize: "0.875rem", padding: "6px 0", textDecoration: "none" }}>
            把小厨房放到手机桌面 ›
          </Link>
          <Link href="/privacy" style={{ display: "block", color: "#3A2A1A", fontSize: "0.875rem", padding: "6px 0", textDecoration: "none" }}>
            隐私政策 ›
          </Link>
          <Link href="/terms" style={{ display: "block", color: "#3A2A1A", fontSize: "0.875rem", padding: "6px 0", textDecoration: "none" }}>
            用户协议 ›
          </Link>
        </div>

        {/* 操作 */}
        {!space.is_owner && (
          <button onClick={leaveSpace} style={{
            padding: "14px", borderRadius: "16px",
            border: "1.5px solid rgba(240,210,170,0.6)",
            backgroundColor: "#FFFFFF", color: "#B08A68",
            fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
          }}>
            退出这个小厨房
          </button>
        )}
        <button onClick={logout} style={{
          padding: "14px", borderRadius: "16px",
          border: "1.5px solid rgba(240,210,170,0.6)",
          backgroundColor: "#FFFFFF", color: "#B08A68",
          fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
        }}>
          退出登录
        </button>

        {/* 危险操作：低调收在最底部，红色文字链而非大按钮 */}
        <div style={{ ...cardStyle, borderColor: "rgba(217,83,79,0.25)" }}>
          <p style={{ color: "#9A7B5F", fontSize: "0.75rem", marginBottom: "6px" }}>危险操作</p>
          {space.is_owner && (
            <button onClick={dissolveSpace} style={{
              display: "block", padding: "8px 0", width: "100%", textAlign: "left",
              color: "#D9534F", fontSize: "0.875rem",
              border: "none", background: "none", cursor: "pointer",
            }}>
              解散这个小厨房 ›
            </button>
          )}
          <button onClick={deleteAccount} style={{
            display: "block", padding: "8px 0", width: "100%", textAlign: "left",
            color: "#D9534F", fontSize: "0.875rem",
            border: "none", background: "none", cursor: "pointer",
          }}>
            注销账号 ›
          </button>
        </div>
      </div>

      {toast && (
        <div style={{
          position: "fixed", bottom: `calc(${navH} + 20px)`, left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: "rgba(60,36,21,0.9)", color: "#FFF",
          padding: "10px 20px", borderRadius: "999px",
          fontSize: "0.8125rem", zIndex: 100,
        }}>{toast}</div>
      )}
    </div>
  );
}
