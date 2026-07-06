import { NextResponse } from "next/server";
import { sql, withTransaction } from "@/lib/db";
import { requireCurrentSpace, handleApiError, ApiError } from "@/lib/auth";
import { repointActiveSpace, ensureUserHasSpace } from "@/lib/space";

// 空间主人移出成员。被移出的人如果没有别的厨房，自动给 TA 新建一个。
export async function POST(req: Request) {
  try {
    const { user, spaceId } = await requireCurrentSpace();
    const { member_id } = (await req.json()) as { member_id?: string };
    if (!member_id) throw new ApiError(400, "缺少成员");
    if (member_id === user.id) throw new ApiError(400, "不能移出自己哦");

    const [space] = await sql<{ owner_id: string }>`SELECT owner_id FROM spaces WHERE id = ${spaceId}`;
    if (space.owner_id !== user.id) throw new ApiError(403, "只有空间主人可以移出成员");

    await withTransaction(async tx => {
      const [removed] = await tx`
        DELETE FROM space_members
        WHERE space_id = ${spaceId} AND user_id = ${member_id}
        RETURNING user_id
      `;
      if (!removed) throw new ApiError(404, "TA 不在这个小厨房里");

      // 只有当 TA 正停留在这个空间时才需要重新指向，别动 TA 在其他厨房的状态
      const [target] = await tx<{ active_space_id: string | null }>`
        SELECT active_space_id FROM users WHERE id = ${member_id}
      `;
      if (target?.active_space_id === spaceId) {
        await repointActiveSpace(tx, member_id);
      }
    });

    await ensureUserHasSpace(member_id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
