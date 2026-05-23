"use client";

import { useState } from "react";
import { useStore, useCart } from "@/lib/store";
import { MenuItem } from "@/lib/types";
import CategoryTabs from "@/components/CategoryTabs";
import ItemCard from "@/components/ItemCard";
import ItemDetailModal from "@/components/ItemDetailModal";
import CartBar from "@/components/CartBar";

export default function MenuPage() {
  const { categories, items } = useStore();
  const { cartItems, addToCart, isInCart } = useCart();

  const [activeCategory, setActiveCategory] = useState<string>(
    categories[0]?.id ?? ""
  );
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  const activeCategoryResolved = activeCategory || categories[0]?.id || "";

  const visibleItems = items
    .filter((i) => i.category_id === activeCategoryResolved && i.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  const selectedCategory = categories.find(
    (c) => c.id === selectedItem?.category_id
  );

  const handleAdd = (item: MenuItem) => {
    const cat = categories.find((c) => c.id === item.category_id);
    if (cat) addToCart(item, cat);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFF8EF" }}>
      <div
        className="sticky top-0 z-20"
        style={{ backgroundColor: "#FFF8EF" }}
      >
        <div className="py-4 text-center">
          <h1
            className="text-lg font-semibold"
            style={{ color: "#3D2C22" }}
          >
            家庭菜单
          </h1>
        </div>
        <CategoryTabs
          categories={categories}
          activeId={activeCategoryResolved}
          onChange={setActiveCategory}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 pt-3 pb-24">
        {visibleItems.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            isInCart={isInCart(item.id)}
            onAdd={() => handleAdd(item)}
            onClick={() => setSelectedItem(item)}
          />
        ))}
      </div>

      <ItemDetailModal
        item={selectedItem}
        category={selectedCategory}
        isInCart={selectedItem ? isInCart(selectedItem.id) : false}
        onAdd={() => {
          if (selectedItem) handleAdd(selectedItem);
        }}
        onClose={() => setSelectedItem(null)}
      />

      <CartBar count={cartItems.length} />
    </div>
  );
}
