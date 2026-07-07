"use client";

import { useState } from "react";
import { MenuItem, Category } from "@/lib/types";
import CatIcon from "@/components/CatIcon";

interface Props {
  item: MenuItem | null;
  category: Category | undefined;
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
  onClose: () => void;
  onEdit?: (item: MenuItem) => void;
  onDelete?: (item: MenuItem) => void;
}

export default function ItemDetailModal({
  item, category, quantity, onIncrease, onDecrease, onClose, onEdit, onDelete,
}: Props) {
  const [imgError, setImgError] = useState(false);

  if (!item) return null;

  const showPlaceholder = !item.image_url || imgError;

  const handleDelete = () => {
    if (window.confirm(`删除「${item.name}」？`)) {
      onDelete?.(item);
      onClose();
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 60, // 高于底部导航(50)，否则按钮被导航栏压住
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      backgroundColor: "rgba(45,31,20,0.45)",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: "480px",
        // vh 兜底（dvh 部分浏览器不支持会导致整个弹窗滚不动）；
        // 结构改为：图片固定 + 内容区滚动 + 按钮固定底部永远可见
        maxHeight: "88vh",
        display: "flex", flexDirection: "column",
        background: "linear-gradient(180deg, #FFFDF8 0%, #FFF7EA 100%)",
        borderRadius: "28px 28px 0 0",
        overflow: "hidden",
      }}>
        {/* Image */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          {showPlaceholder ? (
            <div style={{
              width: "100%", aspectRatio: "16/9",
              background: "linear-gradient(135deg, #FFF3E4 0%, #FFE8CC 100%)",
              borderRadius: "28px 28px 0 0",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: "8px",
            }}>
              <CatIcon id={category?.id} size={72} />
              <span style={{ color: "#C99558", fontSize: "0.75rem" }}>{item.name}</span>
            </div>
          ) : (
            <img src={item.image_url} alt={item.name} loading="lazy" onError={() => setImgError(true)}
              style={{
                width: "100%", aspectRatio: "16/9", objectFit: "cover",
                borderRadius: "28px 28px 0 0", display: "block",
              }} />
          )}
          <button onClick={onClose} style={{
            position: "absolute", top: "12px", right: "12px",
            width: "32px", height: "32px", borderRadius: "50%",
            backgroundColor: "rgba(255,255,255,0.88)",
            color: "#9A7B5F", fontSize: "1.1rem",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "none", cursor: "pointer",
          }}>×</button>
        </div>

        {/* Content：单独滚动区，长做法也能翻到底 */}
        <div style={{
          padding: "20px 20px 16px",
          flex: 1, minHeight: 0,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
        }}>
          {/* Title row + edit/delete */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
              <h2 style={{
                color: "#3C2415", fontSize: "1.125rem", fontWeight: 800,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{item.name}</h2>
              {category && (
                <span style={{
                  padding: "2px 10px", borderRadius: "999px",
                  backgroundColor: "#FFE8CC", color: "#C47A2C",
                  fontSize: "0.6875rem", fontWeight: 600, flexShrink: 0,
                }}>{category.name}</span>
              )}
            </div>
            {(onEdit || onDelete) && (
              <div style={{ display: "flex", gap: "8px", flexShrink: 0, marginLeft: "12px" }}>
                {onEdit && (
                  <button onClick={() => { onEdit(item); onClose(); }} style={{
                    padding: "5px 12px", borderRadius: "999px",
                    backgroundColor: "#FFF3E4", color: "#C47A2C",
                    fontSize: "0.75rem", fontWeight: 600,
                    border: "1px solid rgba(240,210,170,0.7)", cursor: "pointer",
                  }}>编辑</button>
                )}
                {onDelete && (
                  <button onClick={handleDelete} style={{
                    padding: "5px 12px", borderRadius: "999px",
                    backgroundColor: "#FFF0F0", color: "#D46060",
                    fontSize: "0.75rem", fontWeight: 600,
                    border: "1px solid rgba(220,140,140,0.4)", cursor: "pointer",
                  }}>删除</button>
                )}
              </div>
            )}
          </div>

          {item.ingredients && (
            <div style={{ marginBottom: "14px" }}>
              <p style={{ color: "#B08A68", fontSize: "0.6875rem", fontWeight: 700, marginBottom: "5px", letterSpacing: "0.04em" }}>食材</p>
              <p style={{ color: "#3C2415", fontSize: "0.875rem", lineHeight: 1.75 }}>{item.ingredients}</p>
            </div>
          )}
          {item.instructions && (
            <div style={{ marginBottom: "14px" }}>
              <p style={{ color: "#B08A68", fontSize: "0.6875rem", fontWeight: 700, marginBottom: "5px", letterSpacing: "0.04em" }}>做法</p>
              <p style={{ color: "#3C2415", fontSize: "0.875rem", lineHeight: 1.75 }}>{item.instructions}</p>
            </div>
          )}
          {item.notes && (
            <div style={{ marginBottom: "14px" }}>
              <p style={{ color: "#B08A68", fontSize: "0.6875rem", fontWeight: 700, marginBottom: "5px", letterSpacing: "0.04em" }}>备注</p>
              <p style={{ color: "#3C2415", fontSize: "0.875rem", lineHeight: 1.75 }}>{item.notes}</p>
            </div>
          )}

        </div>

        {/* Quantity control：固定底部，不随内容滚动 */}
        <div style={{
          flexShrink: 0,
          padding: "12px 20px",
          paddingBottom: "calc(14px + env(safe-area-inset-bottom))",
          borderTop: "1px solid rgba(240,216,180,0.5)",
          backgroundColor: "#FFFDF8",
        }}>
          <div>
            {quantity === 0 ? (
              <button onClick={onIncrease} style={{
                width: "100%", padding: "14px",
                borderRadius: "18px",
                background: "linear-gradient(180deg, #F5B460 0%, #E8991E 100%)",
                color: "#FFFFFF", fontSize: "0.9375rem", fontWeight: 700,
                border: "none", cursor: "pointer",
                boxShadow: "0 5px 16px rgba(232,153,30,0.38)",
              }}>加入今日菜单</button>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <p style={{ color: "#B08A68", fontSize: "0.875rem", flex: 1 }}>
                  已加入 <span style={{ color: "#E8991E", fontWeight: 700 }}>{quantity}</span> 份
                </p>
                <div style={{
                  display: "flex", alignItems: "center",
                  background: "linear-gradient(180deg, #F5B460 0%, #E8991E 100%)",
                  borderRadius: "999px", padding: "4px",
                  boxShadow: "0 4px 12px rgba(232,153,30,0.3)",
                }}>
                  <button onClick={onDecrease} style={{
                    width: "34px", height: "34px", borderRadius: "50%",
                    color: "#FFFFFF", fontSize: "22px", fontWeight: 300,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: "none", background: "transparent", cursor: "pointer",
                  }}>−</button>
                  <span style={{
                    color: "#FFFFFF", fontSize: "1rem", fontWeight: 700,
                    minWidth: "28px", textAlign: "center",
                  }}>{quantity}</span>
                  <button onClick={onIncrease} style={{
                    width: "34px", height: "34px", borderRadius: "50%",
                    color: "#FFFFFF", fontSize: "22px", fontWeight: 300,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: "none", background: "transparent", cursor: "pointer",
                  }}>+</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
