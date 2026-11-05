import { NextResponse } from "next/server";
import { PRESET_CATEGORIES } from "./categories";
import { DEFAULT_COVER } from "./covers";
import { LIBRARY_DISHES, libraryImageUrl, libraryDishNotes } from "./library";
import { Category, MealLog, MealLogEntry, MenuItem } from "./types";

export { GUEST_COOKIE, GUEST_COOKIE_VALUE, GUEST_MAX_AGE, GUEST_WRITE_MESSAGE, GUEST_WRITE_STATUS } from "./guest-shared";

/*
 * Guest tour mode: a read-only sample kitchen for visitors who have not signed
 * up yet. Registration needs an SMS code, and the SMS channel is still being
 * filed — so without this, a visitor can only ever see the landing page.
 *
 * Everything here is a static fixture. The precise invariant — narrower than
 * "guests never touch the database", which is false: entering the tour writes
 * one funnel row in app/api/guest/route.ts — is that no guest request ever
 * reads or writes SPACE-SCOPED rows, because requireCurrentSpace() (lib/auth.ts)
 * rejects guests before a spaceId exists.
 *
 * The cookie and status-code contract lives in lib/guest-shared.ts.
 */
export const GUEST_SPACE_NAME = "示例小厨房";

/* Nginx sits in front of this app and does NOT cache today — there is no
 * proxy_cache anywhere in deploy/. This header is a sentinel for the day someone
 * enables one: a cached /api/items would serve the sample kitchen to a signed-in
 * couple. Note the reverse direction is still undefended — the authenticated
 * branches return a bare NextResponse.json — so turning on proxy_cache needs
 * more than this line. */
export function guestJson<T>(data: T): NextResponse<T> {
  return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
}

/*
 * 示例小厨房 = 菜品库里所有配了图的菜。
 *
 * 刻意和 lib/data.ts 的开局菜单分开：那份是给每个新注册用户填的模板，要克制
 * （而且 C7 免费限额定的是 30 道菜，塞 177 道进去等于开局就爆额度）；
 * 这份是给还没注册的人看的展示柜，越丰富越好——参观者翻到的每一道都有图。
 *
 * 顺序沿用 lib/library.ts 里的排列（同一分类内按素材原始编号），
 * 所以早餐是煎蛋→鸡蛋羹→溏心蛋吐司这样的自然顺序，不是随机的。
 */
const GUEST_ITEMS: MenuItem[] = (() => {
  const seq = new Map<string, number>();
  return LIBRARY_DISHES.filter(d => d.img).map(d => {
    const n = (seq.get(d.cat) ?? 0) + 1;
    seq.set(d.cat, n);
    return {
      // 用图片 slug 当 id：稳定、可追溯，且不会和真实空间的 uuid 撞
      id: d.img!,
      category_id: d.cat,
      name: d.name,
      image_url: libraryImageUrl(d) ?? "",
      ingredients: d.ingredients,
      instructions: d.instructions,
      notes: libraryDishNotes(d),
      is_active: true,
      sort_order: n,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };
  });
})();

/* 只显示真的有菜的分类，顺序和 PRESET_CATEGORIES 一致。
 * 空分类在侧栏里点进去是一片空白，看起来像坏了。 */
const GUEST_CATEGORIES: Category[] = PRESET_CATEGORIES
  .filter(c => GUEST_ITEMS.some(i => i.category_id === c.id))
  .map(c => ({ id: c.id, name: c.name, sort_order: c.sort_order }));

export function guestCategories(): readonly Category[] {
  return GUEST_CATEGORIES;
}

export function guestItems(): readonly MenuItem[] {
  return GUEST_ITEMS;
}

export function guestSpace() {
  return {
    id: "guest",
    name: GUEST_SPACE_NAME,
    invite_code: "",
    member_limit: 2,
    cover_preset: DEFAULT_COVER,
    cover_image_url: null,
    is_owner: false,
    members: [],
    guest: true,
  };
}

/* Sample meal history. Dates are computed per request so the tour always shows
 * "today" plus a plausible week behind it — a fixture with hard-coded dates
 * reads as abandoned within a week of shipping.
 *
 * UTC, deliberately: /shiji decides what counts as today with
 * new Date().toISOString(), i.e. also UTC, and sorts anything later than that
 * into the 备餐计划 (upcoming) bucket. Dating this fixture in Beijing time
 * instead would file the newest sample meal under "meals you have not eaten
 * yet" for every viewer west of UTC. Whether /shiji itself should switch to
 * Beijing time is a separate question — real logs have the same skew. */
function utcDate(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 24 * 3600 * 1000).toISOString().slice(0, 10);
}

const CATEGORY_NAMES = new Map(GUEST_CATEGORIES.map(c => [c.id, c.name]));
const ITEMS_BY_NAME = new Map(GUEST_ITEMS.map(i => [i.name, i]));

/* Sample meals reference dishes BY NAME. Ids are derived from the image slug and
 * would silently repoint at a different dish if the library were ever renumbered. */
function entry(dishName: string, quantity: number): MealLogEntry | null {
  const item = ITEMS_BY_NAME.get(dishName);
  if (!item) return null;
  return {
    item_id: item.id,
    name: item.name,
    category_name: CATEGORY_NAMES.get(item.category_id) ?? "",
    image_url: item.image_url,
    quantity,
  };
}

const SAMPLE_MEALS: { daysAgo: number; meal: string; items: [string, number][] }[] = [
  { daysAgo: 0, meal: "breakfast", items: [["牛油果吐司", 2], ["希腊酸奶碗", 1]] },
  { daysAgo: 0, meal: "dinner", items: [["番茄肉酱意面", 1], ["蒜蓉西兰花", 1]] },
  { daysAgo: 1, meal: "dinner", items: [["可乐鸡翅", 1], ["白米饭", 2], ["番茄炒蛋", 1]] },
  { daysAgo: 2, meal: "lunch", items: [["牛肉面", 2]] },
  { daysAgo: 3, meal: "dinner", items: [["煎三文鱼", 2], ["凉拌黄瓜", 1]] },
  { daysAgo: 4, meal: "breakfast", items: [["小笼包", 1], ["香蕉", 1]] },
  { daysAgo: 5, meal: "dinner", items: [["红烧肉", 1], ["蒜蓉西兰花", 1], ["白米饭", 2]] },
  { daysAgo: 6, meal: "lunch", items: [["蒜香虾仁意面", 2], ["提拉米苏杯", 1]] },
];

/* Loud once at module load rather than silently per request: dropping a dish
 * from the starter menu would otherwise ship dated but EMPTY meal cards to every
 * prospect, with tsc, eslint and build all green. */
const UNKNOWN_SAMPLE_DISHES = SAMPLE_MEALS
  .flatMap(m => m.items.map(([name]) => name))
  .filter(name => !ITEMS_BY_NAME.has(name));
if (UNKNOWN_SAMPLE_DISHES.length > 0) {
  console.error("[guest] sample meals reference dishes with no illustration:", UNKNOWN_SAMPLE_DISHES);
}

export function guestLogs(): MealLog[] {
  return SAMPLE_MEALS.map((sample, i) => {
    const date = utcDate(sample.daysAgo);
    return {
      id: `guest-log-${i + 1}`,
      date,
      meal: sample.meal,
      items: sample.items
        .map(([name, qty]) => entry(name, qty))
        .filter((e): e is MealLogEntry => e !== null),
      created_at: `${date}T12:00:00Z`,
    };
  });
}
