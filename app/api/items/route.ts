import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { sql } from "@/lib/db";
import { requireCurrentSpace, requireCategoryInSpace, handleApiError, ApiError } from "@/lib/auth";
import { MenuItem } from "@/lib/types";

export async function GET() {
  try {
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
    return NextResponse.json(row);
  } catch (e) {
    return handleApiError(e);
  }
}
