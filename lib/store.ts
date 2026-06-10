"use client";

import { useState, useEffect, useCallback } from "react";
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

const CART_KEY = "fm-cart";

function loadCart(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCart(quantities: Record<string, number>) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(quantities));
  } catch {
    // ignore (e.g. 隐私模式下 localStorage 不可用)
  }
}

/* ─── useCart ───
 * 购物车只保存在本地（localStorage），不跨设备同步——
 * 点菜到保存食记之间这段"草稿"状态延迟太敏感，不值得为此引入网络同步。
 * 真正需要同步给所有人看的是菜品库（useStore）和食记（useMealLog）。
 */
export function useCart(items: MenuItem[], categories: Category[]) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    setQuantities(loadCart());
  }, []);

  const update = (updater: (prev: Record<string, number>) => Record<string, number>) => {
    setQuantities(prev => {
      const next = updater(prev);
      saveCart(next);
      return next;
    });
  };

  const addToCart = (item: MenuItem, _category: Category) => {
    update(prev => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + 1 }));
  };

  const decreaseFromCart = (itemId: string) => {
    update(prev => {
      const next = { ...prev };
      const q = (next[itemId] ?? 0) - 1;
      if (q <= 0) delete next[itemId]; else next[itemId] = q;
      return next;
    });
  };

  const removeFromCart = (itemId: string) => {
    update(prev => { const next = { ...prev }; delete next[itemId]; return next; });
  };

  const clearCart = () => {
    update(() => ({}));
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

// 单次保存食记，不需要订阅整个列表（点菜页用这个，避免不必要的轮询重渲染）
export async function saveMealLog(log: MealLog): Promise<MealLog> {
  const res = await fetch("/api/logs", { method: "POST", body: JSON.stringify(log) });
  return res.json();
}

/* ─── useMealLog ─── */
export function useMealLog() {
  const [logs, setLogs] = useState<MealLog[]>([]);

  useEffect(() => {
    const fetchLogs = () => {
      fetch("/api/logs").then(r => r.json()).then((next: MealLog[]) => {
        // 数据没变化时不更新 state，避免每次轮询都触发重渲染
        setLogs(prev => JSON.stringify(prev) === JSON.stringify(next) ? prev : next);
      });
    };
    fetchLogs();

    // 轮询 + 切回页面时刷新，让食记列表保持最新
    const interval = setInterval(fetchLogs, 5000);
    const onVisible = () => { if (document.visibilityState === "visible") fetchLogs(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const saveLog = async (log: MealLog) => {
    const saved = await saveMealLog(log);
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
