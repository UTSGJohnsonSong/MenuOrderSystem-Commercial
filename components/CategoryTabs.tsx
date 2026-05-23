"use client";

import { Category } from "@/lib/types";

interface Props {
  categories: Category[];
  activeId: string;
  onChange: (id: string) => void;
}

export default function CategoryTabs({ categories, activeId, onChange }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-2 no-scrollbar" style={{ scrollbarWidth: "none" }}>
      {categories.map((cat) => {
        const isActive = cat.id === activeId;
        return (
          <button
            key={cat.id}
            onClick={() => onChange(cat.id)}
            className="flex-shrink-0 px-4 py-2 rounded-full text-sm transition-colors"
            style={{
              backgroundColor: isActive ? "#FF9F43" : "#FFE2BD",
              color: isActive ? "#ffffff" : "#8A6F5A",
            }}
          >
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}
