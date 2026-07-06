import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireCurrentSpace, handleApiError, ApiError, maskPhone } from "@/lib/auth";
import { COVER_IDS, DEFAULT_COVER } from "@/lib/covers";

export async function GET() {
  try {
    const { user, spaceId } = await requireCurrentSpace();

    const [space] = await sql<{
      id: string; name: string; invite_code: string; member_limit: number; owner_id: string;
      cover_preset: string; cover_image_url: string | null;
    }>`
      SELECT id, name, invite_code, member_limit, owner_id, cover_preset, cover_image_url
      FROM spaces WHERE id = ${spaceId}
    `;

    const members = await sql<{
      user_id: string; phone: string; nickname: string; role: string; joined_at: string;
    }>`
      SELECT m.user_id, u.phone, u.nickname, m.role, m.joined_at
      FROM space_members m
      JOIN users u ON u.id = m.user_id
      WHERE m.space_id = ${spaceId}
      ORDER BY m.joined_at
    `;

    return NextResponse.json({
      id: space.id,
      name: space.name,
      invite_code: space.invite_code,
      member_limit: space.member_limit,
      cover_preset: space.cover_preset ?? DEFAULT_COVER,
      cover_image_url: space.cover_image_url,
      is_owner: space.owner_id === user.id,
      members: members.map(m => ({
        id: m.user_id,
        phone_masked: maskPhone(m.phone),
        nickname: m.nickname,
        role: m.role,
        is_me: m.user_id === user.id,
      })),
    });
  } catch (e) {
    return handleApiError(e);
  }
}

/*
 * 小厨房设置。权限分级：
 *   - name：只有主人能改（空间的身份归属）
 *   - cover_preset：所有成员都能换（低风险的共同装饰，更有一起生活感）
 */
export async function PATCH(req: Request) {
  try {
    const { user, spaceId } = await requireCurrentSpace();
    const { name, cover_preset } = (await req.json()) as { name?: string; cover_preset?: string };
    const result: { ok: true; name?: string; cover_preset?: string } = { ok: true };

    if (name !== undefined) {
      // 空名回退默认；上限 20 字
      const trimmed = name.trim() || "我们的小厨房";
      if (trimmed.length > 20) throw new ApiError(400, "名字最多 20 个字");
      const [row] = await sql`
        UPDATE spaces SET name = ${trimmed}
        WHERE id = ${spaceId} AND owner_id = ${user.id}
        RETURNING id
      `;
      if (!row) throw new ApiError(403, "只有小厨房主人可以改名字");
      result.name = trimmed;
    }

    if (cover_preset !== undefined) {
      if (!COVER_IDS.has(cover_preset)) throw new ApiError(400, "没有这个封面哦");
      await sql`UPDATE spaces SET cover_preset = ${cover_preset} WHERE id = ${spaceId}`;
      result.cover_preset = cover_preset;
    }

    return NextResponse.json(result);
  } catch (e) {
    return handleApiError(e);
  }
}
