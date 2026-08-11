"use client";

import { MealLog, MenuItem } from "./types";
import { GUEST_COOKIE, GUEST_COOKIE_VALUE } from "./guest-shared";
import { uid } from "./uid";

/*
 * 参观模式的本地草稿。
 *
 * 参观模式原本只能看不能碰，而群里那 109 个人在短信通道批下来之前**注册不了**——
 * 也就是说这个产品目前唯一能被真实体验的路径，是一间碰不了的样板房。
 * 这里让访客真的能加菜、点菜、存食记，全部写在他自己的浏览器里。
 *
 * ⚠️ 不变量没有变：**访客的任何操作都不会写到数据库**。
 * 服务端那道闸（lib/auth.ts 的 requireCurrentSpace 在拿到 spaceId 之前就拒绝访客）
 * 原样保留，这里做的是**根本不发那个请求**。两道防线是有意重叠的——
 * 万一以后哪个页面漏了判断，服务端仍然会拒绝，只是提示没那么友好。
 *
 * 存储形态是**叠加层**而不是整份拷贝：服务器返回的 177 道示例菜是底稿，
 * localStorage 只存访客自己的增/改/删。这样菜品库更新时参观者能看到新内容，
 * 也不用把 177 道菜塞进 localStorage。
 *
 * ⚠️ 草稿目前**不会随注册迁移到真实账号**。参观者攒的菜在注册后看不到——
 * 这是明知的缺口，见文件末尾的说明。
 */

const KEY = "fm-guest-kitchen";

export interface GuestDraft {
  /** 访客自己加的菜 */
  added: MenuItem[];
  /** 对示例菜的修改，key 是示例菜的 id */
  edited: Record<string, MenuItem>;
  /** 被访客删掉的菜 id（示例菜和自己加的都可能在里面） */
  removed: string[];
  /** 访客自己存的食记 */
  logs: MealLog[];
  /** 被访客删掉的食记 id */
  removedLogs: string[];
}

const EMPTY: GuestDraft = { added: [], edited: {}, removed: [], logs: [], removedLogs: [] };

/** 是否处于参观模式。给 React 之外的地方用（store 里的模块级函数）；
 *  组件里请用 components/GuestBar 的 useGuestTour()。 */
export function isGuestNow(): boolean {
  if (typeof document === "undefined") return false;
  try {
    return document.cookie.split("; ").includes(`${GUEST_COOKIE}=${GUEST_COOKIE_VALUE}`);
  } catch {
    // 完全禁用 cookie 时 document.cookie 会抛，不能让它把页面带崩
    return false;
  }
}

/* 和 lib/store.ts 的 loadCart 一样按「宁可当空的也不要崩」处理：
 * 这份数据是用户手写的草稿，但它进不了数据库，损坏的唯一代价是草稿丢失，
 * 而抛异常的代价是整页白屏。 */
function readDraft(): GuestDraft {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY, added: [], removed: [], logs: [], removedLogs: [], edited: {} };
    const p = JSON.parse(raw) as Partial<GuestDraft>;
    return {
      added: Array.isArray(p.added) ? p.added : [],
      edited: p.edited && typeof p.edited === "object" && !Array.isArray(p.edited) ? p.edited : {},
      removed: Array.isArray(p.removed) ? p.removed : [],
      logs: Array.isArray(p.logs) ? p.logs : [],
      removedLogs: Array.isArray(p.removedLogs) ? p.removedLogs : [],
    };
  } catch {
    return { ...EMPTY, added: [], removed: [], logs: [], removedLogs: [], edited: {} };
  }
}

/** localStorage 满了 / 隐私模式下不可用时抛，调用方要把话说清楚。
 *  照片是唯一可能撑爆配额的东西（≈5MB 上限），所以这句提示指向照片。 */
export class GuestStorageFull extends Error {
  constructor() {
    super("这台设备的本地空间满了，先删掉几张自己加的照片再试试～");
    this.name = "GuestStorageFull";
  }
}

function writeDraft(d: GuestDraft): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch (e) {
    // QuotaExceededError 的 name 在各家浏览器里不一致（Safari 曾用
    // QUOTA_EXCEEDED_ERR），所以不按 name 判断，一律当写不进去处理
    console.error("[guest] draft write failed", e);
    throw new GuestStorageFull();
  }
}

