"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore, useCart, saveMealLog } from "@/lib/store";
import { MenuItem, Category, MealLog } from "@/lib/types";
import { COVER_PRESETS, getCover } from "@/lib/covers";
import { MEALS, guessMeal } from "@/lib/meals";
import { compressImage } from "@/lib/image";
import { uploadImage } from "@/lib/store";
import { uid } from "@/lib/uid";
import ItemDetailModal from "@/components/ItemDetailModal";
import CatIcon from "@/components/CatIcon";
import ItemForm from "@/components/ItemForm";
import CoverCropper from "@/components/CoverCropper";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "夜深啦";
  if (h < 10) return "早上好";
  if (h < 14) return "中午好";
  if (h < 18) return "下午好";
  return "晚上好";
}

interface SpaceLite { name: string; cover_preset: string; cover_image_url: string | null }

/* ─── helpers ─── */

function shortIngredients(raw: string): string {
  if (!raw) return "";
  return raw.split("、").slice(0, 3).map(p => p.split(" ")[0]).join(" · ");
}

/* ─── Sidebar ─── */
function Sidebar({ categories, activeId, onChange }: {
  categories: Category[]; activeId: string; onChange: (id: string) => void;
}) {
  return (
    <aside style={{
      width: "76px", flexShrink: 0,
      backgroundColor: "#FFF1DD",
      overflowY: "auto", display: "flex", flexDirection: "column",
      paddingTop: "8px", paddingBottom: "16px",
    }}>
      {categories.map(cat => {
        const active = cat.id === activeId;
        return (
          <button key={cat.id} onClick={() => onChange(cat.id)} style={{
            margin: "0 7px 6px",
            padding: "10px 4px",
            borderRadius: "18px",
            textAlign: "center",
            backgroundColor: active ? "#FFFFFF" : "transparent",
            border: `1.5px solid ${active ? "#F0D3A8" : "transparent"}`,
            boxShadow: active ? "0 6px 16px rgba(166,112,58,0.14)" : "none",
            color: active ? "#C47A2C" : "#A88465",
            transition: "all 0.18s",
            cursor: "pointer",
          }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "4px" }}>
              <CatIcon id={cat.id} size={28} />
            </div>
            <div style={{ fontSize: "0.625rem", fontWeight: active ? 700 : 400, lineHeight: 1.3 }}>
              {cat.name}
            </div>
          </button>
        );
      })}
    </aside>
  );
}

