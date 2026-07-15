import { NextResponse } from "next/server";
import { requireUser, handleApiError, ApiError, destroySession } from "@/lib/auth";
import { deleteUserAccount } from "@/lib/account";

// 注销账号（用户自助）：核心逻辑在 lib/account.ts，与管理员代注销共用
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { confirm } = (await req.json()) as { confirm?: string };
    if ((confirm ?? "").trim() !== "注销") throw new ApiError(400, "请输入「注销」两个字确认");

    await deleteUserAccount(user);

    await destroySession(); // 清 cookie（sessions 行已在事务里删除）
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
