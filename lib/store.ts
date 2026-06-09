"use client";

import { useState, useEffect } from "react";
import { Category, MenuItem, CartItem, MealLog } from "./types";
import { DEFAULT_CATEGORIES, DEFAULT_ITEMS } from "./data";

const ITEMS_KEY     = "fm-items";
const CATS_KEY      = "fm-categories";
const CART_KEY      = "fm-cart";
const MEAL_LOG_KEY  = "fm-meal-logs";

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}

function save<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* noop */ }
}

/* ─── useStore ─── */
export function useStore() {
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [items, setItems] = useState<MenuItem[]>(DEFAULT_ITEMS);

  useEffect(() => {
    setCategories(load(CATS_KEY, DEFAULT_CATEGORIES));
    setItems(load(ITEMS_KEY, DEFAULT_ITEMS));
  }, []);

  const addItem = (item: MenuItem) => {
    const next = [...items, item];
    setItems(next); save(ITEMS_KEY, next);
  };
  const updateItem = (item: MenuItem) => {
    const next = items.map(i => i.id === item.id ? item : i);
    setItems(next); save(ITEMS_KEY, next);
  };
  const deleteItem = (id: string) => {
    const next = items.filter(i => i.id !== id);
    setItems(next); save(ITEMS_KEY, next);
  };

  return { categories, items, addItem, updateItem, deleteItem };
}

/* ─── useCart ─── */
export function useCart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setCartItems(load(CART_KEY, []));
  }, []);

  const update = (next: CartItem[]) => {
    setCartItems(next);
    save(CART_KEY, next);
  };

  const addToCart = (item: MenuItem, category: Category) => {
    setCartItems(prev => {
      const exists = prev.find(c => c.item.id === item.id);
      const next = exists
        ? prev.map(c => c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c)
        : [...prev, { item, category, quantity: 1 }];
      save(CART_KEY, next);
      return next;
    });
  };

  const decreaseFromCart = (itemId: string) => {
    setCartItems(prev => {
      const exists = prev.find(c => c.item.id === itemId);
      if (!exists) return prev;
      const next = exists.quantity <= 1
        ? prev.filter(c => c.item.id !== itemId)
        : prev.map(c => c.item.id === itemId ? { ...c, quantity: c.quantity - 1 } : c);
      save(CART_KEY, next);
      return next;
    });
  };

  const removeFromCart = (itemId: string) => {
    setCartItems(prev => {
      const next = prev.filter(c => c.item.id !== itemId);
      save(CART_KEY, next);
      return next;
    });
  };

  const clearCart = () => { update([]); };

  const getQuantity = (itemId: string) =>
    cartItems.find(c => c.item.id === itemId)?.quantity ?? 0;

  const isInCart = (itemId: string) => cartItems.some(c => c.item.id === itemId);

  const totalItems = cartItems.reduce((s, c) => s + c.quantity, 0);

  return { cartItems, addToCart, decreaseFromCart, removeFromCart, clearCart, getQuantity, isInCart, totalItems };
}

/* ─── useMealLog ─── */
export function useMealLog() {
  const [logs, setLogs] = useState<MealLog[]>([]);

  useEffect(() => {
    setLogs(load(MEAL_LOG_KEY, []));
  }, []);

  const saveLog = (log: MealLog) => {
    setLogs(prev => {
      const next = prev.some(l => l.date === log.date)
        ? prev.map(l => l.date === log.date ? log : l)
        : [log, ...prev];
      save(MEAL_LOG_KEY, next);
      return next;
    });
  };

  const deleteLog = (id: string) => {
    setLogs(prev => {
      const next = prev.filter(l => l.id !== id);
      save(MEAL_LOG_KEY, next);
      return next;
    });
  };

  return { logs, saveLog, deleteLog };
}
