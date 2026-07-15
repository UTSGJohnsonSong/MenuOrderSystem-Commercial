import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin, handleApiError, ApiError } from "@/lib/auth";
import { logAdminAction } from "@/lib/admin";

// 封禁 / 恢复空间：banned_at 与软删（deleted_at）分开，随时可恢复。
// 封禁后成员的业务接口全部 403，前端展示「小厨房暂时无法访问」。
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const { space_id, action, note } = (await req.json()) as {
      space_id?: string; action?: "ban" | "restore"; note?: string;
    };
    if (!space_id) throw new ApiError(400, "缺 space_id");
    if (action !== "ban" && action !== "restore") throw new ApiError(400, "action 必须是 ban 或 restore");

    const [row] = action === "ban"
      ? await sql`UPDATE spaces SET banned_at = now() WHERE id = ${space_id} AND deleted_at IS NULL RETURNING id`
      : await sql`UPDATE spaces SET banned_at = NULL  WHERE id = ${space_id} AND deleted_at IS NULL RETURNING id`;
    if (!row) throw new ApiError(404, "空间不存在或已解散");

    await logAdminAction(admin.id, space_id, action === "ban" ? "ban_space" : "restore_space", note ?? "");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
