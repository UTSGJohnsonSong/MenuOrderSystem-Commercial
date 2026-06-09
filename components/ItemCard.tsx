"use client";

import { useState } from "react";
import { MenuItem } from "@/lib/types";

interface Props {
  item: MenuItem;
  isInCart: boolean;
  onAdd: () => void;
  onClick: () => void;
}

export default function ItemCard({ item, isInCart, onAdd, onClick }: Props) {
  const [imgError, setImgError] = useState(false);
  const showPlaceholder = !item.image_url || imgError;

  return (
    <div
      onClick={onClick}
      className="cursor-pointer active:scale-[0.97] transition-transform"
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: "20px",
        overflow: "hidden",
        boxShadow: "0 2px 12px rgba(58,42,26,0.07)",
      }}
    >
      {showPlaceholder ? (
        <div
          className="w-full flex items-center justify-center"
          style={{
            aspectRatio: "4/3",
            background: "linear-gradient(135deg, #FFE8CC 0%, #FFF3E0 100%)",
          }}
        >
          <span
            className="text-center px-3 leading-snug"
            style={{ color: "#C48A4A", fontSize: "0.75rem" }}
          >
            {item.name}
          </span>
        </div>
      ) : (
        <img
          src={item.image_url}
          alt={item.name}
          onError={() => setImgError(true)}
          className="w-full object-cover"
          style={{ aspectRatio: "4/3", display: "block" }}
        />
      )}

      <div className="px-3 pt-2 pb-3">
        <p
          className="leading-snug mb-2"
          style={{ color: "#3A2A1A", fontSize: "0.8125rem", fontWeight: 500 }}
        >
          {item.name}
        </p>
        <div className="flex justify-end">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
            className="px-3 py-1 rounded-full text-xs transition-all active:scale-95"
            style={{
              backgroundColor: isInCart ? "#FFF3E0" : "#F59E42",
              color: isInCart ? "#F59E42" : "#ffffff",
              fontWeight: 500,
              fontSize: "0.75rem",
            }}
          >
            {isInCart ? "已加入" : "加入"}
          </button>
        </div>
      </div>
    </div>
  );
}
