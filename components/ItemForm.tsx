"use client";

import { useState, useEffect, useRef } from "react";
import { MenuItem, Category } from "@/lib/types";
import { uploadImage } from "@/lib/store";
import { compressImage } from "@/lib/image";
import { uid } from "@/lib/uid";

interface Props {
  item: MenuItem | null;
  categories: Category[];
  existingItems: MenuItem[];
  onSave: (item: MenuItem) => void;
  onCancel: () => void;
}

export default function ItemForm({ item, categories, existingItems, onSave, onCancel }: Props) {
  const isEdit = !!item;
  const fileRef = useRef<HTMLInputElement>(null);

  const [categoryId, setCategoryId] = useState(item?.category_id ?? categories[0]?.id ?? "");
  const [name, setName] = useState(item?.name ?? "");
  const [imageUrl, setImageUrl] = useState(item?.image_url ?? "");
  const [ingredients, setIngredients] = useState(item?.ingredients ?? "");
  const [instructions, setInstructions] = useState(item?.instructions ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // 压缩后上传到服务器存文件，数据库里只存 URL（不再把 base64 塞进数据库）
      const compressed = await compressImage(file);
      const url = await uploadImage(compressed);
      setImageUrl(url);
    } catch {
      setError("图片上传失败，请重试");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSave = () => {
    if (!name.trim()) { setError("菜名不能为空"); return; }

    const now = new Date().toISOString();
    const categoryItems = existingItems.filter(i => i.category_id === categoryId);

    onSave({
      id: item?.id ?? uid(),
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
    });
  };

  const inputStyle = {
    border: "1px solid #FFE2BD", borderRadius: "1rem",
    padding: "12px 16px", fontSize: "0.875rem", width: "100%",
    backgroundColor: "#ffffff", color: "#3D2C22", outline: "none",
  };
  const labelStyle = {
    fontSize: "0.875rem", fontWeight: 500, color: "#8A6F5A",
    marginBottom: "4px", display: "block" as const,
  };

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white flex items-center justify-between px-4 py-4 border-b"
        style={{ borderColor: "#FFE2BD" }}>
        <button onClick={onCancel} className="text-sm" style={{ color: "#8A6F5A" }}>取消</button>
        <h2 className="text-base font-semibold" style={{ color: "#3D2C22" }}>
          {isEdit ? "编辑菜品" : "添加菜品"}
        </h2>
        <button onClick={handleSave} className="text-sm font-medium" style={{ color: "#FF9F43" }}>保存</button>
      </div>

      <div className="p-4 flex flex-col gap-4 pb-12">
        {error && <p className="text-sm text-red-400">{error}</p>}

        {/* 分类 */}
        <div>
          <label style={labelStyle}>分类</label>
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)} style={inputStyle}>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* 菜名 */}
        <div>
          <label style={labelStyle}>菜名</label>
          <input type="text" value={name}
            onChange={e => { setName(e.target.value); setError(""); }}
            placeholder="请输入菜名" style={inputStyle} />
        </div>

        {/* 图片上传 */}
        <div>
          <label style={labelStyle}>菜品图片</label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />

          {imageUrl ? (
            <div style={{ position: "relative", borderRadius: "16px", overflow: "hidden" }}>
              <img src={imageUrl} alt="菜品图片"
                style={{ width: "100%", height: "180px", objectFit: "cover", display: "block" }} />
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
                background: "rgba(0,0,0,0.3)",
              }}>
                <button onClick={() => fileRef.current?.click()} style={{
                  padding: "8px 18px", borderRadius: "999px",
                  backgroundColor: "#FFFFFF", color: "#3D2C22",
                  fontSize: "0.8125rem", fontWeight: 600, border: "none", cursor: "pointer",
                }}>换一张</button>
                <button onClick={() => setImageUrl("")} style={{
                  padding: "8px 18px", borderRadius: "999px",
                  backgroundColor: "rgba(255,255,255,0.25)", color: "#FFFFFF",
                  fontSize: "0.8125rem", fontWeight: 600,
                  border: "1px solid rgba(255,255,255,0.5)", cursor: "pointer",
                }}>删除</button>
              </div>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{
              width: "100%", height: "120px", borderRadius: "16px",
              border: "2px dashed #FFD4A0", backgroundColor: "#FFFBF5",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: "8px",
              cursor: uploading ? "not-allowed" : "pointer",
              color: "#C49A6C",
            }}>
              {uploading ? (
                <>
                  <span style={{ fontSize: "1.5rem" }}>⏳</span>
                  <span style={{ fontSize: "0.8125rem" }}>处理中…</span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: "2rem" }}>📷</span>
                  <span style={{ fontSize: "0.8125rem", fontWeight: 500 }}>点击选择照片</span>
                  <span style={{ fontSize: "0.6875rem", color: "#C8A878" }}>从相册选择或拍照</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* 食材 */}
        <div>
          <label style={labelStyle}>食材</label>
          <textarea value={ingredients} onChange={e => setIngredients(e.target.value)}
            rows={3} placeholder="食材列表..." style={{ ...inputStyle, resize: "none" }} />
        </div>

        {/* 做法 */}
        <div>
          <label style={labelStyle}>做法</label>
          <textarea value={instructions} onChange={e => setInstructions(e.target.value)}
            rows={4} placeholder="步骤说明..." style={{ ...inputStyle, resize: "none" }} />
        </div>

        {/* 备注 */}
        <div>
          <label style={labelStyle}>备注</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            rows={2} placeholder="小贴士（可选）" style={{ ...inputStyle, resize: "none" }} />
        </div>
      </div>
    </div>
  );
}
