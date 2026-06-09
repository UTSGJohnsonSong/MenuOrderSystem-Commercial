"use client";

import { useState } from "react";
import { useStore, useCart } from "@/lib/store";
import ItemForm from "@/components/ItemForm";
import { MenuItem } from "@/lib/types";

function EntryCard({ label, desc, color, onClick }: {
  label: string; desc: string; color: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{
      backgroundColor: "#FFFFFF", borderRadius: "20px",
      padding: "20px 16px", textAlign: "left",
      boxShadow: "0 2px 10px rgba(58,42,26,0.07)",
      border: "none", cursor: "pointer", width: "100%",
    }}>
      <div style={{
        width: "44px", height: "44px", borderRadius: "14px",
        backgroundColor: color,
        marginBottom: "10px",
      }} />
      <p style={{ color: "#3A2A1A", fontSize: "0.9375rem", fontWeight: 700, marginBottom: "4px" }}>
        {label}
      </p>
      <p style={{ color: "#9A7B5F", fontSize: "0.75rem", lineHeight: 1.4 }}>
        {desc}
      </p>
    </button>
  );
}

export default function ChufangPage() {
  const { categories, items, addItem, updateItem, deleteItem } = useStore();
  const { totalItems } = useCart();
  const [view, setView] = useState<"home" | "manage">("home");
  const [formItem, setFormItem] = useState<MenuItem | null>(null);
  const [showForm, setShowForm] = useState(false);

  const navH = "calc(56px + env(safe-area-inset-bottom))";

  const sortedCats = [...categories].sort((a, b) => a.sort_order - b.sort_order);
  const grouped = sortedCats.map(cat => ({
    category: cat,
    items: items.filter(i => i.category_id === cat.id).sort((a, b) => a.sort_order - b.sort_order),
  })).filter(g => g.items.length > 0);

  if (view === "manage") {
    return (
      <div style={{ height: `calc(100dvh - ${navH})`, overflowY: "auto", overscrollBehavior: "contain", backgroundColor: "#FFF8EF" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "12px",
          padding: "20px 16px 12px",
          borderBottom: "1px solid rgba(242,162,74,0.12)",
        }}>
          <button onClick={() => setView("home")} style={{ color: "#9A7B5F", fontSize: "0.875rem" }}>
            ← 返回
          </button>
          <h1 style={{ color: "#3A2A1A", fontSize: "1rem", fontWeight: 700, flex: 1 }}>菜品管理</h1>
          <button onClick={() => { setFormItem(null); setShowForm(true); }} style={{
            padding: "6px 14px", borderRadius: "999px",
            backgroundColor: "#F2A24A", color: "#FFFFFF",
            fontSize: "0.8125rem", fontWeight: 600,
          }}>添加</button>
        </div>

        <div style={{ paddingBottom: "100px" }}>
          {grouped.map(({ category, items: catItems }) => (
            <div key={category.id}>
              <p style={{ color: "#9A7B5F", fontSize: "0.75rem", fontWeight: 500, padding: "14px 16px 6px" }}>
                {category.name}
              </p>
              {catItems.map(item => (
                <div key={item.id} style={{
                  display: "flex", alignItems: "center",
                  backgroundColor: "#FFFFFF", borderRadius: "16px",
                  margin: "0 12px 8px", padding: "10px 14px",
                  boxShadow: "0 1px 6px rgba(58,42,26,0.06)", gap: "12px",
                }}>
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} loading="lazy" style={{
                      width: "52px", height: "52px", borderRadius: "12px",
                      objectFit: "cover", flexShrink: 0,
                    }} />
                  ) : (
                    <div style={{
                      width: "52px", height: "52px", borderRadius: "12px", flexShrink: 0,
                      background: "linear-gradient(135deg, #FFE8CC, #FFF3E0)",
                    }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      color: "#3A2A1A", fontSize: "0.875rem", fontWeight: 600,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{item.name}</p>
                  </div>
                  <div style={{ display: "flex", gap: "14px", flexShrink: 0 }}>
                    <button onClick={() => { setFormItem(item); setShowForm(true); }}
                      style={{ color: "#F2A24A", fontSize: "0.8125rem", fontWeight: 500 }}>编辑</button>
                    <button onClick={() => {
                      if (window.confirm(`删除「${item.name}」？`)) deleteItem(item.id);
                    }} style={{ color: "#E07070", fontSize: "0.8125rem" }}>删除</button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

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

  return (
    <div style={{ height: `calc(100dvh - ${navH})`, overflowY: "auto", overscrollBehavior: "contain", backgroundColor: "#FFF8EF" }}>
      {/* Header */}
      <div style={{ padding: "24px 20px 20px" }}>
        <h1 style={{ color: "#3A2A1A", fontSize: "1.25rem", fontWeight: 700 }}>厨房</h1>
        <p style={{ color: "#9A7B5F", fontSize: "0.8125rem", marginTop: "4px" }}>
          管理家里的菜谱和分类
        </p>
      </div>

      {/* Entry grid */}
      <div style={{ padding: "0 16px 120px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <EntryCard
            label="添加菜谱"
            desc="新增一道家常菜"
            color="#FFE3BF"
            onClick={() => { setFormItem(null); setShowForm(true); }}
          />
          <EntryCard
            label="菜品管理"
            desc="编辑或删除菜品"
            color="#FFD6D6"
            onClick={() => setView("manage")}
          />
          <EntryCard
            label="分类管理"
            desc="整理菜品分类"
            color="#D6EAD6"
            onClick={() => {}}
          />
          <EntryCard
            label="我的收藏"
            desc="常吃的喜欢的菜"
            color="#D6E0FF"
            onClick={() => {}}
          />
        </div>

        {/* Stats */}
        <div style={{
          marginTop: "20px", padding: "16px",
          backgroundColor: "#FFFFFF", borderRadius: "20px",
          boxShadow: "0 2px 10px rgba(58,42,26,0.07)",
          display: "flex", gap: "0",
        }}>
          {[
            { label: "菜品总数", value: items.length },
            { label: "分类数量", value: categories.length },
            { label: "今日已点", value: totalItems },
          ].map((stat, i) => (
            <div key={i} style={{
              flex: 1, textAlign: "center",
              borderLeft: i > 0 ? "1px solid rgba(242,162,74,0.15)" : "none",
            }}>
              <p style={{ color: "#F2A24A", fontSize: "1.375rem", fontWeight: 800 }}>{stat.value}</p>
              <p style={{ color: "#9A7B5F", fontSize: "0.6875rem" }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

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
