"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Category, MenuItem, CartItem, MealLog } from "./types";

/* ─── useStore ─── */
export function useStore() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);

  useEffect(() => {
    const fetchAll = () => {
      fetch("/api/categories").then(r => r.json()).then(setCategories);
      fetch("/api/items").then(r => r.json()).then(setItems);
    };
    fetchAll();

    const onVisible = () => { if (document.visibilityState === "visible") fetchAll(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const addItem = async (item: MenuItem) => {
    const res = await fetch("/api/items", { method: "POST", body: JSON.stringify(item) });
    const saved = await res.json();
    setItems(prev => [...prev, saved]);
  };

  const updateItem = async (item: MenuItem) => {
    const res = await fetch(`/api/items/${item.id}`, { method: "PUT", body: JSON.stringify(item) });
    const saved = await res.json();
    setItems(prev => prev.map(i => i.id === saved.id ? saved : i));
  };

  const deleteItem = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    await fetch(`/api/items/${id}`, { method: "DELETE" });
  };

  return { categories, items, addItem, updateItem, deleteItem };
}

/* ─── useCart ─── */
export function useCart(items: MenuItem[], categories: Category[]) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const pendingRef = useRef(0);

  const applyRows = (rows: { item_id: string; quantity: number }[]) => {
    const map: Record<string, number> = {};
    rows.forEach(r => { map[r.item_id] = r.quantity; });
    setQuantities(map);
  };

  useEffect(() => {
    const fetchCart = () => {
      if (pendingRef.current > 0) return;
      fetch("/api/cart").then(r => r.json()).then(applyRows);
    };
    fetchCart();

    // 轮询 + 切回页面时刷新，让多人同时点菜的购物车保持同步
    const interval = setInterval(fetchCart, 3000);
    const onVisible = () => { if (document.visibilityState === "visible") fetchCart(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const applyChange = async (body: { item_id: string; delta?: number; quantity?: number }) => {
    pendingRef.current++;
    try {
      const res = await fetch("/api/cart", { method: "POST", body: JSON.stringify(body) });
      const rows: { item_id: string; quantity: number }[] = await res.json();
      applyRows(rows);
    } finally {
      pendingRef.current--;
    }
  };

  const addToCart = (item: MenuItem, _category: Category) => {
    setQuantities(prev => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + 1 }));
    applyChange({ item_id: item.id, delta: 1 });
  };

  const decreaseFromCart = (itemId: string) => {
    setQuantities(prev => {
      const next = { ...prev };
      const q = (next[itemId] ?? 0) - 1;
      if (q <= 0) delete next[itemId]; else next[itemId] = q;
      return next;
    });
    applyChange({ item_id: itemId, delta: -1 });
  };

  const removeFromCart = (itemId: string) => {
    setQuantities(prev => { const next = { ...prev }; delete next[itemId]; return next; });
    applyChange({ item_id: itemId, quantity: 0 });
  };

  const clearCart = async () => {
    setQuantities({});
    await fetch("/api/cart", { method: "DELETE" });
  };

  const getQuantity = useCallback((itemId: string) => quantities[itemId] ?? 0, [quantities]);

  const isInCart = (itemId: string) => (quantities[itemId] ?? 0) > 0;

  const totalItems = Object.values(quantities).reduce((s, q) => s + q, 0);

  const cartItems: CartItem[] = Object.entries(quantities)
    .map(([itemId, quantity]) => {
      const item = items.find(i => i.id === itemId);
      const category = categories.find(c => c.id === item?.category_id);
      if (!item || !category) return null;
      return { item, category, quantity };
    })
    .filter((c): c is CartItem => c !== null);

  return { cartItems, addToCart, decreaseFromCart, removeFromCart, clearCart, getQuantity, isInCart, totalItems };
}

/* ─── useMealLog ─── */
export function useMealLog() {
  const [logs, setLogs] = useState<MealLog[]>([]);

  useEffect(() => {
    const fetchLogs = () => {
      fetch("/api/logs").then(r => r.json()).then(setLogs);
    };
    fetchLogs();

    // 轮询 + 切回页面时刷新，让"今日菜单已确定"的状态同步给所有人
    const interval = setInterval(fetchLogs, 5000);
    const onVisible = () => { if (document.visibilityState === "visible") fetchLogs(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const saveLog = async (log: MealLog) => {
    const res = await fetch("/api/logs", { method: "POST", body: JSON.stringify(log) });
    const saved = await res.json();
    setLogs(prev => {
      const exists = prev.some(l => l.date === saved.date);
      return exists ? prev.map(l => l.date === saved.date ? saved : l) : [saved, ...prev];
    });
  };

  const deleteLog = async (id: string) => {
    setLogs(prev => prev.filter(l => l.id !== id));
    await fetch(`/api/logs/${id}`, { method: "DELETE" });
  };

  return { logs, saveLog, deleteLog };
}
