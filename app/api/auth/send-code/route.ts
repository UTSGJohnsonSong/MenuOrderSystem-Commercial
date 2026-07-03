import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import { sql } from "@/lib/db";
import { handleApiError, ApiError, isValidPhone } from "@/lib/auth";
import { sendSmsCode, isConsoleProvider } from "@/lib/sms";

const CODE_TTL_MINUTES = 5;

export async function POST(req: Request) {
  try {
    const { phone } = (await req.json()) as { phone?: string };
    if (!phone || !isValidPhone(phone)) throw new ApiError(400, "请输入正确的手机号");

    // 限流：同一手机号 60 秒 1 条、24 小时 10 条，防脚本刷短信费
    const [recent] = await sql`
      SELECT 1 AS ok FROM sms_codes
      WHERE phone = ${phone} AND created_at > now() - interval '60 seconds'
    `;
    if (recent) throw new ApiError(429, "发送太频繁了，请稍等一分钟");

    const [{ count }] = await sql<{ count: string }>`
      SELECT count(*)::text AS count FROM sms_codes
      WHERE phone = ${phone} AND created_at > now() - interval '24 hours'
    `;
    if (Number(count) >= 10) throw new ApiError(429, "今天发送次数已达上限，请明天再试");

    const code = String(randomInt(100000, 1000000));
    const expires = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);
    await sql`
      INSERT INTO sms_codes (phone, code, expires_at)
      VALUES (${phone}, ${code}, ${expires.toISOString()})
    `;

    await sendSmsCode(phone, code);

    // 只有开发环境的 console 通道才把验证码带回响应（sendSmsCode 在生产 + console 时会直接抛错）
    const devCode = isConsoleProvider() && process.env.NODE_ENV !== "production" ? code : undefined;
    return NextResponse.json({ ok: true, ...(devCode ? { devCode } : {}) });
  } catch (e) {
    return handleApiError(e);
  }
}
