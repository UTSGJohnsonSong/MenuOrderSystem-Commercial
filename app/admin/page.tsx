"use client";

/*
 * 管理后台（仅 ADMIN_PHONES 白名单手机号可见，其他人访问接口返回 404 并被跳回首页）。
 * 桌面浏览器优先的朴素工具页，刻意不用产品的可爱风格。
 * Tab 1 总览：核心运营指标；Tab 2 菜品库图片：给 302 道库菜配图（用户侧只读）。
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
}

interface SmsCode { phone: string; code: string; status: string; at: string }

export default function AdminPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [tab, setTab] = useState<"overview" | "library">("overview");
  const [images, setImages] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null); // 正在上传的菜名
  const [msg, setMsg] = useState("");
  const [smsCodes, setSmsCodes] = useState<SmsCode[] | null>(null);

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
          {([["overview", "总览"], ["library", "菜品库图片"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
            {[
              ["注册用户", `${overview.users.total}`, `今日 +${overview.users.today} · 7日 +${overview.users.week}`],
              ["小厨房数", `${overview.spaces}`, "未删除空间"],
              ["邀请成功率 ★", `${overview.invite_rate}%`, "成员≥2 的空间占比（北极星）"],
              ["今日短信", `${overview.sms_today}`, "突然飙高 = 可能被刷"],
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
