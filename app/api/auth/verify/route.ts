import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { handleApiError, ApiError, isValidPhone, createSession, setSessionCookie } from "@/lib/auth";
import { createSpaceForUser, joinSpaceByCode } from "@/lib/space";

interface UserRow {
  id: string;
  phone: string;
  nickname: string;
  active_space_id: string | null;
}

export async function POST(req: Request) {
  try {
    const { phone, code, inviteCode, source } = (await req.json()) as {
      phone?: string; code?: string; inviteCode?: string; source?: string;
    };
    if (!phone || !isValidPhone(phone)) throw new ApiError(400, "请输入正确的手机号");
    if (!code || !/^\d{6}$/.test(code)) throw new ApiError(400, "请输入 6 位验证码");

    const [record] = await sql<{ id: string; code: string; attempts: number }>`
      SELECT id, code, attempts FROM sms_codes
      WHERE phone = ${phone} AND used = false AND expires_at > now()
      ORDER BY created_at DESC
      LIMIT 1
    `;
    if (!record) throw new ApiError(400, "验证码已过期，请重新获取");
    if (record.attempts >= 5) throw new ApiError(400, "尝试次数太多，请重新获取验证码");
    if (record.code !== code) {
      await sql`UPDATE sms_codes SET attempts = attempts + 1 WHERE id = ${record.id}`;
      throw new ApiError(400, "验证码不正确");
    }
    await sql`UPDATE sms_codes SET used = true WHERE id = ${record.id}`;

    // 手机号首次登录即注册。(xmax = 0) 判断这一行是不是刚 INSERT 的（老用户不覆盖来源）
    const [user] = await sql<UserRow & { is_new: boolean }>`
      INSERT INTO users (phone) VALUES (${phone})
      ON CONFLICT (phone) DO UPDATE SET phone = EXCLUDED.phone
      RETURNING id, phone, nickname, active_space_id, (xmax = 0) AS is_new
    `;

    // 注册来源只在注册那一刻写一次：被邀请的记 invite，其余用落地页透传的 from 参数
    if (user.is_new) {
      const cleanSource = inviteCode
        ? "invite"
        : (source ?? "").slice(0, 32).replace(/[^\w-]/g, "");
      if (cleanSource) {
        await sql`UPDATE users SET source = ${cleanSource} WHERE id = ${user.id}`;
      }
    }

    let created = false;
    if (inviteCode) {
      // 带邀请码登录：直接加入对方的小厨房
      await joinSpaceByCode(user.id, inviteCode);
    } else if (!user.active_space_id) {
      // 新用户：自动建好自己的小厨房，不需要填任何表单
      await createSpaceForUser(user.id);
      created = true;
    }

    const token = await createSession(user.id);
    await setSessionCookie(token);

    return NextResponse.json({ ok: true, created });
  } catch (e) {
    return handleApiError(e);
  }
}
