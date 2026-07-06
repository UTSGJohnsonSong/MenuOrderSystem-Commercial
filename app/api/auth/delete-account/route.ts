import { NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";
import { requireUser, handleApiError, ApiError, destroySession } from "@/lib/auth";
import { repointActiveSpace, ensureUserHasSpace } from "@/lib/space";

// 注销账号（隐私政策承诺的兑现）：
// - 本人作为主人的小厨房一并解散（软删）
// - 退出所有加入的厨房、清空会话和短信记录
// - users 行匿名化保留（menu_items.created_by 外键引用它，物理删会破坏别人厨房的数据）
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { confirm } = (await req.json()) as { confirm?: string };
    if ((confirm ?? "").trim() !== "注销") throw new ApiError(400, "请输入「注销」两个字确认");

    const affectedMembers = await withTransaction(async tx => {
      // 1. 解散本人拥有的空间
      const owned = await tx<{ id: string }>`
        SELECT id FROM spaces WHERE owner_id = ${user.id} AND deleted_at IS NULL
      `;
      const ownedIds = owned.map(s => s.id);
      if (ownedIds.length > 0) {
        await tx`UPDATE spaces SET deleted_at = now() WHERE id = ANY(${ownedIds})`;
      }

      // 2. 受牵连的其他成员（他们的厨房被解散了）
      const others = ownedIds.length > 0
        ? await tx<{ user_id: string }>`
            SELECT DISTINCT user_id FROM space_members
            WHERE space_id = ANY(${ownedIds}) AND user_id <> ${user.id}
          `
        : [];

      // 3. 本人退出所有空间、清会话、清短信记录、匿名化
      await tx`DELETE FROM space_members WHERE user_id = ${user.id}`;
      await tx`DELETE FROM sessions WHERE user_id = ${user.id}`;
      await tx`DELETE FROM sms_codes WHERE phone = ${user.phone}`;
      await tx`
        UPDATE users
        SET phone = 'del_' || id, nickname = '已注销', active_space_id = NULL
        WHERE id = ${user.id}
      `;

      // 4. 其他成员如果正停留在被解散的厨房，重新指向
      for (const m of others) {
        const [u] = await tx<{ active_space_id: string | null }>`
          SELECT active_space_id FROM users WHERE id = ${m.user_id}
        `;
        if (u?.active_space_id && ownedIds.includes(u.active_space_id)) {
          await repointActiveSpace(tx, m.user_id);
        }
      }
      return others.map(m => m.user_id);
    });

    for (const id of affectedMembers) {
      await ensureUserHasSpace(id);
    }

    await destroySession(); // 清 cookie（sessions 行已在事务里删除）
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