/* ─── Food Card ─── */
function FoodCard({ item, categoryId, quantity, onIncrease, onDecrease, onClick }: {
  item: MenuItem; categoryId: string; quantity: number;
  onIncrease: () => void; onDecrease: () => void; onClick: () => void;
}) {
  const [imgErr, setImgErr] = useState(false);
  const showImg = !!item.image_url && !imgErr;
  const ingShort = shortIngredients(item.ingredients);

  return (
    <div style={{
      backgroundColor: "#FFFFFF",
      borderRadius: "18px",
      overflow: "hidden",
      border: "1.5px solid rgba(240,216,180,0.7)",
      boxShadow: "0 6px 20px rgba(120,80,40,0.09)",
    }}>
      {/* Image */}
      <div onClick={onClick} style={{ cursor: "pointer", height: "115px" }}>
        {showImg ? (
          <img src={item.image_url} alt={item.name} loading="lazy" onError={() => setImgErr(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            background: "linear-gradient(135deg, #FFF3E4 0%, #FFE8CC 100%)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: "6px",
          }}>
            <CatIcon id={categoryId} size={44} />
            <span style={{ fontSize: "0.5625rem", color: "#C99558", letterSpacing: "0.04em" }}>
              图片待添加
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "11px 11px 13px" }}>
        <p onClick={onClick} style={{
          cursor: "pointer",
          color: "#3C2415", fontSize: "0.9rem", fontWeight: 800,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          lineHeight: 1.3,
        }}>
          {item.name}
        </p>
        {ingShort && (
          <p style={{
            color: "#8A6F5A", fontSize: "0.6875rem", marginTop: "4px",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            lineHeight: 1.5,
          }}>
            {ingShort}
          </p>
        )}

        <div style={{ marginTop: "10px", display: "flex", justifyContent: "flex-end" }}>
          {quantity === 0 ? (
            <button onClick={onIncrease} style={{
              width: "40px", height: "40px", borderRadius: "999px",
              background: "linear-gradient(180deg, #F5B460 0%, #E8991E 100%)",
              color: "#FFFFFF", fontSize: "24px", fontWeight: 300,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, border: "none",
              boxShadow: "0 5px 14px rgba(232,153,30,0.38)",
            }}>+</button>
          ) : (
            <div style={{
              display: "flex", alignItems: "center",
              background: "linear-gradient(180deg, #F5B460 0%, #E8991E 100%)",
              borderRadius: "999px", padding: "4px", flexShrink: 0,
              boxShadow: "0 4px 12px rgba(232,153,30,0.32)",
            }}>
              <button onClick={onDecrease} style={{
                width: "28px", height: "28px", borderRadius: "50%",
                color: "#FFFFFF", fontSize: "20px", fontWeight: 300,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "none", background: "transparent", cursor: "pointer",
              }}>−</button>
              <span style={{
                color: "#FFFFFF", fontSize: "0.875rem", fontWeight: 700,
                minWidth: "20px", textAlign: "center",
              }}>{quantity}</span>
              <button onClick={onIncrease} style={{
                width: "28px", height: "28px", borderRadius: "50%",
                color: "#FFFFFF", fontSize: "20px", fontWeight: 300,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "none", background: "transparent", cursor: "pointer",
              }}>+</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── 今日菜单 Modal ─── */
function SendModal({ cartItems, categories, onClose, onDone, onSave, onIncrease, onDecrease }: {
  cartItems: ReturnType<typeof useCart>["cartItems"];
  categories: Category[];
  onClose: () => void;
  onDone: () => void;
  onSave: (log: MealLog) => void | Promise<unknown>;
  onIncrease: (itemId: string) => void;
  onDecrease: (itemId: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  // 备餐：可以选日期（默认今天）和餐次（按当前时间猜默认）
  const [meal, setMeal] = useState(guessMeal());
  const [dateChoice, setDateChoice] = useState<"today" | "tomorrow" | "custom">("today");
  const [customDate, setCustomDate] = useState("");

  const dateFor = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const chosenDate = dateChoice === "today" ? dateFor(0) : dateChoice === "tomorrow" ? dateFor(1) : customDate;
  const isFuture = chosenDate > dateFor(0);

  const sorted = [...categories].sort((a, b) => a.sort_order - b.sort_order);
  const grouped = sorted
    .map(cat => ({ category: cat, items: cartItems.filter(ci => ci.item.category_id === cat.id) }))
    .filter(g => g.items.length > 0);

  const handleCopy = () => {
    const lines = ["今天想吃："];
    grouped.forEach(g => {
      g.items.forEach(ci => lines.push(`${g.category.name}：${ci.item.name} x${ci.quantity}`));
    });
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  const [saveErr, setSaveErr] = useState("");

  const handleSave = async () => {
    if (!chosenDate) return;
    setSaveErr("");
    const log: MealLog = {
      id: uid(), date: chosenDate, meal,
      items: cartItems.map(ci => ({
        item_id: ci.item.id, name: ci.item.name,
        category_name: ci.category.name, image_url: ci.item.image_url,
        quantity: ci.quantity,
      })),
      created_at: new Date().toISOString(),
    };
    try {
      await onSave(log);
      setSaved(true);
    } catch (e) {
      setSaveErr(e instanceof Error && e.message ? e.message : "没保存上，网络差了点，再试一次？");
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 60,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      backgroundColor: "rgba(45,31,20,0.45)",
    }} onClick={saved ? onDone : undefined}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: "480px",
        maxHeight: "85dvh", overflowY: "auto",
        background: "linear-gradient(180deg, #FFFDF8 0%, #FFF7EA 100%)",
        borderRadius: "28px 28px 0 0",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 20px 0",
        }}>
          <div>
            <h2 style={{ color: "#3A2A1A", fontSize: "1.0625rem", fontWeight: 800 }}>
              {saved ? (isFuture ? "✓ 已加进备餐计划" : "✓ 已保存到食记") : "今日菜单"}
            </h2>
            {saved && (
              <p style={{ color: "#9A7B5F", fontSize: "0.8125rem", marginTop: "2px" }}>
                {isFuture ? "到了那天打开食记就能看到啦" : "已保存到食记，可以复制发给主厨"}
              </p>
            )}
          </div>
          <button onClick={onClose} style={{
            width: "32px", height: "32px", borderRadius: "50%",
            backgroundColor: "#FFE8CC", color: "#A88465",
            fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center",
            border: "none", cursor: "pointer",
          }}>×</button>
        </div>

        <div style={{ padding: "16px 20px" }}>
          {grouped.map(({ category, items }) => (
            <div key={category.id} style={{ marginBottom: "12px" }}>
              <p style={{
                color: "#B08A68", fontSize: "0.75rem", fontWeight: 700, marginBottom: "6px",
                display: "flex", alignItems: "center", gap: "6px",
              }}>
                <CatIcon id={category.id} size={18} /> {category.name}
              </p>
              {items.map(ci => (
                <div key={ci.item.id} style={{
                  display: "flex", alignItems: "center",
                  backgroundColor: "#FFFFFF", borderRadius: "16px",
                  padding: "9px 10px 9px 12px", marginBottom: "6px",
                  border: "1px solid rgba(240,210,170,0.5)",
                  boxShadow: "0 2px 8px rgba(120,80,40,0.07)", gap: "10px",
                }}>
                  {ci.item.image_url ? (
                    <img src={ci.item.image_url} alt={ci.item.name} loading="lazy" style={{
                      width: "42px", height: "42px", borderRadius: "11px",
                      objectFit: "cover", flexShrink: 0,
                    }} />
                  ) : (
                    <div style={{
                      width: "42px", height: "42px", borderRadius: "11px", flexShrink: 0,
                      background: "linear-gradient(135deg, #FFF3E4, #FFE8CC)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}><CatIcon id={ci.item.category_id} size={26} /></div>
                  )}
                  <span style={{ flex: 1, color: "#3C2415", fontSize: "0.875rem", fontWeight: 700 }}>
                    {ci.item.name}
                  </span>
                  {/* quantity controls */}
                  <div style={{
                    display: "flex", alignItems: "center",
                    background: "linear-gradient(180deg, #F5B460 0%, #E8991E 100%)",
                    borderRadius: "999px", padding: "3px", flexShrink: 0,
                    gap: 0,
                  }}>
                    <button onClick={() => onDecrease(ci.item.id)} style={{
                      width: "24px", height: "24px", borderRadius: "50%",
                      color: "#FFFFFF", fontSize: "17px", fontWeight: 300,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      border: "none", background: "transparent", cursor: "pointer",
                    }}>−</button>
                    <span style={{
                      color: "#FFFFFF", fontSize: "0.8125rem", fontWeight: 700,
                      minWidth: "18px", textAlign: "center",
                    }}>{ci.quantity}</span>
                    <button onClick={() => onIncrease(ci.item.id)} style={{
                      width: "24px", height: "24px", borderRadius: "50%",
                      color: "#FFFFFF", fontSize: "17px", fontWeight: 300,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      border: "none", background: "transparent", cursor: "pointer",
                    }}>+</button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* 备餐选择：哪天的哪一餐（默认今天+按时间猜的餐次，不改也能直接存） */}
        {!saved && (
          <div style={{ padding: "0 20px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              <span style={{ color: "#B08A68", fontSize: "0.75rem", flexShrink: 0 }}>这是</span>
              {[
                { id: "today" as const, label: "今天" },
                { id: "tomorrow" as const, label: "明天" },
                { id: "custom" as const, label: "📅 选日期" },
              ].map(d => (
                <button key={d.id} onClick={() => setDateChoice(d.id)} style={{
                  padding: "6px 12px", borderRadius: "999px", fontSize: "0.75rem",
                  fontWeight: dateChoice === d.id ? 700 : 500, cursor: "pointer",
                  backgroundColor: dateChoice === d.id ? "#F2A24A" : "#FFFFFF",
                  color: dateChoice === d.id ? "#FFFFFF" : "#9A7B5F",
                  border: "1.5px solid " + (dateChoice === d.id ? "#F2A24A" : "rgba(240,210,170,0.6)"),
                }}>{d.label}</button>
              ))}
              {dateChoice === "custom" && (
                <input
                  type="date" value={customDate}
                  min={dateFor(-30)}
                  onChange={e => setCustomDate(e.target.value)}
                  style={{
                    padding: "5px 8px", borderRadius: "10px", fontSize: "0.75rem",
                    border: "1.5px solid #FFE2BD", color: "#3A2A1A", backgroundColor: "#FFF",
                  }}
                />
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "#B08A68", fontSize: "0.75rem", flexShrink: 0 }}>的</span>
              {MEALS.map(m => (
                <button key={m.id} onClick={() => setMeal(m.id)} style={{
                  padding: "6px 14px", borderRadius: "999px", fontSize: "0.75rem",
                  fontWeight: meal === m.id ? 700 : 500, cursor: "pointer",
                  backgroundColor: meal === m.id ? "#F2A24A" : "#FFFFFF",
                  color: meal === m.id ? "#FFFFFF" : "#9A7B5F",
                  border: "1.5px solid " + (meal === m.id ? "#F2A24A" : "rgba(240,210,170,0.6)"),
                }}>{m.emoji} {m.label}</button>
              ))}
            </div>
          </div>
        )}

        {saveErr && (
          <p style={{ color: "#D9534F", fontSize: "0.75rem", padding: "0 20px 8px" }}>{saveErr}</p>
        )}

        <div style={{ padding: "0 20px 24px", display: "flex", gap: "10px" }}>
          <button onClick={handleCopy} style={{
            flex: 1, padding: "13px", borderRadius: "16px",
            backgroundColor: copied ? "#FFE8CC" : "#FFFFFF",
            color: copied ? "#C47A2C" : "#A88465",
            fontSize: "0.875rem", fontWeight: 600,
            border: "1.5px solid rgba(240,210,170,0.6)",
            cursor: "pointer",
          }}>
            {copied ? "已复制 ✓" : "复制菜单"}
          </button>
          {!saved ? (
            <button onClick={handleSave} disabled={!chosenDate} style={{
              flex: 1, padding: "13px", borderRadius: "16px",
              background: !chosenDate ? "#FFE8CC" : "linear-gradient(180deg, #F5B460 0%, #E8991E 100%)",
              color: !chosenDate ? "#C8A878" : "#FFFFFF",
              fontSize: "0.875rem", fontWeight: 700,
              border: "none", cursor: !chosenDate ? "default" : "pointer",
              boxShadow: !chosenDate ? "none" : "0 5px 16px rgba(232,153,30,0.38)",
            }}>
              {isFuture ? "加进备餐计划" : "保存到食记"}
            </button>
          ) : (
            <button onClick={onDone} style={{
              flex: 1, padding: "13px", borderRadius: "16px",
              backgroundColor: "#3C2415", color: "#FFFFFF",
              fontSize: "0.875rem", fontWeight: 700,
              border: "none", cursor: "pointer",
            }}>
              完成
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── 换封面 Bottom Sheet ─── */
function CoverSheet({ current, customUrl, uploading, onPick, onUpload, onClose }: {
  current: string;
  customUrl: string | null;
  uploading: boolean;
  onPick: (id: string) => void;
  onUpload: (file: File) => void;
  onClose: () => void;
}) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 60,
      backgroundColor: "rgba(45,31,20,0.45)",
      display: "flex", alignItems: "flex-end",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", backgroundColor: "#FFF8EF",
        borderRadius: "26px 26px 0 0", padding: "22px 16px",
        paddingBottom: "calc(22px + env(safe-area-inset-bottom))",
        maxHeight: "80dvh", overflowY: "auto",
      }}>
        <p style={{ color: "#3A2A1A", fontSize: "1rem", fontWeight: 800, textAlign: "center" }}>
          换一个小厨房封面
        </p>
        <p style={{ color: "#9A7B5F", fontSize: "0.75rem", textAlign: "center", marginTop: "4px", marginBottom: "16px" }}>
          你们俩都能换，换了 TA 也看得到
        </p>

        {/* 相册照片：主推入口 */}
        <label style={{
          display: "block", position: "relative",
          height: customUrl ? "96px" : "auto",
          padding: customUrl ? 0 : "16px",
          borderRadius: "16px", overflow: "hidden",
          border: customUrl ? "2.5px solid #E8991E" : "1.5px dashed #E0B584",
          backgroundColor: "#FFFFFF",
          cursor: uploading ? "wait" : "pointer",
          textAlign: "center", marginBottom: "14px",
        }}>
          {customUrl ? (
            <>
              <img src={customUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              <span style={{
                position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(30,18,10,0.35)", color: "#FFF6E8", fontSize: "0.8125rem", fontWeight: 700,
              }}>
                {uploading ? "正在换…" : "✓ 现在用的是你们的照片 · 点击换一张"}
              </span>
            </>
          ) : (
            <span style={{ color: "#C47A2C", fontSize: "0.875rem", fontWeight: 700 }}>
              {uploading ? "正在上传…" : "📷 用相册里的照片当封面"}
            </span>
          )}
          <input
            type="file" accept="image/*" disabled={uploading}
            style={{ display: "none" }}
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.target.value = "";
            }}
          />
        </label>

        <p style={{ color: "#B08A68", fontSize: "0.6875rem", marginBottom: "10px" }}>
          {customUrl ? "或者换回内置风格（点任意一个即可）" : "或者选一个内置风格"}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {COVER_PRESETS.map(p => {
            const selected = !customUrl && p.id === current;
            return (
              <button key={p.id} onClick={() => onPick(p.id)} style={{
                position: "relative", height: "76px", borderRadius: "16px",
                background: p.bg, cursor: "pointer", overflow: "hidden",
                border: selected ? "2.5px solid #E8991E" : "2.5px solid transparent",
                boxShadow: selected ? "0 4px 14px rgba(232,153,30,0.35)" : "0 2px 8px rgba(58,42,26,0.08)",
                textAlign: "left", padding: 0,
              }}>
                <span style={{ position: "absolute", top: "6px", right: "10px", fontSize: "1.375rem", opacity: 0.9 }}>
                  {p.deco[0]}
                </span>
                <span style={{
                  position: "absolute", bottom: "8px", left: "12px",
                  fontSize: "0.8125rem", fontWeight: 700,
                  color: p.dark ? "#FFF6E8" : "#5A3A22",
                }}>
                  {p.label}{selected ? " ✓" : ""}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── 「随便吃什么」随机选菜 Modal ─── */
function RandomModal({ item, category, poolSize, onAgain, onAccept, onClose, onGoLibrary, onGoKitchen }: {
  item: MenuItem | null;
  category: Category | undefined;
  poolSize: number;
  onAgain: () => void;
  onAccept: () => void;
  onClose: () => void;
  onGoLibrary: () => void;
  onGoKitchen: () => void;
}) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 60,
      display: "flex", alignItems: "center", justifyContent: "center",
      backgroundColor: "rgba(45,31,20,0.5)", padding: "0 28px",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: "360px",
        background: "linear-gradient(180deg, #FFFDF8 0%, #FFF7EA 100%)",
        borderRadius: "26px", overflow: "hidden", textAlign: "center",
      }}>
        {item ? (
          <>
            <div style={{ height: "170px" }}>
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} style={{
                  width: "100%", height: "100%", objectFit: "cover", display: "block",
                }} />
              ) : (
                <div style={{
                  width: "100%", height: "100%",
                  background: "linear-gradient(135deg, #FFF3E4, #FFE8CC)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}><CatIcon id={item.category_id} size={72} /></div>
              )}
            </div>
            <div style={{ padding: "18px 20px 22px" }}>
              <p style={{ color: "#B08A68", fontSize: "0.75rem" }}>今天就吃——</p>
              <h2 style={{ color: "#3A2A1A", fontSize: "1.375rem", fontWeight: 800, marginTop: "4px" }}>
                {item.name}
              </h2>
              {category && (
                <p style={{
                  color: "#B08A68", fontSize: "0.75rem", marginTop: "4px",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
                }}>
                  <CatIcon id={category.id} size={16} /> {category.name}
                  {shortIngredients(item.ingredients) ? ` · ${shortIngredients(item.ingredients)}` : ""}
                </p>
              )}
              <button onClick={onAccept} style={{
                marginTop: "18px", width: "100%", padding: "14px",
                borderRadius: "16px", border: "none", cursor: "pointer",
                background: "linear-gradient(180deg, #F5B460 0%, #E8991E 100%)",
                color: "#FFFFFF", fontSize: "0.9375rem", fontWeight: 700,
                boxShadow: "0 5px 16px rgba(232,153,30,0.38)",
              }}>
                就它了，加入今日菜单
              </button>
              {poolSize > 1 && (
                <button onClick={onAgain} style={{
                  marginTop: "10px", width: "100%", padding: "12px",
                  borderRadius: "16px", cursor: "pointer",
                  backgroundColor: "#FFFFFF", color: "#C47A2C",
                  fontSize: "0.875rem", fontWeight: 600,
                  border: "1.5px solid rgba(240,210,170,0.7)",
                }}>
                  🎲 再摇一次
                </button>
              )}
            </div>
          </>
        ) : (
          <div style={{ padding: "32px 24px 26px" }}>
            <p style={{ fontSize: "2.5rem" }}>🍳</p>
            <h2 style={{ color: "#3A2A1A", fontSize: "1.0625rem", fontWeight: 800, marginTop: "10px", lineHeight: 1.5 }}>
              小厨房还空着
            </h2>
            <p style={{ color: "#9A7B5F", fontSize: "0.8125rem", marginTop: "6px", lineHeight: 1.6 }}>
              先加几道 TA 会做的菜，<br />下次就能帮你们选啦
            </p>
            <button onClick={onGoLibrary} style={{
              marginTop: "18px", width: "100%", padding: "13px",
              borderRadius: "16px", border: "none", cursor: "pointer",
              background: "linear-gradient(180deg, #F5B460 0%, #E8991E 100%)",
              color: "#FFFFFF", fontSize: "0.875rem", fontWeight: 700,
            }}>
              去菜品库挑几道
            </button>
            <button onClick={onGoKitchen} style={{
              marginTop: "10px", width: "100%", padding: "12px",
              borderRadius: "16px", cursor: "pointer",
              backgroundColor: "#FFFFFF", color: "#C47A2C",
              fontSize: "0.875rem", fontWeight: 600,
              border: "1.5px solid rgba(240,210,170,0.7)",
            }}>
              自己动手添加
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main 点菜 Page ─── */
export default function OrderPage() {
  const router = useRouter();
  const { categories, items, addItem, updateItem, deleteItem } = useStore();
  const { cartItems, addToCart, decreaseFromCart, clearCart, getQuantity, totalItems } = useCart(items, categories);

  const [activeCatId, setActiveCatId] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [formItem, setFormItem] = useState<MenuItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showRandom, setShowRandom] = useState(false);
  const [randomItem, setRandomItem] = useState<MenuItem | null>(null);
  const [space, setSpace] = useState<SpaceLite | null>(null);
  const [showCoverSheet, setShowCoverSheet] = useState(false);
  const [showCoverBtn, setShowCoverBtn] = useState(false); // 点封面才浮现的换封面按钮
  const [uploadingCover, setUploadingCover] = useState(false);
  const [toast, setToast] = useState("");

  // 换封面按钮浮现几秒后自动藏起来，保持封面干净
  useEffect(() => {
    if (!showCoverBtn) return;
    const t = setTimeout(() => setShowCoverBtn(false), 3500);
    return () => clearTimeout(t);
  }, [showCoverBtn]);

  // 小厨房信息（名字 + 封面）：进页面拉一次，切回前台再刷（TA 换的封面也能看到）
  useEffect(() => {
    const fetchSpace = () => {
      fetch("/api/space").then(r => r.ok ? r.json() : null).then(d => {
        if (d) setSpace({ name: d.name, cover_preset: d.cover_preset, cover_image_url: d.cover_image_url });
      }).catch(() => {});
    };
    fetchSpace();
    const onVisible = () => { if (document.visibilityState === "visible") fetchSpace(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2400); };

  const changeCover = async (presetId: string) => {
    if (!space) return;
    const prev = { ...space };
    // 选内置风格 = 同时清掉相册封面，即时预览
    setSpace({ ...space, cover_preset: presetId, cover_image_url: null });
    setShowCoverSheet(false);
    try {
      const res = await fetch("/api/space", {
        method: "PATCH",
        body: JSON.stringify({ cover_preset: presetId, cover_image_url: null }),
      });
      if (!res.ok) {
        setSpace(prev);
        showToast(res.status === 403 ? "这个小厨房暂时不能这样改哦" : "封面暂时没换成功，等会儿再试试～");
      }
    } catch {
      setSpace(prev);
      showToast("封面暂时没换成功，等会儿再试试～");
    }
  };

  // 选完照片先进裁剪层（拖动取景 + 缩放），确认后才压缩上传
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const pickCoverPhoto = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => setCropSrc(e.target?.result as string);
    reader.onerror = () => showToast("照片读取失败，换一张试试？");
    reader.readAsDataURL(file);
  };

  const confirmCrop = async (jpegDataUrl: string) => {
    if (!space || uploadingCover) return;
    setUploadingCover(true);
    try {
      const url = await uploadImage(jpegDataUrl); // 裁剪器已输出 1200 宽 jpeg
      const res = await fetch("/api/space", { method: "PATCH", body: JSON.stringify({ cover_image_url: url }) });
      if (!res.ok) throw new Error();
      setSpace(s => s ? { ...s, cover_image_url: url } : s);
      setCropSrc(null);
      setShowCoverSheet(false);
      showToast("封面换好啦 ✓");
    } catch {
      showToast("封面暂时没换成功，等会儿再试试～");
    } finally {
      setUploadingCover(false);
    }
  };

  // 随机池：当前小厨房里所有可点的菜（useStore 的数据本身就只含本空间，归档的菜接口层已排除）
  const randomPool = useMemo(() => items.filter(i => i.is_active), [items]);

  const rollRandom = () => {
    if (randomPool.length === 0) { setRandomItem(null); return; }
    // 连摇不出重复的（只有一道菜时除外）
    const candidates = randomPool.length > 1 && randomItem
      ? randomPool.filter(i => i.id !== randomItem.id)
      : randomPool;
    setRandomItem(candidates[Math.floor(Math.random() * candidates.length)]);
  };

  const openRandom = () => { setRandomItem(null); setShowRandom(true); rollRandom(); };

  const sortedCats = useMemo(
    () => [...categories].sort((a, b) => a.sort_order - b.sort_order),
    [categories]
  );

  useEffect(() => {
    if (sortedCats.length === 0 || activeCatId) return;
    const saved = sessionStorage.getItem("fm-active-cat");
    const valid = saved && sortedCats.some(c => c.id === saved);
    setActiveCatId(valid ? saved! : sortedCats[0].id);
  }, [sortedCats, activeCatId]);

  const handleCatChange = (id: string) => {
    setActiveCatId(id);
    sessionStorage.setItem("fm-active-cat", id);
  };

  const activeCat = sortedCats.find(c => c.id === activeCatId);

  const visibleItems = useMemo(() => {
    return items.filter(i => i.category_id === activeCatId && i.is_active)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [items, activeCatId]);

  const detailCat = categories.find(c => c.id === selectedItem?.category_id);
  const navH = "calc(56px + env(safe-area-inset-bottom))";

  return (
    <div style={{
      height: `calc(100dvh - ${navH})`,
      display: "flex", flexDirection: "column",
      background: "linear-gradient(180deg, #FFFDF8 0%, #FFF7EA 100%)",
    }}>
      {/* ── 小厨房封面卡 ── */}
      {(() => {
        const cover = getCover(space?.cover_preset);
        // 相册照片颜色不可控，一律按深色底处理（白字 + 加深遮罩）保证可读
        const isPhoto = !!space?.cover_image_url;
        const dark = isPhoto || cover.dark;
        const textColor = dark ? "#FFF6E8" : "#4A2E1F";
        const subColor = dark ? "rgba(255,246,232,0.88)" : "#8A5A2B";
        return (
          <section
            onClick={() => setShowCoverBtn(v => !v)}
            style={{
              flexShrink: 0, margin: "12px 12px 4px",
              height: "188px", borderRadius: "24px",
              position: "relative", overflow: "hidden",
              background: cover.bg,
              boxShadow: "0 6px 20px rgba(120,80,40,0.12)",
              cursor: "pointer",
            }}>
            {/* 自定义封面图（预留：存在时盖在渐变上） */}
            {space?.cover_image_url && (
              <img src={space.cover_image_url} alt="" style={{
                position: "absolute", inset: 0, width: "100%", height: "100%",
                objectFit: "cover",
              }} onError={e => { e.currentTarget.style.display = "none"; }} />
            )}
            {/* 轻装饰（照片封面不叠 emoji，别遮人家的照片） */}
            {!isPhoto && (
              <>
                <span style={{ position: "absolute", top: "14px", right: "64px", fontSize: "3.25rem", opacity: 0.5, transform: "rotate(8deg)" }}>
                  {cover.deco[0]}
                </span>
                <span style={{ position: "absolute", bottom: "18px", right: "22px", fontSize: "1.75rem", opacity: 0.45, transform: "rotate(-10deg)" }}>
                  {cover.deco[1]}
                </span>
              </>
            )}
            {/* 文字可读性遮罩：照片用重一档的深色渐变 */}
            <div style={{
              position: "absolute", inset: 0,
              background: isPhoto
                ? "linear-gradient(0deg, rgba(28,16,8,0.62) 0%, rgba(28,16,8,0.10) 58%, rgba(28,16,8,0) 75%)"
                : cover.dark
                  ? "linear-gradient(0deg, rgba(30,18,10,0.30) 0%, rgba(30,18,10,0) 55%)"
                  : "linear-gradient(0deg, rgba(255,252,246,0.35) 0%, rgba(255,252,246,0) 55%)",
            }} />
            {/* 换封面按钮：点封面才在右下角浮现，几秒后自动收起 */}
            <button
              onClick={e => { e.stopPropagation(); setShowCoverBtn(false); setShowCoverSheet(true); }}
              style={{
                position: "absolute", bottom: "14px", right: "14px", zIndex: 2,
                padding: "8px 14px", borderRadius: "999px", border: "none",
                backgroundColor: dark ? "rgba(0,0,0,0.32)" : "rgba(255,255,255,0.65)",
                color: dark ? "#FFF6E8" : "#8A5A2B",
                fontSize: "0.75rem", fontWeight: 600,
                backdropFilter: "blur(4px)",
                opacity: showCoverBtn ? 1 : 0,
                transform: showCoverBtn ? "translateY(0)" : "translateY(6px)",
                pointerEvents: showCoverBtn ? "auto" : "none",
                transition: "opacity 0.25s, transform 0.25s",
                cursor: "pointer",
              }}
            >
              🎨 换封面
            </button>
            {/* 文案 */}
            <div style={{ position: "absolute", left: "20px", right: "20px", bottom: "18px", zIndex: 1 }}>
              <p style={{ color: subColor, fontSize: "0.8125rem", fontWeight: 500 }}>
                {greeting()}，欢迎回到
              </p>
              <h1 style={{
                color: textColor, fontSize: "1.75rem", fontWeight: 800,
                marginTop: "2px", lineHeight: 1.25,
                overflow: "hidden", display: "-webkit-box",
                WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                textShadow: dark ? "0 1px 8px rgba(0,0,0,0.35)" : "0 1px 8px rgba(255,255,255,0.5)",
              }}>
                {space?.name || "我们的小厨房"}
              </h1>
              <p style={{ color: subColor, fontSize: "0.875rem", marginTop: "3px" }}>
                今天想吃什么呀？
              </p>
            </div>
          </section>
        );
      })()}

      {/* ── Body ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <Sidebar categories={sortedCats} activeId={activeCatId} onChange={handleCatChange} />

        <div style={{ flex: 1, overflowY: "auto" }}>
          {/* Section title */}
          <div style={{ padding: "16px 16px 10px" }}>
            <p style={{
              color: "#4A2E1F", fontSize: "1.0625rem", fontWeight: 800, lineHeight: 1.2,
              display: "flex", alignItems: "center", gap: "8px",
            }}>
              <CatIcon id={activeCat?.id} size={24} /> {activeCat?.name}
            </p>
          </div>

          {/* Grid */}
          <div style={{
            padding: "0 12px",
            paddingBottom: totalItems > 0 ? "100px" : "28px",
          }}>
            {visibleItems.length === 0 ? (
              items.length === 0 && categories.length > 0 ? (
                // 整个小厨房都空着（比如把模板菜删光了）：给出明确出路
                <div style={{ padding: "40px 16px", textAlign: "center" }}>
                  <p style={{ fontSize: "2rem" }}>🍳</p>
                  <p style={{ color: "#3A2A1A", fontSize: "0.9375rem", fontWeight: 700, marginTop: "10px" }}>
                    小厨房还空着
                  </p>
                  <p style={{ color: "#9A7B5F", fontSize: "0.8125rem", marginTop: "6px", lineHeight: 1.6 }}>
                    先加几道 TA 会做的菜吧
                  </p>
                  <button onClick={() => router.push("/chufang/library")} style={{
                    marginTop: "16px", padding: "12px 28px", borderRadius: "999px", border: "none",
                    background: "linear-gradient(180deg, #F5B460 0%, #E8991E 100%)",
                    color: "#FFFFFF", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer",
                  }}>
                    去菜品库挑几道
                  </button>
                </div>
              ) : (
                <div style={{ padding: "50px 16px", textAlign: "center" }}>
                  <p style={{ color: "#B08A68", fontSize: "0.875rem" }}>这个分类还空着</p>
                </div>
              )
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {visibleItems.map(item => {
                  const cat = categories.find(c => c.id === item.category_id);
                  const qty = getQuantity(item.id);
                  return (
                    <FoodCard
                      key={item.id}
                      item={item}
                      categoryId={item.category_id}
                      quantity={qty}
                      onIncrease={() => cat && addToCart(item, cat)}
                      onDecrease={() => decreaseFromCart(item.id)}
                      onClick={() => setSelectedItem(item)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 「随便吃什么」floating button ── */}
      <button
        onClick={openRandom}
        style={{
          position: "fixed",
          bottom: `calc(${navH} + 22px)`,
          left: "16px",
          zIndex: 40,
          padding: "12px 18px",
          borderRadius: "999px",
          border: "none", cursor: "pointer",
          background: "linear-gradient(180deg, #FFFDF8 0%, #FFF1DD 100%)",
          color: "#C47A2C", fontSize: "0.875rem", fontWeight: 700,
          display: "flex", alignItems: "center", gap: "6px",
          boxShadow: "0 6px 18px rgba(166,112,58,0.28)",
        }}
      >
        <span style={{ fontSize: "1.05rem" }}>🎲</span> 随便吃什么
      </button>

      {/* ── Floating cart button ── */}
      {totalItems > 0 && (
        <button
          onClick={() => setShowSendModal(true)}
          style={{
            position: "fixed",
            bottom: `calc(${navH} + 14px)`,
            right: "20px",
            zIndex: 40,
            width: "72px", height: "72px",
            borderRadius: "24px",
            border: "none", cursor: "pointer", padding: "10px",
            backgroundColor: "#FFFDF8",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 24px rgba(232,153,30,0.35)",
          }}
        >
          <img src="/cart-icon.png" alt="购物车" style={{
            width: "100%", height: "100%", objectFit: "contain", display: "block",
          }} />
          <span style={{
            position: "absolute", top: "-6px", right: "-6px",
            backgroundColor: "#E85D2F", color: "#FFFFFF",
            fontSize: "0.75rem", fontWeight: 800,
            borderRadius: "999px", padding: "2px 7px",
            minWidth: "22px", textAlign: "center",
            boxShadow: "0 2px 6px rgba(232,93,47,0.5)",
            border: "2px solid #FFFDF8",
          }}>{totalItems}</span>
        </button>
      )}

      {/* ── Modals ── */}
      <ItemDetailModal
        item={selectedItem}
        category={detailCat}
        quantity={selectedItem ? getQuantity(selectedItem.id) : 0}
        onIncrease={() => { if (selectedItem && detailCat) addToCart(selectedItem, detailCat); }}
        onDecrease={() => { if (selectedItem) decreaseFromCart(selectedItem.id); }}
        onClose={() => setSelectedItem(null)}
        onEdit={item => { setFormItem(item); setShowForm(true); }}
        onDelete={item => { deleteItem(item.id); setSelectedItem(null); }}
      />

      {showSendModal && (
        <SendModal
          cartItems={cartItems}
          categories={categories}
          onClose={() => setShowSendModal(false)}
          onDone={() => { setShowSendModal(false); clearCart(); }}
          onSave={log => saveMealLog(log)}
          onIncrease={itemId => {
            const item = items.find(i => i.id === itemId);
            const cat = categories.find(c => c.id === item?.category_id);
            if (item && cat) addToCart(item, cat);
          }}
          onDecrease={itemId => decreaseFromCart(itemId)}
        />
      )}

      {showForm && (
        <ItemForm
          item={formItem}
          categories={categories}
          existingItems={items}
          onSave={item => {
            formItem ? updateItem(item) : addItem(item);
            setShowForm(false); setFormItem(null);
          }}
          onCancel={() => { setShowForm(false); setFormItem(null); }}
        />
      )}

      {showCoverSheet && space && (
        <CoverSheet
          current={space.cover_preset}
          customUrl={space.cover_image_url}
          uploading={uploadingCover}
          onPick={changeCover}
          onUpload={pickCoverPhoto}
          onClose={() => !uploadingCover && setShowCoverSheet(false)}
        />
      )}

      {cropSrc && (
        <CoverCropper
          src={cropSrc}
          uploading={uploadingCover}
          onConfirm={confirmCrop}
          onCancel={() => !uploadingCover && setCropSrc(null)}
        />
      )}

      {toast && (
        <div style={{
          position: "fixed", bottom: `calc(${navH} + 90px)`, left: "50%",
          transform: "translateX(-50%)", zIndex: 70,
          backgroundColor: "rgba(60,36,21,0.92)", color: "#FFF",
          padding: "10px 20px", borderRadius: "999px",
          fontSize: "0.8125rem", whiteSpace: "nowrap",
        }}>{toast}</div>
      )}

      {showRandom && (
        <RandomModal
          item={randomItem}
          category={categories.find(c => c.id === randomItem?.category_id)}
          poolSize={randomPool.length}
          onAgain={rollRandom}
          onAccept={() => {
            const cat = categories.find(c => c.id === randomItem?.category_id);
            if (randomItem && cat) addToCart(randomItem, cat);
            setShowRandom(false);
          }}
          onClose={() => setShowRandom(false)}
          onGoLibrary={() => router.push("/chufang/library")}
          onGoKitchen={() => router.push("/chufang")}
        />
      )}
    </div>
  );
}
