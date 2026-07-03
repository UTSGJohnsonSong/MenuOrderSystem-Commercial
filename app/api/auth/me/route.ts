import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAuthUser, handleApiError, maskPhone } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ user: null });

    let space = null;
    if (user.active_space_id) {
      const [row] = await sql<{
        id: string; name: string; invite_code: string; member_limit: number;
        owner_id: string; member_count: string;
      }>`
        SELECT s.id, s.name, s.invite_code, s.member_limit, s.owner_id,
               (SELECT count(*) FROM space_members m WHERE m.space_id = s.id)::text AS member_count
        FROM spaces s
        JOIN space_members me ON me.space_id = s.id AND me.user_id = ${user.id}
        WHERE s.id = ${user.active_space_id} AND s.deleted_at IS NULL
      `;
      if (row) {
        space = {
          id: row.id,
          name: row.name,
          invite_code: row.invite_code,
          member_limit: row.member_limit,
          member_count: Number(row.member_count),
          is_owner: row.owner_id === user.id,
        };
      }
    }

    return NextResponse.json({
      user: { id: user.id, phone_masked: maskPhone(user.phone), nickname: user.nickname },
      space,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
