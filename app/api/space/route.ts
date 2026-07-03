import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireCurrentSpace, handleApiError, ApiError, maskPhone } from "@/lib/auth";

export async function GET() {
  try {
    const { user, spaceId } = await requireCurrentSpace();

    const [space] = await sql<{
      id: string; name: string; invite_code: string; member_limit: number; owner_id: string;
    }>`
      SELECT id, name, invite_code, member_limit, owner_id
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

export async function PATCH(req: Request) {
  try {
    const { user, spaceId } = await requireCurrentSpace();
    const { name } = (await req.json()) as { name?: string };
    const trimmed = (name ?? "").trim();
    if (!trimmed || trimmed.length > 20) throw new ApiError(400, "名字要在 1~20 个字之间");

    const [row] = await sql`
      UPDATE spaces SET name = ${trimmed}
      WHERE id = ${spaceId} AND owner_id = ${user.id}
      RETURNING id
    `;
    if (!row) throw new ApiError(403, "只有空间主人可以改名字");
    return NextResponse.json({ ok: true, name: trimmed });
  } catch (e) {
    return handleApiError(e);
  }
}
