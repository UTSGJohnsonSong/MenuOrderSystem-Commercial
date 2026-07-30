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

    /* 生产环境走 console 通道（备案期内测）时，验证码只进服务器日志，用户永远收不到。
     * 这里必须如实告诉前端，否则页面会照常开始 60 秒倒计时、装成发送成功，
     * 让人对着一个不会来的短信干等——这是陌生访客最可能撞上的死胡同。
     * 注意不按手机号区分（比如白名单号码就不提示），那会让这个响应变成
     * 探测「哪些号码能直登」的工具。 */
    const smsPending = isConsoleProvider() && process.env.NODE_ENV === "production";

    return NextResponse.json({
      ok: true,
      ...(devCode ? { devCode } : {}),
      ...(smsPending ? { smsPending: true } : {}),
    });
  } catch (e) {
    return handleApiError(e);
  }
}
