import { NextResponse } from "next/server";
import { sql, withTransaction } from "@/lib/db";
import { requireCurrentSpace, handleApiError, ApiError } from "@/lib/auth";
import { repointActiveSpace, ensureUserHasSpace } from "@/lib/space";

// 解散小厨房：仅空间主人，且必须输入厨房名字确认（防手滑）。
// 软删除（deleted_at），数据可人工恢复；所有成员失去访问，没别的厨房的自动新建。
export async function POST(req: Request) {
  try {
    const { user, spaceId } = await requireCurrentSpace();
    const { confirm_name } = (await req.json()) as { confirm_name?: string };

    const [space] = await sql<{ owner_id: string; name: string }>`
      SELECT owner_id, name FROM spaces WHERE id = ${spaceId}
    `;
    if (space.owner_id !== user.id) throw new ApiError(403, "只有空间主人可以解散小厨房");
    if ((confirm_name ?? "").trim() !== space.name) {
      throw new ApiError(400, "输入的名字不对，再确认一下？");
    }

    const memberIds = await withTransaction(async tx => {
      await tx`UPDATE spaces SET deleted_at = now() WHERE id = ${spaceId}`;
      const members = await tx<{ user_id: string }>`
        SELECT user_id FROM space_members WHERE space_id = ${spaceId}
      `;
      for (const m of members) {
        const [u] = await tx<{ active_space_id: string | null }>`
          SELECT active_space_id FROM users WHERE id = ${m.user_id}
        `;
        if (u?.active_space_id === spaceId) {
          await repointActiveSpace(tx, m.user_id);
        }
      }
      return members.map(m => m.user_id);
    });

    for (const id of memberIds) {
      await ensureUserHasSpace(id);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
