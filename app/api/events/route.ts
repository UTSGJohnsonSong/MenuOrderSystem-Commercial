import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { handleApiError, ApiError } from "@/lib/auth";

/* 极简埋点收集口（无需登录——落地页访客还没注册）。
 * 只收白名单事件，meta 限长；不种 cookie、不采集任何设备信息。
 *
 * 这里只放**服务器看不见**的动作。加菜、存食记、传图、接受邀请都经过服务器，
 * 那些在 lib/track.ts 里打，不走这个口子——客户端埋点会被网络抖动、
 * 广告拦截、以及「点完就关页面」漏掉。
 *
 * invite_share：复制邀请链接/邀请码是纯前端行为，服务器无从知晓，
 * 但它是北极星指标（48h 邀请成功率）的分母，必须收。
 * install_prompt_view：/install 引导页的曝光，决定要不要继续投入做安装引导。
 *
 * 加白名单的同时必须真的有地方发送它，否则 /admin 会挂一行永远为 0 的指标，
 * 而「没人做」和「没人埋」在看板上长得一模一样。 */
const ALLOWED_EVENTS = new Set([
  "welcome_view",
  "invite_share",
  "install_prompt_view",
]);

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
