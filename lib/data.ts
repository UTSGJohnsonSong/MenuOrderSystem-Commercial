import { Category, MenuItem } from "./types";
import { LIBRARY_DISHES, libraryImageUrl } from "./library";

// 新空间默认开启的 8 个分类；完整预置库见 lib/categories.ts（用户可在设置里增减）
// sort_order 与预置库一致（×10 间隔），后开启的类目能插进合理位置
export const DEFAULT_CATEGORIES: Category[] = [
  { id: "zaochan", name: "早餐", sort_order: 10 },
  { id: "zhushi", name: "米饭", sort_order: 20 },
  { id: "mianshi", name: "面食", sort_order: 30 },
  { id: "rourou", name: "肉类", sort_order: 40 },
  { id: "caicai", name: "菜类", sort_order: 50 },
  { id: "shuiguo", name: "水果", sort_order: 90 },
  { id: "tianpin", name: "甜点", sort_order: 100 },
  { id: "yao", name: "药品", sort_order: 130 },
];

/*
 * 开局菜单。这一份同时是两处的门面：
 *   ① lib/space.ts 用它给每个新注册的空间填模板菜
 *   ② lib/guest.ts 用它当参观模式的「示例小厨房」
 *
 * 这里只写「菜名 → 放进哪个分类」，食材、做法、配图全部从 lib/library.ts 取。
 * 一道菜的正文只有一个来源，库里改了这里自动跟着改，不会像以前那样两边各存一份
 * 然后慢慢对不上。
 *
 * 有两道菜的分类和库里的建议不同——煎三文鱼在库里归「海鲜」、凉拌黄瓜归「凉菜」，
 * 而新空间默认只开 8 个分类。这里按「用户会去哪个 tab 找它」来放，不是按菜系。
 */
const STARTER: [name: string, categoryId: string][] = [
  ["煎蛋", "zaochan"],
  ["牛油果吐司", "zaochan"],
  ["希腊酸奶碗", "zaochan"],
  ["小笼包", "zaochan"],
  ["皮蛋瘦肉粥", "zaochan"],

  ["白米饭", "zhushi"],
  ["鸡蛋火腿炒饭", "zhushi"],
  ["咖喱盖饭", "zhushi"],
  ["红烧肉盖饭", "zhushi"],

  ["番茄鸡蛋面", "mianshi"],
  ["牛肉面", "mianshi"],
  ["番茄肉酱意面", "mianshi"],
  ["蒜香虾仁意面", "mianshi"],

  ["红烧肉", "rourou"],
  ["可乐鸡翅", "rourou"],
  ["糖醋排骨", "rourou"],
  ["香煎鸡胸肉", "rourou"],
  ["煎三文鱼", "rourou"],

  ["番茄炒蛋", "caicai"],
  ["蒜蓉西兰花", "caicai"],
  ["麻婆豆腐", "caicai"],
  ["凉拌黄瓜", "caicai"],

  ["草莓", "shuiguo"],
  ["蓝莓", "shuiguo"],
  ["香蕉", "shuiguo"],
  ["芒果", "shuiguo"],

  ["提拉米苏杯", "tianpin"],
  ["双皮奶", "tianpin"],
  ["芒果西米露", "tianpin"],
];

const SEED_TS = "2024-01-01T00:00:00Z";

const LIBRARY_BY_NAME = new Map(LIBRARY_DISHES.map(d => [d.name, d]));

/* 改错菜名的话，模板菜单会静默少一道，而 tsc 和 build 都是绿的。
 * 模块加载时喊一次，比让人对着少一道菜的厨房排查强。 */
const MISSING = STARTER.map(([n]) => n).filter(n => !LIBRARY_BY_NAME.has(n));
if (MISSING.length > 0) {
  console.error("[data] starter dishes not found in lib/library.ts:", MISSING);
}

const perCategory = new Map<string, number>();

const STARTER_ITEMS: MenuItem[] = STARTER.flatMap(([name, categoryId], i) => {
  const dish = LIBRARY_BY_NAME.get(name);
  if (!dish) return [];
  const n = (perCategory.get(categoryId) ?? 0) + 1;
  perCategory.set(categoryId, n);
  return [{
    id: `item-${String(i + 1).padStart(3, "0")}`,
    category_id: categoryId,
    name: dish.name,
    image_url: libraryImageUrl(dish) ?? "",
    ingredients: dish.ingredients,
    instructions: dish.instructions,
    notes: "",
    is_active: true,
    sort_order: n,
    created_at: SEED_TS,
    updated_at: SEED_TS,
  }];
});

/*
 * 「药品」不是菜，菜品库里没有对应条目，所以这三条仍然写死在这里。
 *
 * image_url 是空的：老版本给它们配的是 /dishes/item-020~022.jpg，
 * 而那三张图是错的——鱼油配的是咖啡袋、益生菌配的是一盒布洛芬。
 * 与其挂错图，不如走列表和详情页都有的渐变占位。
 * public/dishes/ 下的老图不能删：已有用户的菜品行还在引用那些路径。
 */
const SUPPLEMENTS: MenuItem[] = [
  {
    id: "item-101",
    category_id: "yao",
    name: "维生素D",
    image_url: "",
    ingredients: "维生素D3 补剂",
    instructions: "随餐服用，每日1粒。",
    notes: "室内工作者尤其需要补充，有助于钙吸收和免疫力。",
    is_active: true,
    sort_order: 1,
    created_at: SEED_TS,
    updated_at: SEED_TS,
  },
  {
    id: "item-102",
    category_id: "yao",
    name: "鱼油",
    image_url: "",
    ingredients: "深海鱼油 补剂（含EPA和DHA）",
    instructions: "随餐服用，每日1-2粒。",
    notes: "有助于心血管健康和减少炎症，冷藏保存避免氧化。",
    is_active: true,
    sort_order: 2,
    created_at: SEED_TS,
    updated_at: SEED_TS,
  },
  {
    id: "item-103",
    category_id: "yao",
    name: "益生菌",
    image_url: "",
    ingredients: "益生菌胶囊或粉末",
    instructions: "空腹或饭前30分钟服用，温水送服（水温不超过40°C）。",
    notes: "有助于肠道健康，需冷藏保存以维持活菌数量。",
    is_active: true,
    sort_order: 3,
    created_at: SEED_TS,
    updated_at: SEED_TS,
  },
];

export const DEFAULT_ITEMS: MenuItem[] = [...STARTER_ITEMS, ...SUPPLEMENTS];
