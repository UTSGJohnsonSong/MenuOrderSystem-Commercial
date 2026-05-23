"use client";

import { MenuItem } from "@/lib/types";

interface Props {
  item: MenuItem;
  isInCart: boolean;
  onAdd: () => void;
  onClick: () => void;
}

export default function ItemCard({ item, isInCart, onAdd, onClick }: Props) {
  return (
    <div
      className="rounded-2xl bg-white shadow-sm overflow-hidden cursor-pointer"
      onClick={onClick}
    >
      {item.image_url ? (
        <img
          src={item.image_url}
          alt={item.name}
          className="w-full aspect-[4/3] object-cover rounded-t-2xl"
        />
      ) : (
        <div
          className="w-full aspect-[4/3] rounded-t-2xl"
          style={{ backgroundColor: "#FFE2BD" }}
        />
      )}
      <div className="px-3 pt-2 pb-1">
        <p className="text-sm font-medium" style={{ color: "#3D2C22" }}>
          {item.name}
        </p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAdd();
        }}
        className="w-full py-2 rounded-b-2xl text-sm transition-colors"
        style={{
          backgroundColor: isInCart ? "#FFE2BD" : "#FF9F43",
          color: isInCart ? "#FF9F43" : "#ffffff",
        }}
      >
        {isInCart ? "已加入" : "加入今日"}
      </button>
    </div>
  );
}
