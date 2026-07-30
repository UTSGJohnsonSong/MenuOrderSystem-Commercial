"use client";

/*
 * 分类图标：预置类目用水彩插画（public/cat-icons/{id}.png，白底 128px），
 * 未知类目回退到 emoji。全站分类图标统一走这里，别再散落 emoji。
 *
 * The artwork ships on a white square, which read as a hard white chip floating
 * on the cream sidebar. multiply blending dissolves it: white × cream is cream,
 * so the square disappears and the illustration picks up the warm background
 * instead of fighting it. Every place this renders is a light surface (cream
 * sidebar, white cards, the cream gradient behind a coverless dish) — do not
 * put it on a dark background without revisiting this.
 */

const KNOWN = new Set([
  "zaochan", "zhushi", "mianshi", "rourou", "caicai", "tangtang",
  "haixian", "liangcai", "tianpin", "shuiguo", "yinpin", "yexiao", "yao",
]);

export const CAT_EMOJI_FALLBACK: Record<string, string> = {
  zaochan: "🍳", zhushi: "🍚", mianshi: "🍜", rourou: "🥩",
  caicai: "🥦", shuiguo: "🍓", tianpin: "🍮", yao: "💊",
  tangtang: "🍲", haixian: "🦐", liangcai: "🥗", yinpin: "🧋", yexiao: "🌙",
};

export default function CatIcon({ id, size = 24, round = true }: {
  id: string | undefined;
  size?: number;
  round?: boolean;
}) {
  if (id && KNOWN.has(id)) {
    return (
      <img
        src={`/cat-icons/${id}.png`}
        alt=""
        width={size}
        height={size}
        style={{
          width: size, height: size,
          borderRadius: round ? "26%" : 0,
          objectFit: "cover", display: "block", flexShrink: 0,
          mixBlendMode: "multiply",
        }}
      />
    );
  }
  return (
    <span style={{ fontSize: size * 0.82, lineHeight: 1, display: "block", flexShrink: 0 }}>
      {(id && CAT_EMOJI_FALLBACK[id]) ?? "🍽️"}
    </span>
  );
}
