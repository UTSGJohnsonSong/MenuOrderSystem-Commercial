import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { sql } from "@/lib/db";
import { requireCurrentSpace, requireCategoryInSpace, handleApiError, ApiError, isGuestVisitor } from "@/lib/auth";
import { guestItems, guestJson } from "@/lib/guest";
import { track } from "@/lib/track";
import { MenuItem } from "@/lib/types";

export async function GET() {
  try {
    if (await isGuestVisitor()) return guestJson(guestItems());
    const { spaceId } = await requireCurrentSpace();
    const rows = await sql`
      SELECT id, category_id, name, image_url, ingredients, instructions, notes,
             is_active, sort_order, created_at, updated_at
      FROM menu_items
      WHERE space_id = ${spaceId} AND is_archived = false
      ORDER BY sort_order
    `;
    return NextResponse.json(rows);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const { user, spaceId } = await requireCurrentSpace();
    const item = (await req.json()) as MenuItem;
    if (!item.name?.trim()) throw new ApiError(400, "菜名不能为空");
    if (item.name.trim().length > 50) throw new ApiError(400, "菜名太长啦");
    await requireCategoryInSpace(item.category_id, spaceId);

    // id 由服务端生成，不信任客户端（防跨空间 id 冲突/覆盖）
    const [row] = await sql`
      INSERT INTO menu_items (id, space_id, category_id, name, image_url, ingredients, instructions, notes, is_active, sort_order, created_by)
      VALUES (${randomUUID()}, ${spaceId}, ${item.category_id}, ${item.name.trim()}, ${item.image_url ?? ""}, ${item.ingredients ?? ""}, ${item.instructions ?? ""}, ${item.notes ?? ""}, ${item.is_active ?? true}, ${item.sort_order ?? 0}, ${user.id})
      RETURNING id, category_id, name, image_url, ingredients, instructions, notes, is_active, sort_order, created_at, updated_at
    `;

    /* 区分来源：从菜品库加进来的菜带 /library/ 开头的图，自己写的没有。
     * 这一个字段回答「那 416 道菜和 177 张插画到底有没有人用」——
     * 如果绝大多数是 manual，说明菜品库是摆设，付费墙就不该立在配图上。 */
    track("item_add", item.image_url?.startsWith("/library/") ? "library" : "manual");

    return NextResponse.json(row);
  } catch (e) {
    return handleApiError(e);
  }
}
