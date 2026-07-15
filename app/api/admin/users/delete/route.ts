import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin, handleApiError, ApiError, maskPhone } from "@/lib/auth";
import { deleteUserAccount } from "@/lib/account";
import { logAdminAction } from "@/lib/admin";

// 管理员代注销用户（客服场景：用户私信要求注销，隐私政策的兑现）。
// 核心逻辑与用户自助注销共用 lib/account.ts。
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const { user_id, note } = (await req.json()) as { user_id?: string; note?: string };
    if (!user_id) throw new ApiError(400, "缺 user_id");
    if (user_id === admin.id) throw new ApiError(400, "不能在后台注销自己，请走设置页的自助注销");

    const [target] = await sql<{ id: string; phone: string }>`
      SELECT id, phone FROM users WHERE id = ${user_id}
    `;
    if (!target) throw new ApiError(404, "用户不存在");
    if (target.phone.startsWith("del_")) throw new ApiError(400, "这个账号已经注销过了");

    await deleteUserAccount(target);

    await logAdminAction(admin.id, null, "delete_user",
      `${maskPhone(target.phone)}${note ? ` · ${note}` : ""}`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
