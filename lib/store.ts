"use client";

import { useState, useEffect, useCallback } from "react";
import { Category, MenuItem, CartItem, MealLog } from "./types";
import { GUEST_WRITE_MESSAGE, GUEST_WRITE_STATUS } from "./guest-shared";
import {
  isGuestNow, applyItems, applyLogs,
  guestAddItem, guestUpdateItem, guestDeleteItem,
  guestSaveLog, guestDeleteLog,
} from "./guest-local";

/* A refused delete has to say WHY. These paths use raw fetch rather than
 * apiFetch (no redirect on 401/403), so without this the row silently bounces
 * back and the tour's "只能看看" copy never reaches the screen. */
function deleteFailureMessage(res: Response | null, fallback: string): string {
  if (res?.status === GUEST_WRITE_STATUS) return GUEST_WRITE_MESSAGE;
  if (res?.status === 401) return "登录已经过期了，重新登录一下？";
  return fallback;
}

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

/* ─── useStore ───
 *
 * 参观模式下所有写操作都不发请求，直接落在 localStorage（lib/guest-local.ts）。
 * 读的时候把访客自己的增改删叠在服务器返回的示例菜上。
 *
 * ⚠️ 服务端那道闸没有撤：requireCurrentSpace() 仍然会拒绝访客的写请求。
 * 这里做的是根本不发那个请求，两道防线有意重叠——将来哪个页面漏了判断，
 * 服务端仍然拦得住，只是提示没这么友好。
 *
 * 用 isGuestNow() 而不是 useGuestTour()：一来 lib/ 不该反向依赖 components/，
 * 二来这个 cookie 在同一个文档里不会变（进出参观模式都是整页加载，
 * 见 components/GuestBar 的说明），所以按调用时刻读就够了。 */
export function useStore() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);

  useEffect(() => {
    const fetchAll = () => {
      // Logged, not swallowed: a failed read renders as an empty kitchen, which
      // is indistinguishable from a genuinely empty one without this line.
      apiFetch<Category[]>("/api/categories").then(setCategories)
        .catch(e => console.error("[store] categories unavailable", e));
      apiFetch<MenuItem[]>("/api/items")
        .then(base => setItems(isGuestNow() ? applyItems(base) : base))
        .catch(e => console.error("[store] items unavailable", e));
    };
    fetchAll();

    const onVisible = () => { if (document.visibilityState === "visible") fetchAll(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const addItem = async (item: MenuItem) => {
    // 抛出的 GuestStorageFull 由调用方（ItemForm 的 handleSave）显示出来
    const saved = isGuestNow()
      ? guestAddItem(item)
      : await apiFetch<MenuItem>("/api/items", { method: "POST", body: JSON.stringify(item) });
    setItems(prev => [...prev, saved]);
  };

  const updateItem = async (item: MenuItem) => {
    const saved = isGuestNow()
      ? guestUpdateItem(item)
      : await apiFetch<MenuItem>(`/api/items/${item.id}`, { method: "PUT", body: JSON.stringify(item) });
    setItems(prev => prev.map(i => i.id === saved.id ? saved : i));
  };

  /* Optimistic removal is undone when the server refuses (tour mode, banned
   * space, expired session, offline). Without the rollback a rejected delete
   * looks like it worked until the next refresh — and this list only refetches
   * on refocus. Rejects on failure so the caller can explain itself; every call
   * site must catch.
   *
   * .catch(() => null) is load-bearing: fetch REJECTS when the network drops, it
   * does not resolve with !res.ok, so the offline case — the likeliest one on a
   * phone — would otherwise skip the rollback entirely. */
  const deleteItem = async (id: string) => {
    // 参观模式没有网络这一步，也就没有回滚可言：写进 localStorage 就是成功，
    // 写不进去（配额满）会抛，由调用方显示
    if (isGuestNow()) {
      guestDeleteItem(id);
      setItems(prev => prev.filter(i => i.id !== id));
      return;
    }

    const at = items.findIndex(i => i.id === id);
    const removed = at === -1 ? undefined : items[at];
    setItems(prev => prev.filter(i => i.id !== id));

    const res = await fetch(`/api/items/${id}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) return;

    if (removed) {
      // Back where it was, not appended: sort_order is heavily duplicated
      // (lib/data.ts has eight items at 1), so re-sorting would drop the dish
      // to the bottom of its category and read as "a different row moved".
      setItems(prev => {
        if (prev.some(i => i.id === id)) return prev;
        const next = [...prev];
        next.splice(Math.min(at, next.length), 0, removed);
        return next;
      });
    }
    throw new Error(deleteFailureMessage(res, "没删掉，再试一次？"));
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
  if (isGuestNow()) return guestSaveLog(log);
  return apiFetch<MealLog>("/api/logs", { method: "POST", body: JSON.stringify(log) });
}

/* 图片上传：客户端压缩后的 jpeg dataURL → 服务器文件 → 返回可直接用的 URL。
 *
 * 参观模式直接把 dataURL 原样返回——访客没有账号，服务器上没有他的目录可以放，
 * 图就跟着菜一起存在 localStorage 里。代价是占配额（800px q0.75 的图约 100~200KB，
 * 而 localStorage 大约 5MB），写不下时 guest-local 会抛 GuestStorageFull，
 * 提示直接指向「删掉几张自己加的照片」。
 *
 * ⚠️ 封面照片走的不是这条路（它 PATCH /api/space，参观模式会拿到 422 和友好提示）。
 * 那是有意的：裁剪器输出 1200 宽，一张就可能吃掉配额的一大块。 */
export async function uploadImage(dataUrl: string): Promise<string> {
  if (isGuestNow()) return dataUrl;
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
      apiFetch<MealLog[]>("/api/logs").then(base => {
        const next = isGuestNow() ? applyLogs(base) : base;
        // 数据没变化时不更新 state，避免每次轮询都触发重渲染
        setLogs(prev => JSON.stringify(prev) === JSON.stringify(next) ? prev : next);
      }).catch(e => console.error("[store] logs unavailable", e));
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

  // Same rollback and the same offline caveat as deleteItem; the 5s poll would
  // eventually undo it, but a row that reappears seconds later with no
  // explanation reads as a glitch rather than a refusal. Rejects on failure —
  // callers must catch. Re-inserted at its old index; /shiji re-sorts by date
  // anyway, but the guard against the concurrent poll needs the index case too.
  const deleteLog = async (id: string) => {
    // 同 deleteItem：参观模式不发请求，也就没有回滚
    if (isGuestNow()) {
      guestDeleteLog(id);
      setLogs(prev => prev.filter(l => l.id !== id));
      return;
    }

    const at = logs.findIndex(l => l.id === id);
    const removed = at === -1 ? undefined : logs[at];
    setLogs(prev => prev.filter(l => l.id !== id));

    const res = await fetch(`/api/logs/${id}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) return;

    if (removed) {
      setLogs(prev => {
        if (prev.some(l => l.id === id)) return prev;
        const next = [...prev];
        next.splice(Math.min(at, next.length), 0, removed);
        return next;
      });
    }
    throw new Error(deleteFailureMessage(res, "没删掉，再试一次？"));
  };

  return { logs, saveLog, deleteLog };
}
