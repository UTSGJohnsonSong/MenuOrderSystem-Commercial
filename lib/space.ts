import { randomInt, randomUUID } from "crypto";
import { sql as poolSql, Sql, withTransaction } from "./db";
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

/**
 * 把用户的 active_space_id 指向 TA 最近加入的、未删除的空间（没有则置空）。
 * 在事务里调用：先删成员行/软删空间，再调这个，JOIN 会自然排除刚失效的空间。
 */
export async function repointActiveSpace(sql: Sql, userId: string) {
  const [other] = await sql<{ space_id: string }>`
    SELECT m.space_id FROM space_members m
    JOIN spaces s ON s.id = m.space_id AND s.deleted_at IS NULL
    WHERE m.user_id = ${userId}
    ORDER BY m.joined_at DESC
    LIMIT 1
  `;
  await sql`UPDATE users SET active_space_id = ${other?.space_id ?? null} WHERE id = ${userId}`;
}

/**
 * 兜底：用户一个空间都没有时自动新建（整个应用假设"活跃用户永远有空间"）。
 * createSpaceForUser 自带事务，必须在别的事务提交之后调用。
 */
export async function ensureUserHasSpace(userId: string) {
  const [row] = await poolSql`
    SELECT 1 AS ok FROM space_members m
    JOIN spaces s ON s.id = m.space_id AND s.deleted_at IS NULL
    WHERE m.user_id = ${userId}
    LIMIT 1
  `;
  if (!row) await createSpaceForUser(userId);
}

/** 通过邀请码加入空间（校验成员上限，加行锁防并发挤爆） */
export async function joinSpaceByCode(userId: string, code: string): Promise<SpaceInfo> {
  return withTransaction(async sql => {
    const [space] = await sql<SpaceInfo & { banned_at: string | null }>`
      SELECT id, name, invite_code, member_limit, owner_id, banned_at
      FROM spaces
      WHERE invite_code = ${code.trim().toUpperCase()} AND deleted_at IS NULL
      FOR UPDATE
    `;
    if (!space) throw new ApiError(404, "邀请码不对哦，再检查一下？");
    if (space.banned_at) throw new ApiError(403, "这个小厨房暂时无法访问");

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
