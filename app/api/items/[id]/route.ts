import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireCurrentSpace, requireCategoryInSpace, handleApiError, ApiError } from "@/lib/auth";
import { MenuItem } from "@/lib/types";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { spaceId } = await requireCurrentSpace();
    const { id } = await params;
    const item = (await req.json()) as MenuItem;
    if (!item.name?.trim()) throw new ApiError(400, "菜名不能为空");
    await requireCategoryInSpace(item.category_id, spaceId);

    const [row] = await sql`
      UPDATE menu_items SET
        category_id = ${item.category_id},
        name = ${item.name.trim()},
        image_url = ${item.image_url ?? ""},
        ingredients = ${item.ingredients ?? ""},
        instructions = ${item.instructions ?? ""},
        notes = ${item.notes ?? ""},
        is_active = ${item.is_active ?? true},
        sort_order = ${item.sort_order ?? 0},
        updated_at = now()
      WHERE id = ${id} AND space_id = ${spaceId} AND is_archived = false
      RETURNING id, category_id, name, image_url, ingredients, instructions, notes, is_active, sort_order, created_at, updated_at
    `;
    if (!row) throw new ApiError(404, "这道菜不存在");
    return NextResponse.json(row);
  } catch (e) {
    return handleApiError(e);
  }
}

// 删除 = 归档，不做物理删除（历史食记还引用着它，也给误删留后悔药）
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { spaceId } = await requireCurrentSpace();
    const { id } = await params;
    await sql`
      UPDATE menu_items SET is_archived = true, updated_at = now()
      WHERE id = ${id} AND space_id = ${spaceId}
    `;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
