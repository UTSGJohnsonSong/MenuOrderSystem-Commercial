"use client";

import { useState, useEffect, useCallback } from "react";
import { Category, MenuItem, CartItem, MealLog } from "./types";

/* 统一处理登录态失效：401 回落地页，403（没有空间）去 onboarding */
async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (res.status === 401) {
    window.location.href = "/welcome";
    return new Promise<T>(() => {}); // 跳转中，挂起即可
  }
  if (res.status === 403) {
    window.location.href = "/onboarding";
    return new Promise<T>(() => {});
  }
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "请求失败");
  return data as T;
}

/* ─── useStore ─── */
export function useStore() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);

  useEffect(() => {
    const fetchAll = () => {
      apiFetch<Category[]>("/api/categories").then(setCategories).catch(() => {});
      apiFetch<MenuItem[]>("/api/items").then(setItems).catch(() => {});
    };
    fetchAll();

    const onVisible = () => { if (document.visibilityState === "visible") fetchAll(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const addItem = async (item: MenuItem) => {
    const saved = await apiFetch<MenuItem>("/api/items", { method: "POST", body: JSON.stringify(item) });
    setItems(prev => [...prev, saved]);
  };

  const updateItem = async (item: MenuItem) => {
    const saved = await apiFetch<MenuItem>(`/api/items/${item.id}`, { method: "PUT", body: JSON.stringify(item) });
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
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    // 只保留正整数数量。旧版本（私人版）购物车存的是 {item, quantity} 对象，
    // 直接参与 reduce 会拼出 "0[object Object]"，这里一并过滤掉
    const clean: Record<string, number> = {};
    for (const [id, v] of Object.entries(parsed as Record<string, unknown>)) {
      const q = typeof v === "number"
        ? v
        : v && typeof v === "object" && typeof (v as { quantity?: unknown }).quantity === "number"
          ? (v as { quantity: number }).quantity
          : 0;
      if (Number.isFinite(q) && q > 0) clean[id] = Math.floor(q);
    }
    return clean;
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

  const cartItems: CartItem[] = Object.entries(quantities)
    .map(([itemId, quantity]) => {
      const item = items.find(i => i.id === itemId);
      const category = categories.find(c => c.id === item?.category_id);
      if (!item || !category) return null;
      return { item, category, quantity };
    })
    .filter((c): c is CartItem => c !== null);

  // 只统计当前空间真实存在的菜，残留的过期 item id 不计入角标
  const totalItems = cartItems.reduce((s, c) => s + c.quantity, 0);

  return { cartItems, addToCart, decreaseFromCart, removeFromCart, clearCart, getQuantity, isInCart, totalItems };
}

// 单次保存食记，不需要订阅整个列表（点菜页用这个，避免不必要的轮询重渲染）
export async function saveMealLog(log: MealLog): Promise<MealLog> {
  return apiFetch<MealLog>("/api/logs", { method: "POST", body: JSON.stringify(log) });
}

// 图片上传：客户端压缩后的 jpeg dataURL → 服务器文件 → 返回可直接用的 URL
export async function uploadImage(dataUrl: string): Promise<string> {
  const { url } = await apiFetch<{ url: string }>("/api/upload", {
    method: "POST",
    body: JSON.stringify({ dataUrl }),
  });
  return url;
}

/* ─── useMealLog ─── */
export function useMealLog() {
  const [logs, setLogs] = useState<MealLog[]>([]);

  useEffect(() => {
    const fetchLogs = () => {
      apiFetch<MealLog[]>("/api/logs").then(next => {
        // 数据没变化时不更新 state，避免每次轮询都触发重渲染
        setLogs(prev => JSON.stringify(prev) === JSON.stringify(next) ? prev : next);
      }).catch(() => {});
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
      // 覆盖粒度与服务端一致：同一天同一餐
      const exists = prev.some(l => l.date === saved.date && l.meal === saved.meal);
      return exists
        ? prev.map(l => l.date === saved.date && l.meal === saved.meal ? saved : l)
        : [saved, ...prev];
    });
  };

  const deleteLog = async (id: string) => {
    setLogs(prev => prev.filter(l => l.id !== id));
    await fetch(`/api/logs/${id}`, { method: "DELETE" });
  };

  return { logs, saveLog, deleteLog };
}
