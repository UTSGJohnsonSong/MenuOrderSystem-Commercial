"use client";

import { Category } from "@/lib/types";

interface Props {
  categories: Category[];
  activeId: string;
  onChange: (id: string) => void;
}

export default function CategoryTabs({ categories, activeId, onChange }: Props) {
  return (
    <div
      className="flex gap-2 overflow-x-auto px-4 pb-3"
      style={{ scrollbarWidth: "none" }}
    >
      {categories.map((cat) => {
        const active = cat.id === activeId;
        return (
          <button
            key={cat.id}
            onClick={() => onChange(cat.id)}
            className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm transition-all"
            style={{
              backgroundColor: active ? "#F59E42" : "#FFF3E0",
              color: active ? "#ffffff" : "#9A7B5F",
              fontWeight: active ? 600 : 400,
              fontSize: "0.8125rem",
            }}
          >
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}
