"use client";

import { useState, useEffect } from "react";
import { Category, MenuItem, CartItem } from "./types";
import { DEFAULT_CATEGORIES, DEFAULT_ITEMS } from "./data";

const ITEMS_KEY = "family-menu-items";
const CATEGORIES_KEY = "family-menu-categories";
const CART_KEY = "family-menu-cart";

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function useStore() {
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [items, setItems] = useState<MenuItem[]>(DEFAULT_ITEMS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCategories(loadFromStorage<Category[]>(CATEGORIES_KEY, DEFAULT_CATEGORIES));
    setItems(loadFromStorage<MenuItem[]>(ITEMS_KEY, DEFAULT_ITEMS));
    setHydrated(true);
  }, []);

  const addItem = (item: MenuItem) => {
    const next = [...items, item];
    setItems(next);
    saveToStorage(ITEMS_KEY, next);
  };

  const updateItem = (item: MenuItem) => {
    const next = items.map((i) => (i.id === item.id ? item : i));
    setItems(next);
    saveToStorage(ITEMS_KEY, next);
  };

  const deleteItem = (id: string) => {
    const next = items.filter((i) => i.id !== id);
    setItems(next);
    saveToStorage(ITEMS_KEY, next);
  };

  return { categories, items, addItem, updateItem, deleteItem, hydrated };
}

export function useCart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setCartItems(loadFromStorage<CartItem[]>(CART_KEY, []));
  }, []);

  const addToCart = (item: MenuItem, category: Category) => {
    setCartItems((prev) => {
      if (prev.some((c) => c.item.id === item.id)) return prev;
      const next = [...prev, { item, category }];
      saveToStorage(CART_KEY, next);
      return next;
    });
  };

  const removeFromCart = (itemId: string) => {
    setCartItems((prev) => {
      const next = prev.filter((c) => c.item.id !== itemId);
      saveToStorage(CART_KEY, next);
      return next;
    });
  };

  const clearCart = () => {
    setCartItems([]);
    saveToStorage(CART_KEY, []);
  };

  const isInCart = (itemId: string) => cartItems.some((c) => c.item.id === itemId);

  return { cartItems, addToCart, removeFromCart, clearCart, isInCart };
}
