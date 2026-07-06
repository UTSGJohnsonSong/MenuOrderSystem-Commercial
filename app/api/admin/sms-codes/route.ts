import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin, handleApiError, maskPhone } from "@/lib/auth";
import { isConsoleProvider } from "@/lib/sms";

/*
 * 最近验证码（仅管理员，且仅在 console 短信通道下可用）。
 * 用途：备案期内测没有真实短信，管理员在后台帮测试用户查码。
 * 阿里云短信接通（SMS_PROVIDER=aliyun）后本接口自动 404，不留后门。
 */
export async function GET() {
  try {
    await requireAdmin();
    const consoleAllowed = isConsoleProvider() &&
      (process.env.NODE_ENV !== "production" || process.env.SMS_CONSOLE_IN_PROD === "1");
    if (!consoleAllowed) return NextResponse.json({ error: "Not Found" }, { status: 404 });

    const rows = await sql<{ phone: string; code: string; used: boolean; expires_at: string; created_at: string }>`
      SELECT phone, code, used, expires_at, created_at
      FROM sms_codes
      ORDER BY created_at DESC
      LIMIT 10
    `;
    return NextResponse.json({
      codes: rows.map(r => ({
        phone: maskPhone(r.phone),
        code: r.code,
        status: r.used ? "已使用" : new Date(r.expires_at) < new Date() ? "已过期" : "有效",
        at: r.created_at,
      })),
    });
  } catch (e) {
    return handleApiError(e);
  }
}
