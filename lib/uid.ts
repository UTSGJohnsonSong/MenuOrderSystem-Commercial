/*
 * 客户端 UUID：crypto.randomUUID() 只在安全上下文（HTTPS/localhost）可用，
 * 备案期 HTTP 内测环境没有它，直接调用会抛错（表现为按钮点了没反应）。
 * getRandomValues 不受安全上下文限制，用它手搓 v4 兜底。
 */
export function uid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // variant
  const h = Array.from(b, x => x.toString(16).padStart(2, "0"));
  return `${h.slice(0, 4).join("")}-${h.slice(4, 6).join("")}-${h.slice(6, 8).join("")}-${h.slice(8, 10).join("")}-${h.slice(10).join("")}`;
}
