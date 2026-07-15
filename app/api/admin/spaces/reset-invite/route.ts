import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin, handleApiError, ApiError } from "@/lib/auth";
import { generateInviteCode } from "@/lib/space";
import { logAdminAction } from "@/lib/admin";

// 代用户重置邀请码（最高频客服求助：「码被我发到群里了」）
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const { space_id, note } = (await req.json()) as { space_id?: string; note?: string };
    if (!space_id) throw new ApiError(400, "缺 space_id");

    const [row] = await sql<{ invite_code: string }>`
      UPDATE spaces SET invite_code = ${generateInviteCode()}
      WHERE id = ${space_id} AND deleted_at IS NULL
      RETURNING invite_code
    `;
    if (!row) throw new ApiError(404, "空间不存在或已解散");

    await logAdminAction(admin.id, space_id, "reset_invite", note ?? "");
    return NextResponse.json({ ok: true, invite_code: row.invite_code });
  } catch (e) {
    return handleApiError(e);
  }
}
