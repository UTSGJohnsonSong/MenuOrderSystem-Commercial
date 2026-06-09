"use client";

import { useState, useEffect } from "react";
import { MenuItem, Category } from "@/lib/types";

interface Props {
  item: MenuItem | null;
  categories: Category[];
  existingItems: MenuItem[];
  onSave: (item: MenuItem) => void;
  onCancel: () => void;
}

export default function ItemForm({
  item,
  categories,
  existingItems,
  onSave,
  onCancel,
}: Props) {
  const isEdit = !!item;

  const [categoryId, setCategoryId] = useState(
    item?.category_id ?? categories[0]?.id ?? ""
  );
  const [name, setName] = useState(item?.name ?? "");
  const [imageUrl, setImageUrl] = useState(item?.image_url ?? "");
  const [ingredients, setIngredients] = useState(item?.ingredients ?? "");
  const [instructions, setInstructions] = useState(item?.instructions ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [error, setError] = useState("");

  useEffect(() => {
    if (item) {
      setCategoryId(item.category_id);
      setName(item.name);
      setImageUrl(item.image_url);
      setIngredients(item.ingredients);
      setInstructions(item.instructions);
      setNotes(item.notes);
    }
  }, [item]);

  const handleSave = () => {
    if (!name.trim()) {
      setError("菜名不能为空");
      return;
    }

    const now = new Date().toISOString();
    const categoryItems = existingItems.filter(
      (i) => i.category_id === categoryId
    );

    const saved: MenuItem = {
      id: item?.id ?? crypto.randomUUID(),
      category_id: categoryId,
      name: name.trim(),
      image_url: imageUrl.trim(),
      ingredients: ingredients.trim(),
      instructions: instructions.trim(),
      notes: notes.trim(),
      is_active: item?.is_active ?? true,
      sort_order: item?.sort_order ?? categoryItems.length + 1,
      created_at: item?.created_at ?? now,
      updated_at: now,
    };

    onSave(saved);
  };

  const inputStyle = {
    border: "1px solid #FFE2BD",
    borderRadius: "1rem",
    padding: "12px 16px",
    fontSize: "0.875rem",
    width: "100%",
    backgroundColor: "#ffffff",
    color: "#3D2C22",
    outline: "none",
  };

  const labelStyle = {
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "#8A6F5A",
    marginBottom: "4px",
    display: "block" as const,
  };

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      <div
        className="sticky top-0 bg-white flex items-center justify-between px-4 py-4 border-b"
        style={{ borderColor: "#FFE2BD" }}
      >
        <button
          onClick={onCancel}
          className="text-sm"
          style={{ color: "#8A6F5A" }}
        >
          取消
        </button>
        <h2 className="text-base font-semibold" style={{ color: "#3D2C22" }}>
          {isEdit ? "编辑菜品" : "添加菜品"}
        </h2>
        <button
          onClick={handleSave}
          className="text-sm font-medium"
          style={{ color: "#FF9F43" }}
        >
          保存
        </button>
      </div>

      <div className="p-4 flex flex-col gap-4 pb-12">
        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        <div>
          <label style={labelStyle}>分类</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            style={inputStyle}
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>菜名</label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            placeholder="请输入菜名"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>图片链接</label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>食材</label>
          <textarea
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            rows={3}
            placeholder="食材列表..."
            style={{ ...inputStyle, resize: "none" }}
          />
        </div>

        <div>
          <label style={labelStyle}>做法</label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={4}
            placeholder="步骤说明..."
            style={{ ...inputStyle, resize: "none" }}
          />
        </div>

        <div>
          <label style={labelStyle}>备注</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="小贴士（可选）"
            style={{ ...inputStyle, resize: "none" }}
          />
        </div>
      </div>
    </div>
  );
}
