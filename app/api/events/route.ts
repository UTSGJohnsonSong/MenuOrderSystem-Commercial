import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { handleApiError, ApiError } from "@/lib/auth";

// 极简埋点收集口（无需登录——落地页访客还没注册）。
// 只收白名单事件，meta 限长；不种 cookie、不采集任何设备信息。
const ALLOWED_EVENTS = new Set(["welcome_view"]);

export async function POST(req: Request) {
  try {
    const { name, meta } = (await req.json()) as { name?: string; meta?: string };
    if (!name || !ALLOWED_EVENTS.has(name)) throw new ApiError(400, "unknown event");
    const cleanMeta = (meta ?? "").slice(0, 32).replace(/[^\w-]/g, "");
    await sql`INSERT INTO events (name, meta) VALUES (${name}, ${cleanMeta})`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
