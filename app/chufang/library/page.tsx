"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { LIBRARY_DISHES, LIBRARY_CATS, searchLibrary, LibraryDish } from "@/lib/library";
import { uid } from "@/lib/uid";

export default function LibraryPage() {
  const router = useRouter();
  const { categories, items, addItem } = useStore();

  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [picking, setPicking] = useState<LibraryDish | null>(null);
  const [saving, setSaving] = useState(false);
  const [addedNames, setAddedNames] = useState<Set<string>>(new Set());
  // 管理员配的库菜图片（用户只读），加菜时一并复制到自己的菜单
  const [libImages, setLibImages] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/library/images")
      .then(r => r.json())
      .then(d => setLibImages(d.images ?? {}))
      .catch(() => {});
  }, []);

  const navH = "calc(56px + env(safe-area-inset-bottom))";

  // 已在菜单里的菜（按菜名判断），加号变成「已加入」
  const existingNames = useMemo(() => new Set(items.map(i => i.name)), [items]);
  const isAdded = (d: LibraryDish) => existingNames.has(d.name) || addedNames.has(d.name);

  const results = useMemo(() => {
    const searched = searchLibrary(query);
    return catFilter === "all" ? searched : searched.filter(d => d.cat === catFilter);
  }, [query, catFilter]);

  const sortedCats = [...categories].sort((a, b) => a.sort_order - b.sort_order);
  const catName = (id: string) => LIBRARY_CATS.find(c => c.id === id)?.name ?? "";

  const handlePickCategory = async (dish: LibraryDish, categoryId: string) => {
    if (saving) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      await addItem({
        id: uid(), // 服务端会重新生成
        category_id: categoryId,
        name: dish.name,
        image_url: libImages[dish.name] ?? "",
        ingredients: dish.ingredients,
        instructions: dish.instructions,
        notes: "",
        is_active: true,
        sort_order: items.filter(i => i.category_id === categoryId).length + 1,
        created_at: now,
        updated_at: now,
      });
      setAddedNames(prev => new Set(prev).add(dish.name));
      setPicking(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "添加失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ height: `calc(100dvh - ${navH})`, display: "flex", flexDirection: "column", backgroundColor: "#FFF8EF" }}>
      {/* Header + 搜索（固定） */}
      <div style={{ padding: "20px 16px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => router.push("/chufang")} style={{ color: "#9A7B5F", fontSize: "0.875rem" }}>
            ← 厨房
          </button>
          <h1 style={{ color: "#3A2A1A", fontSize: "1.125rem", fontWeight: 700, flex: 1 }}>菜品库</h1>
          <span style={{ color: "#C4A484", fontSize: "0.75rem" }}>{LIBRARY_DISHES.length} 道家常菜</span>
        </div>

        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="搜菜名或食材，比如：鸡翅、肉、豆腐…"
          style={{
            width: "100%", marginTop: "14px", padding: "12px 16px",
            borderRadius: "999px", border: "1px solid #FFE2BD",
            backgroundColor: "#FFFFFF", color: "#3A2A1A",
            fontSize: "0.875rem", outline: "none",
          }}
        />

        {/* 分类筛选 */}
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", padding: "12px 0 10px", scrollbarWidth: "none" }}>
          {[{ id: "all", name: "全部" }, ...LIBRARY_CATS].map(c => (
            <button key={c.id} onClick={() => setCatFilter(c.id)} style={{
              flexShrink: 0, padding: "6px 14px", borderRadius: "999px",
              fontSize: "0.8125rem", fontWeight: catFilter === c.id ? 700 : 400,
              backgroundColor: catFilter === c.id ? "#F2A24A" : "#FFFFFF",
              color: catFilter === c.id ? "#FFFFFF" : "#9A7B5F",
              border: "1px solid " + (catFilter === c.id ? "#F2A24A" : "#FFE2BD"),
            }}>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* 结果列表（滚动区） */}
      <div style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain", padding: "0 12px 24px" }}>
        {results.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <p style={{ fontSize: "2rem", marginBottom: "12px" }}>🍳</p>
            <p style={{ color: "#3A2A1A", fontSize: "0.9375rem", fontWeight: 600 }}>没搜到「{query}」</p>
            <p style={{ color: "#9A7B5F", fontSize: "0.8125rem", marginTop: "6px" }}>
              可以回厨房手动添加这道菜，做法照片都由你定
            </p>
            <button onClick={() => router.push("/chufang")} style={{
              marginTop: "16px", padding: "10px 24px", borderRadius: "999px",
              backgroundColor: "#F2A24A", color: "#FFFFFF", fontSize: "0.875rem", fontWeight: 600,
            }}>
              去手动添加
            </button>
          </div>
        ) : (
          results.map(dish => {
            const added = isAdded(dish);
            return (
              <div key={dish.name} style={{
                display: "flex", alignItems: "center", gap: "12px",
                backgroundColor: "#FFFFFF", borderRadius: "16px",
                padding: "12px 14px", marginBottom: "8px",
                boxShadow: "0 1px 6px rgba(58,42,26,0.06)",
              }}>
                {libImages[dish.name] && (
                  <img src={libImages[dish.name]} alt={dish.name} loading="lazy" style={{
                    width: "52px", height: "52px", borderRadius: "12px",
                    objectFit: "cover", flexShrink: 0,
                  }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <p style={{ color: "#3A2A1A", fontSize: "0.9375rem", fontWeight: 600 }}>{dish.name}</p>
                    <span style={{
                      flexShrink: 0, padding: "1px 8px", borderRadius: "999px",
                      backgroundColor: "#FFF3E0", color: "#C4854A", fontSize: "0.6875rem",
                    }}>
                      {catName(dish.cat)}
                    </span>
                  </div>
                  <p style={{
                    color: "#9A7B5F", fontSize: "0.75rem", marginTop: "3px",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {dish.ingredients}
                  </p>
                </div>
                <button
                  onClick={() => !added && setPicking(dish)}
                  disabled={added}
                  style={{
                    flexShrink: 0, padding: "7px 16px", borderRadius: "999px",
                    fontSize: "0.8125rem", fontWeight: 600,
                    backgroundColor: added ? "#F5EDE2" : "#F2A24A",
                    color: added ? "#B0977D" : "#FFFFFF",
                  }}
                >
                  {added ? "✓ 已加入" : "＋ 加入"}
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* 选分类弹层 */}
      {picking && (
        <div
          onClick={() => !saving && setPicking(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            backgroundColor: "rgba(58,42,26,0.35)",
            display: "flex", alignItems: "flex-end",
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{
            width: "100%", backgroundColor: "#FFF8EF",
            borderRadius: "24px 24px 0 0", padding: "20px 16px",
            paddingBottom: "calc(20px + env(safe-area-inset-bottom))",
          }}>
            <p style={{ color: "#3A2A1A", fontSize: "1rem", fontWeight: 700, textAlign: "center" }}>
              「{picking.name}」加进哪个分类？
            </p>
            <p style={{ color: "#9A7B5F", fontSize: "0.75rem", textAlign: "center", marginTop: "4px", marginBottom: "16px" }}>
              加入后随时可以在「菜品管理」里编辑或换图
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {sortedCats.map(c => {
                const suggested = c.id === picking.cat;
                return (
                  <button
                    key={c.id}
                    disabled={saving}
                    onClick={() => handlePickCategory(picking, c.id)}
                    style={{
                      padding: "13px 8px", borderRadius: "14px",
                      fontSize: "0.875rem", fontWeight: suggested ? 700 : 500,
                      backgroundColor: suggested ? "#F2A24A" : "#FFFFFF",
                      color: suggested ? "#FFFFFF" : "#3A2A1A",
                      border: "1px solid " + (suggested ? "#F2A24A" : "#FFE2BD"),
                      opacity: saving ? 0.6 : 1,
                    }}
                  >
                    {c.name}{suggested ? " ✓ 推荐" : ""}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setPicking(null)}
              disabled={saving}
              style={{
                width: "100%", marginTop: "14px", padding: "12px",
                borderRadius: "14px", color: "#9A7B5F", fontSize: "0.875rem",
                backgroundColor: "transparent",
              }}
            >
              {saving ? "正在加入…" : "取消"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
