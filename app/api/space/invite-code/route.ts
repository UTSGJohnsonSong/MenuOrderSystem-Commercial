import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireCurrentSpace, handleApiError, ApiError } from "@/lib/auth";
import { generateInviteCode } from "@/lib/space";

// 重置邀请码：旧码立刻失效，防止被转发扩散后长期暴露
export async function POST() {
  try {
    const { user, spaceId } = await requireCurrentSpace();
    const [row] = await sql<{ invite_code: string }>`
      UPDATE spaces SET invite_code = ${generateInviteCode()}
      WHERE id = ${spaceId} AND owner_id = ${user.id}
      RETURNING invite_code
    `;
    if (!row) throw new ApiError(403, "只有空间主人可以重置邀请码");
    return NextResponse.json({ ok: true, invite_code: row.invite_code });
  } catch (e) {
    return handleApiError(e);
  }
}
