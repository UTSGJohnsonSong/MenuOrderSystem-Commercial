"use client";

import { useState, useMemo, useEffect } from "react";
import { useStore, useCart, useMealLog } from "@/lib/store";
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

/* ─── Main 点菜 Page ─── */
export default function OrderPage() {
  const { cartItems, addToCart, decreaseFromCart, clearCart, getQuantity, totalItems } = useCart();
  const { saveLog } = useMealLog();

  const { categories, items, addItem, updateItem, deleteItem } = useStore();

  const [activeCatId, setActiveCatId] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [formItem, setFormItem] = useState<MenuItem | null>(null);
  const [showForm, setShowForm] = useState(false);

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
      <div style={{ flexShrink: 0, height: "260px", overflow: "hidden" }}>
        <img
          src="/header-bg.png"
          alt=""
          style={{
            width: "100%", height: "100%",
            objectFit: "cover", objectPosition: "center top",
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
              <div style={{ padding: "50px 16px", textAlign: "center" }}>
                <p style={{ color: "#B08A68", fontSize: "0.875rem" }}>这个分类还没有菜品</p>
              </div>
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

      {/* ── Floating bar ── */}
      {totalItems > 0 && (
        <div style={{
          position: "fixed",
          bottom: `calc(${navH} + 10px)`,
          left: "50%", transform: "translateX(-50%)",
          width: "calc(100% - 48px)", maxWidth: "380px",
          zIndex: 40,
        }}>
          <div style={{
            display: "flex", alignItems: "center",
            background: "rgba(255, 250, 242, 0.82)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderRadius: "20px",
            border: "1px solid rgba(240, 210, 160, 0.55)",
            padding: "8px 8px 8px 14px",
            boxShadow: "0 4px 20px rgba(120,80,40,0.13)",
          }}>
            <div style={{
              width: "32px", height: "32px", borderRadius: "10px",
              background: "linear-gradient(180deg, #F5B460, #E8991E)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, position: "relative", marginRight: "10px",
            }}>
              <span style={{ fontSize: "0.875rem" }}>🧺</span>
              <span style={{
                position: "absolute", top: "-4px", right: "-4px",
                backgroundColor: "#E85D2F", color: "#FFFFFF",
                fontSize: "0.5rem", fontWeight: 800,
                borderRadius: "999px", padding: "1px 4px",
                minWidth: "14px", textAlign: "center",
              }}>{totalItems}</span>
            </div>
            <p style={{ flex: 1, color: "#3C2415", fontSize: "0.8125rem", fontWeight: 700 }}>
              已选 {totalItems} 样
            </p>
            <button
              onClick={() => setShowSendModal(true)}
              style={{
                padding: "8px 18px", borderRadius: "14px",
                background: "linear-gradient(180deg, #F5B460 0%, #E8991E 100%)",
                color: "#FFFFFF", fontSize: "0.8125rem", fontWeight: 700,
                border: "none", cursor: "pointer",
                boxShadow: "0 3px 10px rgba(232,153,30,0.38)",
              }}
            >点菜</button>
          </div>
        </div>
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
          onSave={log => { saveLog(log); }}
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
    </div>
  );
}
