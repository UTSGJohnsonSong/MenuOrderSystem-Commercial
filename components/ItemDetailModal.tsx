"use client";

import { MenuItem, Category } from "@/lib/types";

interface Props {
  item: MenuItem | null;
  category: Category | undefined;
  isInCart: boolean;
  onAdd: () => void;
  onClose: () => void;
}

export default function ItemDetailModal({ item, category, isInCart, onAdd, onClose }: Props) {
  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: "rgba(61,44,34,0.4)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-t-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-sm px-2 py-1 rounded-full"
          style={{ color: "#8A6F5A" }}
        >
          ×
        </button>

        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full aspect-video object-cover rounded-t-3xl"
          />
        ) : (
          <div
            className="w-full aspect-video rounded-t-3xl"
            style={{ backgroundColor: "#FFE2BD" }}
          />
        )}

        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-xl font-semibold" style={{ color: "#3D2C22" }}>
              {item.name}
            </h2>
            {category && (
              <span
                className="text-xs px-2 py-1 rounded-full"
                style={{ backgroundColor: "#FFE2BD", color: "#FF9F43" }}
              >
                {category.name}
              </span>
            )}
          </div>

          {item.ingredients && (
            <>
              <p className="text-sm font-medium mt-4 mb-1" style={{ color: "#8A6F5A" }}>
                食材
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "#3D2C22" }}>
                {item.ingredients}
              </p>
            </>
          )}

          {item.instructions && (
            <>
              <p className="text-sm font-medium mt-4 mb-1" style={{ color: "#8A6F5A" }}>
                做法
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "#3D2C22" }}>
                {item.instructions}
              </p>
            </>
          )}

          {item.notes && (
            <>
              <p className="text-sm font-medium mt-4 mb-1" style={{ color: "#8A6F5A" }}>
                备注
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "#3D2C22" }}>
                {item.notes}
              </p>
            </>
          )}

          <button
            onClick={onAdd}
            className="w-full py-3 rounded-2xl text-sm font-medium mt-6 transition-colors"
            style={{
              backgroundColor: isInCart ? "#FFE2BD" : "#FF9F43",
              color: isInCart ? "#FF9F43" : "#ffffff",
            }}
          >
            {isInCart ? "已在今日菜单" : "加入今日菜单"}
          </button>
        </div>
      </div>
    </div>
  );
}
