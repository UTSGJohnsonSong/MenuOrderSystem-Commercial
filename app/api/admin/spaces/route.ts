import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin, handleApiError, ApiError, maskPhone, isValidPhone } from "@/lib/auth";

/*
 * 空间查询（客服场景的核心）：输入手机号或邀请码，查到空间的
 * 名字、成员列表（脱敏手机号）、菜品数、食记数、创建时间、注册来源。
 * 隐私边界：只看计数不看内容——绝不返回菜品名/食记内容。
 * 已解散（deleted_at）的空间也返回，标记出来——「不小心解散了求恢复」是真实客服场景。
 */

interface SpaceRow {
  id: string; name: string; invite_code: string; member_limit: number;
  owner_id: string; created_at: string; banned_at: string | null; deleted_at: string | null;
  item_count: string; log_count: string;
}

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
    if (!q) throw new ApiError(400, "输入手机号或邀请码");

    let spaces: SpaceRow[] = [];
    let searchedUser: { id: string; nickname: string; source: string; created_at: string; last_active_at: string | null } | null = null;

    if (isValidPhone(q)) {
      const [u] = await sql<{ id: string; nickname: string; source: string; created_at: string; last_active_at: string | null }>`
        SELECT id, nickname, source, created_at, last_active_at FROM users WHERE phone = ${q}
      `;
      if (!u) return NextResponse.json({ spaces: [], user: null, message: "没有这个手机号的用户" });
      searchedUser = u;
      spaces = await sql<SpaceRow>`
        SELECT s.id, s.name, s.invite_code, s.member_limit, s.owner_id,
               s.created_at, s.banned_at, s.deleted_at,
               (SELECT count(*) FROM menu_items i WHERE i.space_id = s.id)::text AS item_count,
               (SELECT count(*) FROM meal_logs l WHERE l.space_id = s.id)::text AS log_count
        FROM space_members m
        JOIN spaces s ON s.id = m.space_id
        WHERE m.user_id = ${u.id}
        ORDER BY m.joined_at DESC
      `;
    } else if (/^[0-9A-Za-z]{6}$/.test(q)) {
      spaces = await sql<SpaceRow>`
        SELECT s.id, s.name, s.invite_code, s.member_limit, s.owner_id,
               s.created_at, s.banned_at, s.deleted_at,
               (SELECT count(*) FROM menu_items i WHERE i.space_id = s.id)::text AS item_count,
               (SELECT count(*) FROM meal_logs l WHERE l.space_id = s.id)::text AS log_count
        FROM spaces s
        WHERE s.invite_code = ${q.toUpperCase()}
      `;
    } else {
      throw new ApiError(400, "要么是 11 位手机号，要么是 6 位邀请码");
    }

    const result = [];
    for (const s of spaces) {
      const members = await sql<{
        user_id: string; phone: string; nickname: string; role: string;
        joined_at: string; source: string; last_active_at: string | null;
      }>`
        SELECT m.user_id, u.phone, u.nickname, m.role, m.joined_at, u.source, u.last_active_at
        FROM space_members m
        JOIN users u ON u.id = m.user_id
        WHERE m.space_id = ${s.id}
        ORDER BY m.joined_at
      `;
      result.push({
        id: s.id,
        name: s.name,
        invite_code: s.invite_code,
        member_limit: s.member_limit,
        created_at: s.created_at,
        banned: !!s.banned_at,
        deleted: !!s.deleted_at,
        item_count: Number(s.item_count),
        log_count: Number(s.log_count),
        members: members.map(m => ({
          user_id: m.user_id,
          phone_masked: maskPhone(m.phone),
          nickname: m.nickname,
          is_owner: m.user_id === s.owner_id,
          joined_at: m.joined_at,
          source: m.source,
          last_active_at: m.last_active_at,
        })),
      });
    }

    return NextResponse.json({
      spaces: result,
      user: searchedUser && {
        nickname: searchedUser.nickname,
        source: searchedUser.source,
        created_at: searchedUser.created_at,
        last_active_at: searchedUser.last_active_at,
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
