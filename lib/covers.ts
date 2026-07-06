/*
 * 小厨房主页封面（space 级设置，全体成员共享同一个封面）。
 * 全部纯 CSS 渐变 + emoji 轻装饰，不依赖外部图片；
 * cover_image_url 字段已预留给以后的「上传自己的封面」（见 TODO_MVP_AFTER.md）。
 */

export interface CoverPreset {
  id: string;
  label: string;
  bg: string;        // CSS background
  deco: [string, string]; // 两个装饰 emoji（右上大、左下小）
  dark: boolean;     // true = 深色底，文字用奶油白；false = 浅色底，文字用深棕
}

export const COVER_PRESETS: CoverPreset[] = [
  { id: "warm-orange",     label: "暖橙早餐", bg: "linear-gradient(135deg, #FFB25E 0%, #FFE3B8 100%)", deco: ["🍚", "🥢"], dark: false },
  { id: "cream-kitchen",   label: "奶油厨房", bg: "linear-gradient(135deg, #FFF3E0 0%, #FFDDB5 100%)", deco: ["🏠", "🍳"], dark: false },
  { id: "tomato-dinner",   label: "番茄晚餐", bg: "linear-gradient(135deg, #E86A4C 0%, #FFA76B 100%)", deco: ["🍅", "🍝"], dark: true },
  { id: "sakura-bento",    label: "樱花便当", bg: "linear-gradient(135deg, #FFD9E3 0%, #FFF3EA 100%)", deco: ["🌸", "🍱"], dark: false },
  { id: "night-pot",       label: "深夜小锅", bg: "linear-gradient(135deg, #4A3226 0%, #8A5A34 100%)", deco: ["🍲", "✨"], dark: true },
  { id: "weekend-dessert", label: "周末甜点", bg: "linear-gradient(135deg, #FFEFB8 0%, #FFD9E8 100%)", deco: ["🍮", "🥄"], dark: false },
  { id: "fresh-veggie",    label: "清新蔬菜", bg: "linear-gradient(135deg, #DFF0D0 0%, #FFF9EC 100%)", deco: ["🥬", "🥕"], dark: false },
  { id: "blue-midnight",   label: "蓝色夜宵", bg: "linear-gradient(135deg, #93AECF 0%, #6E7BA8 100%)", deco: ["🌙", "🍜"], dark: true },
];

export const DEFAULT_COVER = "warm-orange";

export const COVER_IDS = new Set(COVER_PRESETS.map(p => p.id));

export function getCover(id: string | null | undefined): CoverPreset {
  return COVER_PRESETS.find(p => p.id === id) ?? COVER_PRESETS[0];
}
