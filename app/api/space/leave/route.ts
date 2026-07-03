import { NextResponse } from "next/server";
import { sql, withTransaction } from "@/lib/db";
import { requireCurrentSpace, handleApiError, ApiError } from "@/lib/auth";
import { createSpaceForUser } from "@/lib/space";

// 退出当前小厨房。空间主人不能退出（数据归属跟着主人走）。
// 退出后：还有别的空间就切过去，一个都没有就自动新建一个。
export async function POST() {
  try {
    const { user, spaceId } = await requireCurrentSpace();

    const [space] = await sql<{ owner_id: string }>`SELECT owner_id FROM spaces WHERE id = ${spaceId}`;
    if (space.owner_id === user.id) {
      throw new ApiError(400, "你是这个小厨房的主人，不能退出自己的厨房");
    }

    const nextSpaceId = await withTransaction(async tx => {
      await tx`DELETE FROM space_members WHERE space_id = ${spaceId} AND user_id = ${user.id}`;
      const [other] = await tx<{ space_id: string }>`
        SELECT m.space_id FROM space_members m
        JOIN spaces s ON s.id = m.space_id AND s.deleted_at IS NULL
        WHERE m.user_id = ${user.id}
        ORDER BY m.joined_at DESC
        LIMIT 1
      `;
      await tx`UPDATE users SET active_space_id = ${other?.space_id ?? null} WHERE id = ${user.id}`;
      return other?.space_id ?? null;
    });

    if (!nextSpaceId) {
      await createSpaceForUser(user.id);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
