import { withTransaction } from "./db";
import { repointActiveSpace, ensureUserHasSpace } from "./space";

/*
 * 注销账号的核心逻辑（隐私政策承诺的兑现），两处共用：
 *   - 用户自助注销（/api/auth/delete-account）
 *   - 管理员代注销（/api/admin/users/delete，客服场景）
 * 行为：
 *   - 本人作为主人的小厨房一并解散（软删）
 *   - 退出所有加入的厨房、清空会话和短信记录
 *   - users 行匿名化保留（menu_items.created_by 外键引用它，物理删会破坏别人厨房的数据）
 *   - 受牵连的其他成员自动落回自己的厨房或新建
 */
export async function deleteUserAccount(user: { id: string; phone: string }) {
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
}
