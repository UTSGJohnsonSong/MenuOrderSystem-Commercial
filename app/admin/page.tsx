"use client";

/*
 * 管理后台（仅 ADMIN_PHONES 白名单手机号可见，其他人访问接口返回 404 并被跳回首页）。
 * 桌面浏览器优先的朴素工具页，刻意不用产品的可爱风格。
 * Tab：总览（指标 + 近14天明细）/ 空间查询（客服操作）/ 操作日志（留痕）/ 菜品库图片。
 * 隐私边界：只看计数不看内容——后台永远不展示用户的菜品名和食记。
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LIBRARY_DISHES, LIBRARY_CATS, searchLibrary } from "@/lib/library";
import { compressImage } from "@/lib/image";
import { uploadImage } from "@/lib/store";

interface Overview {
  users: { total: number; today: number; week: number };
  spaces: number;
  invite_rate: number;
  sms_today: number;
  menu_items: number;
  meal_logs: number;
  library_images: number;
  d7_retention: number | null;
  d30_retention: number | null;
  wau: number;
  conversion_today: number | null;
  daily: { day: string; views: number; regs: number; conversion: number | null; sources: string }[];
}

interface SmsCode { phone: string; code: string; status: string; at: string }

interface AdminMember {
  user_id: string; phone_masked: string; nickname: string; is_owner: boolean;
  joined_at: string; source: string; last_active_at: string | null;
}
interface AdminSpace {
  id: string; name: string; invite_code: string; member_limit: number; created_at: string;
  banned: boolean; deleted: boolean; item_count: number; log_count: number; members: AdminMember[];
}
interface AdminAction { id: string; action: string; note: string; at: string; admin: string; space: string }

const ACTION_LABELS: Record<string, string> = {
  reset_invite: "重置邀请码",
  ban_space: "封禁空间",
  restore_space: "恢复空间",
  delete_user: "注销用户",
  mark_paid: "标记付款",
  refund: "退款",
};

export default function AdminPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [tab, setTab] = useState<"overview" | "spaces" | "actions" | "library">("overview");
  const [images, setImages] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null); // 正在上传的菜名
  const [msg, setMsg] = useState("");
  const [smsCodes, setSmsCodes] = useState<SmsCode[] | null>(null);

  // 空间查询 tab
  const [spaceQuery, setSpaceQuery] = useState("");
  const [spaceResults, setSpaceResults] = useState<AdminSpace[] | null>(null);
  const [spaceMsg, setSpaceMsg] = useState("");
  const [searching, setSearching] = useState(false);
  // 操作日志 tab
  const [actions, setActions] = useState<AdminAction[] | null>(null);

  const loadSmsCodes = () => {
    fetch("/api/admin/sms-codes").then(async r => {
      if (r.ok) setSmsCodes((await r.json()).codes);
    }).catch(() => {});
  };

  useEffect(() => {
    fetch("/api/admin/overview").then(async r => {
      if (r.status === 401) { router.replace("/welcome"); return; }
      if (!r.ok) { router.replace("/"); return; } // 404: 非管理员，装作页面不存在
      setOverview(await r.json());
    }).catch(() => router.replace("/"));
    fetch("/api/library/images").then(r => r.json()).then(d => setImages(d.images ?? {})).catch(() => {});
    loadSmsCodes();
  }, [router]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 2500); };

  const loadActions = () => {
    fetch("/api/admin/actions").then(async r => {
      if (r.ok) setActions((await r.json()).actions);
    }).catch(() => {});
  };

  const searchSpaces = async () => {
    const q = spaceQuery.trim();
    if (!q) return;
    setSearching(true);
    setSpaceMsg("");
    try {
      const res = await fetch(`/api/admin/spaces?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) { setSpaceResults(null); setSpaceMsg(data.error ?? "查询失败"); return; }
      setSpaceResults(data.spaces);
      if (data.spaces.length === 0) setSpaceMsg(data.message ?? "没有查到对应的空间");
    } catch {
      setSpaceMsg("查询失败，稍后再试");
    } finally {
      setSearching(false);
    }
  };

  // 管理操作统一走这里：POST + 出错提示 + 成功后刷新当前搜索结果
  const adminPost = async (url: string, body: Record<string, unknown>, okMsg: string) => {
    try {
      const res = await fetch(url, { method: "POST", body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "操作失败");
      flash(okMsg);
      await searchSpaces();
    } catch (e) {
      flash(e instanceof Error ? e.message : "操作失败");
    }
  };

  const resetInvite = (s: AdminSpace) => {
    if (!confirm(`重置「${s.name}」的邀请码？旧码 ${s.invite_code} 立刻失效。`)) return;
    adminPost("/api/admin/spaces/reset-invite", { space_id: s.id }, "邀请码已重置");
  };

  const toggleBan = (s: AdminSpace) => {
    if (s.banned) {
      if (!confirm(`恢复「${s.name}」？成员将重新可以访问。`)) return;
      adminPost("/api/admin/spaces/ban", { space_id: s.id, action: "restore" }, "空间已恢复");
    } else {
      const note = prompt(`封禁「${s.name}」？所有成员将看到「暂时无法访问」。\n封禁原因（会记入操作日志）：`);
      if (note === null) return;
      adminPost("/api/admin/spaces/ban", { space_id: s.id, action: "ban", note }, "空间已封禁");
    }
  };

  const deleteUser = (m: AdminMember) => {
    const typed = prompt(
      `注销用户 ${m.phone_masked}？\nTA 名下的小厨房会被解散，账号匿名化，不可撤销。\n输入「注销」两个字确认：`
    );
    if (typed === null) return;
    if (typed.trim() !== "注销") { flash("没有输入「注销」，已取消"); return; }
    adminPost("/api/admin/users/delete", { user_id: m.user_id }, "用户已注销");
  };

  const results = useMemo(() => {
    const searched = searchLibrary(query);
    return onlyMissing ? searched.filter(d => !images[d.name]) : searched;
  }, [query, onlyMissing, images]);

  const catName = (id: string) => LIBRARY_CATS.find(c => c.id === id)?.name ?? "";
  const doneCount = LIBRARY_DISHES.filter(d => images[d.name]).length;

  const setDishImage = async (dishName: string, url: string) => {
    const res = await fetch("/api/admin/library-image", {
      method: "POST",
      body: JSON.stringify({ dish_name: dishName, image_url: url }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "保存失败");
    setImages(prev => {
      const next = { ...prev };
      if (url) next[dishName] = url; else delete next[dishName];
      return next;
    });
  };

  const handleUpload = async (dishName: string, file: File) => {
    setBusy(dishName);
    try {
      const compressed = await compressImage(file);
      const url = await uploadImage(compressed);
      await setDishImage(dishName, url);
      flash(`「${dishName}」配图已更新`);
    } catch (e) {
      flash(e instanceof Error ? e.message : "上传失败");
    } finally {
      setBusy(null);
    }
  };

  const handleClear = async (dishName: string) => {
    if (!confirm(`清除「${dishName}」的配图？`)) return;
    try {
      await setDishImage(dishName, "");
      flash(`已清除「${dishName}」的配图`);
    } catch (e) {
      flash(e instanceof Error ? e.message : "操作失败");
    }
  };

  if (!overview) return null;

  const th: React.CSSProperties = { textAlign: "left", padding: "8px 12px", borderBottom: "2px solid #ddd", fontSize: "13px", color: "#666" };
  const td: React.CSSProperties = { padding: "8px 12px", borderBottom: "1px solid #eee", fontSize: "14px", verticalAlign: "middle" };

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: "#FAFAFA", color: "#222", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "24px 16px 80px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "16px", marginBottom: "20px" }}>
          <h1 style={{ fontSize: "18px", fontWeight: 700 }}>今天吃什么呀 · 管理后台</h1>
          <span style={{ fontSize: "12px", color: "#999" }}>仅管理员可见</span>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
          {([["overview", "总览"], ["spaces", "空间查询"], ["actions", "操作日志"], ["library", "菜品库图片"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => { setTab(id); if (id === "actions") loadActions(); }} style={{
              padding: "8px 20px", fontSize: "14px", cursor: "pointer",
              border: "1px solid " + (tab === id ? "#222" : "#ccc"),
              backgroundColor: tab === id ? "#222" : "#FFF",
              color: tab === id ? "#FFF" : "#444", borderRadius: "6px",
            }}>{label}</button>
          ))}
        </div>

        {tab === "overview" && smsCodes && smsCodes.length > 0 && (
          <div style={{
            backgroundColor: "#FFF9E6", border: "1px solid #E8D48A", borderRadius: "8px",
            padding: "14px 16px", marginBottom: "16px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <p style={{ fontSize: "13px", fontWeight: 700, color: "#8A6D1B" }}>
                📨 最近验证码（内测通道，接通真实短信后自动消失）
              </p>
              <button onClick={loadSmsCodes} style={{
                fontSize: "12px", color: "#8A6D1B", border: "1px solid #E8D48A",
                borderRadius: "4px", padding: "2px 10px", background: "#FFF", cursor: "pointer",
              }}>刷新</button>
            </div>
            {smsCodes.map((c, i) => (
              <p key={i} style={{ fontSize: "13px", color: "#555", padding: "2px 0", fontFamily: "monospace" }}>
                {c.phone} → <strong style={{ fontSize: "15px" }}>{c.code}</strong>
                <span style={{ color: c.status === "有效" ? "#0a7" : "#aaa", marginLeft: "10px" }}>{c.status}</span>
                <span style={{ color: "#bbb", marginLeft: "10px" }}>{new Date(c.at).toLocaleTimeString("zh-CN")}</span>
              </p>
            ))}
          </div>
        )}

        {tab === "overview" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
              {[
                ["注册用户", `${overview.users.total}`, `今日 +${overview.users.today} · 7日 +${overview.users.week}`],
                ["小厨房数", `${overview.spaces}`, "未删除空间"],
                ["邀请成功率 ★", `${overview.invite_rate}%`, "成员≥2 的空间占比（北极星）"],
                ["今日短信", `${overview.sms_today}`, "突然飙高 = 可能被刷"],
                ["D7 留存", overview.d7_retention === null ? "—" : `${overview.d7_retention}%`, "注册满7天的人里最近7天活跃的占比（及格线 30%）"],
                ["D30 留存", overview.d30_retention === null ? "—" : `${overview.d30_retention}%`, "同理放宽到 30 天（及格线 15%）"],
                ["周活跃用户", `${overview.wau}`, "近 7 天活跃过的用户数"],
                ["今日落地页转化", overview.conversion_today === null ? "—" : `${overview.conversion_today}%`, "今日注册 ÷ 今日落地页访问（及格线 15%）"],
                ["菜品总数", `${overview.menu_items}`, "全部空间累计"],
                ["食记总数", `${overview.meal_logs}`, "全部空间累计"],
                ["菜品库配图", `${overview.library_images}/${LIBRARY_DISHES.length}`, "在「菜品库图片」里维护"],
              ].map(([label, value, hint]) => (
                <div key={label} style={{ backgroundColor: "#FFF", border: "1px solid #e5e5e5", borderRadius: "8px", padding: "16px" }}>
                  <p style={{ fontSize: "12px", color: "#888" }}>{label}</p>
                  <p style={{ fontSize: "26px", fontWeight: 700, margin: "6px 0 4px" }}>{value}</p>
                  <p style={{ fontSize: "11px", color: "#aaa" }}>{hint}</p>
                </div>
              ))}
            </div>

            <h2 style={{ fontSize: "14px", fontWeight: 700, margin: "24px 0 10px" }}>近 14 天每日（北京时间）</h2>
            <div style={{ backgroundColor: "#FFF", border: "1px solid #e5e5e5", borderRadius: "8px", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={th}>日期</th>
                    <th style={th}>落地页访问</th>
                    <th style={th}>注册</th>
                    <th style={th}>转化率</th>
                    <th style={th}>来源</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.daily.map(d => (
                    <tr key={d.day}>
                      <td style={{ ...td, whiteSpace: "nowrap", fontFamily: "monospace" }}>{d.day}</td>
                      <td style={td}>{d.views || "—"}</td>
                      <td style={{ ...td, fontWeight: d.regs > 0 ? 700 : 400 }}>{d.regs || "—"}</td>
                      <td style={td}>{d.conversion === null ? "—" : `${d.conversion}%`}</td>
                      <td style={{ ...td, color: "#888", fontSize: "12px" }}>{d.sources || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === "spaces" && (
          <div>
            <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
              <input
                value={spaceQuery}
                onChange={e => setSpaceQuery(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") searchSpaces(); }}
                placeholder="11 位手机号 或 6 位邀请码"
                style={{ padding: "8px 12px", fontSize: "14px", border: "1px solid #ccc", borderRadius: "6px", width: "260px" }}
              />
              <button onClick={searchSpaces} disabled={searching} style={{
                padding: "8px 20px", fontSize: "14px", cursor: searching ? "wait" : "pointer",
                border: "1px solid #222", backgroundColor: "#222", color: "#FFF", borderRadius: "6px",
              }}>{searching ? "查询中…" : "查询"}</button>
            </div>

            {spaceMsg && <p style={{ fontSize: "13px", color: "#c60", marginBottom: "12px" }}>{spaceMsg}</p>}

            {spaceResults?.map(s => (
              <div key={s.id} style={{ backgroundColor: "#FFF", border: "1px solid #e5e5e5", borderRadius: "8px", padding: "16px", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "15px", fontWeight: 700 }}>{s.name}</span>
                  <span style={{ fontSize: "13px", fontFamily: "monospace", color: "#666", border: "1px solid #ddd", borderRadius: "4px", padding: "1px 8px" }}>{s.invite_code}</span>
                  {s.deleted && <span style={{ fontSize: "12px", color: "#FFF", backgroundColor: "#999", borderRadius: "4px", padding: "1px 8px" }}>已解散</span>}
                  {s.banned && <span style={{ fontSize: "12px", color: "#FFF", backgroundColor: "#d55", borderRadius: "4px", padding: "1px 8px" }}>已封禁</span>}
                  <span style={{ fontSize: "12px", color: "#aaa", marginLeft: "auto" }}>
                    创建于 {new Date(s.created_at).toLocaleDateString("zh-CN")}
                  </span>
                </div>
                <p style={{ fontSize: "13px", color: "#888", margin: "8px 0 12px" }}>
                  成员 {s.members.length}/{s.member_limit} · 菜品 {s.item_count} · 食记 {s.log_count}
                </p>

                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "12px" }}>
                  <thead>
                    <tr>
                      <th style={th}>成员</th>
                      <th style={th}>昵称</th>
                      <th style={th}>来源</th>
                      <th style={th}>加入时间</th>
                      <th style={th}>最近活跃</th>
                      <th style={{ ...th, textAlign: "right" }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.members.map(m => (
                      <tr key={m.user_id}>
                        <td style={{ ...td, fontFamily: "monospace", whiteSpace: "nowrap" }}>
                          {m.phone_masked}{m.is_owner && <span style={{ color: "#C47A2C", marginLeft: "6px" }}>主人</span>}
                        </td>
                        <td style={td}>{m.nickname || "—"}</td>
                        <td style={td}>{m.source || "直接"}</td>
                        <td style={{ ...td, whiteSpace: "nowrap" }}>{new Date(m.joined_at).toLocaleDateString("zh-CN")}</td>
                        <td style={{ ...td, whiteSpace: "nowrap" }}>
                          {m.last_active_at ? new Date(m.last_active_at).toLocaleDateString("zh-CN") : "—"}
                        </td>
                        <td style={{ ...td, textAlign: "right" }}>
                          <button onClick={() => deleteUser(m)} style={{
                            padding: "4px 12px", fontSize: "12px", border: "1px solid #d55",
                            color: "#d55", backgroundColor: "transparent", borderRadius: "6px", cursor: "pointer",
                          }}>注销用户</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {!s.deleted && (
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={() => resetInvite(s)} style={{
                      padding: "6px 16px", fontSize: "13px", border: "1px solid #0a7",
                      color: "#0a7", backgroundColor: "transparent", borderRadius: "6px", cursor: "pointer",
                    }}>重置邀请码</button>
                    <button onClick={() => toggleBan(s)} style={{
                      padding: "6px 16px", fontSize: "13px",
                      border: "1px solid " + (s.banned ? "#0a7" : "#d55"),
                      color: s.banned ? "#0a7" : "#d55",
                      backgroundColor: "transparent", borderRadius: "6px", cursor: "pointer",
                    }}>{s.banned ? "恢复空间" : "封禁空间"}</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === "actions" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
              <p style={{ fontSize: "13px", color: "#888" }}>所有管理操作的留痕（最近 200 条）</p>
              <button onClick={loadActions} style={{
                fontSize: "12px", color: "#555", border: "1px solid #ccc",
                borderRadius: "4px", padding: "3px 12px", background: "#FFF", cursor: "pointer",
              }}>刷新</button>
            </div>
            <div style={{ backgroundColor: "#FFF", border: "1px solid #e5e5e5", borderRadius: "8px", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={th}>时间</th>
                    <th style={th}>管理员</th>
                    <th style={th}>操作</th>
                    <th style={th}>空间</th>
                    <th style={th}>备注</th>
                  </tr>
                </thead>
                <tbody>
                  {(actions ?? []).map(a => (
                    <tr key={a.id}>
                      <td style={{ ...td, whiteSpace: "nowrap", fontFamily: "monospace", fontSize: "12px" }}>
                        {new Date(a.at).toLocaleString("zh-CN")}
                      </td>
                      <td style={{ ...td, fontFamily: "monospace" }}>{a.admin}</td>
                      <td style={{ ...td, fontWeight: 600, whiteSpace: "nowrap" }}>{ACTION_LABELS[a.action] ?? a.action}</td>
                      <td style={td}>{a.space}</td>
                      <td style={{ ...td, color: "#888", fontSize: "12px" }}>{a.note || "—"}</td>
                    </tr>
                  ))}
                  {actions?.length === 0 && (
                    <tr><td style={{ ...td, color: "#aaa" }} colSpan={5}>还没有任何管理操作</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "library" && (
          <div>
            <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "14px", flexWrap: "wrap" }}>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="搜索菜名 / 食材…"
                style={{ padding: "8px 12px", fontSize: "14px", border: "1px solid #ccc", borderRadius: "6px", width: "260px" }}
              />
              <label style={{ fontSize: "13px", color: "#555", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                <input type="checkbox" checked={onlyMissing} onChange={e => setOnlyMissing(e.target.checked)} />
                只看未配图
              </label>
              <span style={{ fontSize: "13px", color: "#888", marginLeft: "auto" }}>
                已配图 {doneCount}/{LIBRARY_DISHES.length}
              </span>
            </div>

            <div style={{ backgroundColor: "#FFF", border: "1px solid #e5e5e5", borderRadius: "8px", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={th}>图片</th>
                    <th style={th}>菜名</th>
                    <th style={th}>分类</th>
                    <th style={th}>食材</th>
                    <th style={{ ...th, textAlign: "right" }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(dish => {
                    const url = images[dish.name];
                    const uploading = busy === dish.name;
                    return (
                      <tr key={dish.name}>
                        <td style={td}>
                          {url ? (
                            <img src={url} alt={dish.name} style={{ width: "56px", height: "42px", objectFit: "cover", borderRadius: "4px", display: "block" }} />
                          ) : (
                            <div style={{ width: "56px", height: "42px", borderRadius: "4px", backgroundColor: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "#bbb" }}>
                              无图
                            </div>
                          )}
                        </td>
                        <td style={{ ...td, fontWeight: 600, whiteSpace: "nowrap" }}>{dish.name}</td>
                        <td style={{ ...td, whiteSpace: "nowrap" }}>{catName(dish.cat)}</td>
                        <td style={{ ...td, color: "#888", fontSize: "12px", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {dish.ingredients}
                        </td>
                        <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                          <label style={{
                            display: "inline-block", padding: "5px 14px", fontSize: "13px",
                            border: "1px solid #0a7", color: uploading ? "#999" : "#0a7",
                            borderRadius: "6px", cursor: uploading ? "wait" : "pointer",
                          }}>
                            {uploading ? "上传中…" : url ? "换图" : "上传"}
                            <input
                              type="file" accept="image/*" disabled={uploading}
                              style={{ display: "none" }}
                              onChange={e => {
                                const f = e.target.files?.[0];
                                if (f) handleUpload(dish.name, f);
                                e.target.value = "";
                              }}
                            />
                          </label>
                          {url && (
                            <button onClick={() => handleClear(dish.name)} style={{
                              marginLeft: "8px", padding: "5px 14px", fontSize: "13px",
                              border: "1px solid #d55", color: "#d55", backgroundColor: "transparent",
                              borderRadius: "6px", cursor: "pointer",
                            }}>清除</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {msg && (
        <div style={{
          position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)",
          backgroundColor: "#222", color: "#FFF", padding: "10px 20px",
          borderRadius: "6px", fontSize: "13px", zIndex: 100,
        }}>{msg}</div>
      )}
    </div>
  );
}
