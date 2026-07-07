/*
 * 预置类目库：用户从库里勾选开/关自己小厨房的分类，不开放自由新建
 * （每个预置类目都有精修水彩图标 public/cat-icons/{id}.png；
 *   自建类目留作以后的付费点，见 COMMERCIALIZATION_PLAN.md）。
 * sort_order 用 ×10 间隔，方便新启用的类目插进合理位置。
 */

export interface PresetCategory {
  id: string;
  name: string;
  sort_order: number;
}

export const PRESET_CATEGORIES: PresetCategory[] = [
  { id: "zaochan",  name: "早餐", sort_order: 10 },
  { id: "zhushi",   name: "米饭", sort_order: 20 },
  { id: "mianshi",  name: "面面", sort_order: 30 },
  { id: "rourou",   name: "肉肉", sort_order: 40 },
  { id: "caicai",   name: "菜菜", sort_order: 50 },
  { id: "tangtang", name: "汤汤", sort_order: 60 },
  { id: "haixian",  name: "海鲜", sort_order: 70 },
  { id: "liangcai", name: "凉菜", sort_order: 80 },
  { id: "shuiguo",  name: "果果", sort_order: 90 },
  { id: "tianpin",  name: "甜甜", sort_order: 100 },
  { id: "yinpin",   name: "喝的", sort_order: 110 },
  { id: "yexiao",   name: "夜宵", sort_order: 120 },
  { id: "yao",      name: "小药", sort_order: 130 },
];

export const PRESET_MAP = new Map(PRESET_CATEGORIES.map(c => [c.id, c]));
