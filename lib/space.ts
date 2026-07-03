import { randomInt, randomUUID } from "crypto";
import { Sql, withTransaction } from "./db";
import { ApiError } from "./auth";
import { DEFAULT_CATEGORIES, DEFAULT_ITEMS } from "./data";

// 去掉易混淆字符（0/O、1/I/L）的邀请码字母表
const INVITE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function generateInviteCode() {
  let code = "";
  for (let i = 0; i < 6; i++) code += INVITE_ALPHABET[randomInt(INVITE_ALPHABET.length)];
  return code;
}

/** 新空间自动填充通用菜谱模板，保证第一次打开不是空的 */
async function seedSpace(sql: Sql, spaceId: string, userId: string) {
  for (const cat of DEFAULT_CATEGORIES) {
    await sql`
      INSERT INTO categories (space_id, id, name, sort_order)
      VALUES (${spaceId}, ${cat.id}, ${cat.name}, ${cat.sort_order})
    `;
  }
  for (const item of DEFAULT_ITEMS) {
    await sql`
      INSERT INTO menu_items (id, space_id, category_id, name, image_url, ingredients, instructions, notes, is_active, sort_order, created_by)
      VALUES (${randomUUID()}, ${spaceId}, ${item.category_id}, ${item.name}, ${item.image_url}, ${item.ingredients}, ${item.instructions}, ${item.notes}, ${item.is_active}, ${item.sort_order}, ${userId})
    `;
  }
}

export interface SpaceInfo {
  id: string;
  name: string;
  invite_code: string;
  member_limit: number;
  owner_id: string;
}

/** 建空间 + 模板菜谱 + 加为 owner + 设为当前空间，整体一个事务 */
export async function createSpaceForUser(userId: string, name = "我们的小厨房"): Promise<SpaceInfo> {
  return withTransaction(async sql => {
    const [space] = await sql<SpaceInfo>`
      INSERT INTO spaces (name, invite_code, owner_id)
      VALUES (${name}, ${generateInviteCode()}, ${userId})
      RETURNING id, name, invite_code, member_limit, owner_id
    `;
    await sql`INSERT INTO space_members (space_id, user_id, role) VALUES (${space.id}, ${userId}, 'owner')`;
    await sql`UPDATE users SET active_space_id = ${space.id} WHERE id = ${userId}`;
    await seedSpace(sql, space.id, userId);
    return space;
  });
}

/** 通过邀请码加入空间（校验成员上限，加行锁防并发挤爆） */
export async function joinSpaceByCode(userId: string, code: string): Promise<SpaceInfo> {
  return withTransaction(async sql => {
    const [space] = await sql<SpaceInfo>`
      SELECT id, name, invite_code, member_limit, owner_id
      FROM spaces
      WHERE invite_code = ${code.trim().toUpperCase()} AND deleted_at IS NULL
      FOR UPDATE
    `;
    if (!space) throw new ApiError(404, "邀请码不对哦，再检查一下？");

    const [existing] = await sql`
      SELECT 1 AS ok FROM space_members WHERE space_id = ${space.id} AND user_id = ${userId}
    `;
    if (!existing) {
      const [{ count }] = await sql<{ count: string }>`
        SELECT count(*)::text AS count FROM space_members WHERE space_id = ${space.id}
      `;
      if (Number(count) >= space.member_limit) {
        throw new ApiError(403, "这个小厨房已经满员啦");
      }
      await sql`INSERT INTO space_members (space_id, user_id, role) VALUES (${space.id}, ${userId}, 'member')`;
    }
    await sql`UPDATE users SET active_space_id = ${space.id} WHERE id = ${userId}`;
    return space;
  });
}
