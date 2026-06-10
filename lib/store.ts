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

function shallowEqualMap(a: Record<string, number>, b: Record<string, number>) {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every(k => a[k] === b[k]);
}

/* ─── useCart ─── */
export function useCart(items: MenuItem[], categories: Category[]) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  // 记录"本地最近一次改动"的时间。任何在这之前发出的 GET 请求，
  // 哪怕现在才返回，也是过时数据，必须丢弃——否则会把刚刚的乐观更新
  // 瞬间覆盖回旧值，造成"加一→跳回0→再变回1"的闪烁。
  const lastChangeRef = useRef(0);

  const applyRows = (rows: { item_id: string; quantity: number }[], requestTime: number) => {
    if (requestTime < lastChangeRef.current) return;
    const map: Record<string, number> = {};
    rows.forEach(r => { map[r.item_id] = r.quantity; });
    // 数据没变化时不更新 state，避免每次轮询都触发整页重渲染导致卡顿
    setQuantities(prev => shallowEqualMap(prev, map) ? prev : map);
  };

  useEffect(() => {
    const fetchCart = () => {
      const requestTime = Date.now();
      fetch("/api/cart").then(r => r.json()).then(rows => applyRows(rows, requestTime));
    };
    fetchCart();

    // 轮询 + 切回页面时刷新，让多人同时点菜的购物车保持同步
    const interval = setInterval(fetchCart, 2000);
    const onVisible = () => { if (document.visibilityState === "visible") fetchCart(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // 写请求只发出去，不用它的返回值覆盖本地状态——本地的乐观更新已经是最新状态，
  // 其他设备的改动交给上面的轮询同步即可。
  const applyChange = (body: { item_id: string; delta?: number; quantity?: number }) => {
    lastChangeRef.current = Date.now();
    fetch("/api/cart", { method: "POST", body: JSON.stringify(body) }).catch(() => {});
  };

  const addToCart = (item: MenuItem, _category: Category) => {
    lastChangeRef.current = Date.now();
    setQuantities(prev => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + 1 }));
    applyChange({ item_id: item.id, delta: 1 });
  };

  const decreaseFromCart = (itemId: string) => {
    lastChangeRef.current = Date.now();
    setQuantities(prev => {
      const next = { ...prev };
      const q = (next[itemId] ?? 0) - 1;
      if (q <= 0) delete next[itemId]; else next[itemId] = q;
      return next;
    });
    applyChange({ item_id: itemId, delta: -1 });
  };

  const removeFromCart = (itemId: string) => {
    lastChangeRef.current = Date.now();
    setQuantities(prev => { const next = { ...prev }; delete next[itemId]; return next; });
    applyChange({ item_id: itemId, quantity: 0 });
  };

  const clearCart = async () => {
    lastChangeRef.current = Date.now();
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
