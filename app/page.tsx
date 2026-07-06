"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore, useCart, saveMealLog } from "@/lib/store";
import { MenuItem, Category, MealLog } from "@/lib/types";
import ItemDetailModal from "@/components/ItemDetailModal";
import ItemForm from "@/components/ItemForm";

/* ─── icons & helpers ─── */
const CAT_ICONS: Record<string, string> = {
  zaochan: "🍳", zhushi: "🍚", mianshi: "🍜",
  rourou:  "🥩", caicai: "🥦", shuiguo: "🍓",
  tianpin: "🍮", yao:    "💊",
};

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
            <div style={{ fontSize: "1.25rem", marginBottom: "3px", lineHeight: 1 }}>
              {CAT_ICONS[cat.id] ?? "🍽️"}
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
  const placeholderEmoji = CAT_ICONS[categoryId] ?? "🍽️";
  const ingShort = shortIngredients(item.ingredients);

  return (
    <div style={{
      backgroundColor: "#FFFFFF",
      borderRadius: "22px",
      overflow: "hidden",
      border: "1.5px solid rgba(240,210,170,0.6)",
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
            <span style={{ fontSize: "2.25rem" }}>{placeholderEmoji}</span>
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
            color: "#B08A68", fontSize: "0.6875rem", marginTop: "4px",
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
  onSave: (log: MealLog) => void;
  onIncrease: (itemId: string) => void;
  onDecrease: (itemId: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

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

  const handleSave = () => {
    const today = new Date().toISOString().split("T")[0];
    const log: MealLog = {
      id: crypto.randomUUID(), date: today,
      items: cartItems.map(ci => ({
        item_id: ci.item.id, name: ci.item.name,
        category_name: ci.category.name, image_url: ci.item.image_url,
        quantity: ci.quantity,
      })),
      created_at: new Date().toISOString(),
    };
    onSave(log);
    setSaved(true);
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
              {saved ? "✓ 已保存到食记" : "今日菜单"}
            </h2>
            {saved && (
              <p style={{ color: "#9A7B5F", fontSize: "0.8125rem", marginTop: "2px" }}>
                已保存到食记，可以复制发给主厨
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
              <p style={{ color: "#B08A68", fontSize: "0.75rem", fontWeight: 700, marginBottom: "6px" }}>
                {CAT_ICONS[category.id] ?? "🍽️"} {category.name}
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
                      fontSize: "1.1rem",
                    }}>{CAT_ICONS[ci.item.category_id] ?? "🍽️"}</div>
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
            <button onClick={handleSave} style={{
              flex: 1, padding: "13px", borderRadius: "16px",
              background: "linear-gradient(180deg, #F5B460 0%, #E8991E 100%)",
              color: "#FFFFFF", fontSize: "0.875rem", fontWeight: 700,
              border: "none", cursor: "pointer",
              boxShadow: "0 5px 16px rgba(232,153,30,0.38)",
            }}>
              保存到食记
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
                  fontSize: "3.5rem",
                }}>{CAT_ICONS[item.category_id] ?? "🍽️"}</div>
              )}
            </div>
            <div style={{ padding: "18px 20px 22px" }}>
              <p style={{ color: "#B08A68", fontSize: "0.75rem" }}>今天就吃——</p>
              <h2 style={{ color: "#3A2A1A", fontSize: "1.375rem", fontWeight: 800, marginTop: "4px" }}>
                {item.name}
              </h2>
              {category && (
                <p style={{ color: "#B08A68", fontSize: "0.75rem", marginTop: "4px" }}>
                  {CAT_ICONS[category.id] ?? "🍽️"} {category.name}
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
      {/* ── Banner ── */}
      <div style={{ flexShrink: 0, width: "100%", aspectRatio: "1916 / 821", overflow: "hidden" }}>
        <img
          src="/header-bg.png"
          alt=""
          style={{
            width: "100%", height: "100%",
            objectFit: "cover", objectPosition: "center",
            display: "block",
          }}
        />
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <Sidebar categories={sortedCats} activeId={activeCatId} onChange={handleCatChange} />

        <div style={{ flex: 1, overflowY: "auto" }}>
          {/* Section title */}
          <div style={{ padding: "16px 16px 10px" }}>
            <p style={{ color: "#4A2E1F", fontSize: "1.0625rem", fontWeight: 800, lineHeight: 1.2 }}>
              {CAT_ICONS[activeCat?.id ?? ""] ?? "🍽️"} {activeCat?.name}
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
          onSave={log => { saveMealLog(log); }}
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
