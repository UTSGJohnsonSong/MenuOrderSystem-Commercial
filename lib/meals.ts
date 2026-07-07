/*
 * 餐次：食记/备餐按「日期 + 餐次」记录。
 * 老数据没有餐次的统一为 'all'（全天），只读展示，新记录必须是三餐之一。
 */

export const MEALS = [
  { id: "breakfast", label: "早餐", emoji: "🌅" },
  { id: "lunch",     label: "午餐", emoji: "☀️" },
  { id: "dinner",    label: "晚餐", emoji: "🌙" },
] as const;

export type MealId = typeof MEALS[number]["id"] | "all";

export const MEAL_IDS = new Set<string>(MEALS.map(m => m.id));

const LEGACY_ALL = { id: "all", label: "全天", emoji: "🍱" } as const;

export function mealInfo(id: string | undefined) {
  return MEALS.find(m => m.id === id) ?? LEGACY_ALL;
}

/** 展示排序：全天(老数据)在最前，然后早→午→晚 */
export function mealOrder(id: string | undefined): number {
  const i = MEALS.findIndex(m => m.id === id);
  return i === -1 ? -1 : i;
}

/** 按当前时间猜默认餐次：10 点前早餐，15 点前午餐，其余晚餐 */
export function guessMeal(): string {
  const h = new Date().getHours();
  if (h < 10) return "breakfast";
  if (h < 15) return "lunch";
  return "dinner";
}