/* ── 菜品 ── */

/** 把访客的增/改/删叠到服务器返回的示例菜上 */
export function applyItems(base: readonly MenuItem[]): MenuItem[] {
  const d = readDraft();
  const removed = new Set(d.removed);
  const out = base
    .filter(i => !removed.has(i.id))
    .map(i => d.edited[i.id] ?? i);
  for (const a of d.added) {
    if (!removed.has(a.id)) out.push(a);
  }
  return out;
}

export function guestAddItem(item: MenuItem): MenuItem {
  const d = readDraft();
  // 前缀是刻意的：示例菜的 id 是图片 slug（lib-001），真实空间的是 uuid，
  // 三者都不会撞。撞了的后果是访客改一道菜结果动了另一道
  const saved: MenuItem = {
    ...item,
    id: `guest-mine-${uid()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  d.added.push(saved);
  writeDraft(d);
  return saved;
}

export function guestUpdateItem(item: MenuItem): MenuItem {
  const d = readDraft();
  const saved = { ...item, updated_at: new Date().toISOString() };
  const at = d.added.findIndex(a => a.id === item.id);
  if (at >= 0) d.added[at] = saved;   // 自己加的直接改
  else d.edited[item.id] = saved;      // 示例菜记一条覆盖
  writeDraft(d);
  return saved;
}

export function guestDeleteItem(id: string): void {
  const d = readDraft();
  d.added = d.added.filter(a => a.id !== id);
  delete d.edited[id];
  if (!d.removed.includes(id)) d.removed.push(id);
  writeDraft(d);
}

/* ── 食记 ── */

/** 同一天同一餐，访客自己存的覆盖示例食记——和服务端的
 *  ON CONFLICT (space_id, date, meal) DO UPDATE 保持同一套语义 */
export function applyLogs(base: readonly MealLog[]): MealLog[] {
  const d = readDraft();
  const removed = new Set(d.removedLogs);
  const mineKeys = new Set(d.logs.map(l => `${l.date}|${l.meal}`));
  return [
    ...base.filter(l => !removed.has(l.id) && !mineKeys.has(`${l.date}|${l.meal}`)),
    ...d.logs.filter(l => !removed.has(l.id)),
  ];
}

export function guestSaveLog(log: MealLog): MealLog {
  const d = readDraft();
  const key = `${log.date}|${log.meal}`;
  const at = d.logs.findIndex(l => `${l.date}|${l.meal}` === key);
  const saved: MealLog = {
    ...log,
    id: at >= 0 ? d.logs[at].id : `guest-mine-log-${uid()}`,
    created_at: new Date().toISOString(),
  };
  if (at >= 0) d.logs[at] = saved; else d.logs.push(saved);
  writeDraft(d);
  return saved;
}

export function guestDeleteLog(id: string): void {
  const d = readDraft();
  d.logs = d.logs.filter(l => l.id !== id);
  if (!d.removedLogs.includes(id)) d.removedLogs.push(id);
  writeDraft(d);
}

/* ── 统计 ── */

/** 访客到底动手做了多少事。用来判断这份草稿值不值得提示他保留。 */
export function guestDraftSize(): { items: number; logs: number; touched: boolean } {
  const d = readDraft();
  const items = d.added.length;
  const logs = d.logs.length;
  const touched = items > 0 || logs > 0
    || d.removed.length > 0 || d.removedLogs.length > 0
    || Object.keys(d.edited).length > 0;
  return { items, logs, touched };
}

/*
 * ⚠️ 已知缺口：注册后草稿不会迁移到真实账号。
 *
 * 一个参观者加了 10 道菜再注册，那 10 道菜不会出现在他的新厨房里——
 * 而「自己攒出来的东西」正是这个产品最强的情绪资产
 * （见 Obsidian 22 购买场景与情绪设计）。迁移要在登录成功后把 added / logs
 * 逐条 POST 上去，是独立的一步，刻意没有和本次改动混在一起。
 *
 * 现在不做也不至于伤到人：短信通道还没通，除白名单外没有人能注册，
 * 所以还没有任何人会踩到这个缺口。通道接通前必须补上。
 *
 * 草稿因此**故意不清除**——留着，等迁移那一步来取。
 */
