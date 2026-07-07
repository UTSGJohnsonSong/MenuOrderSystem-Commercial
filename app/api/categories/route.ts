import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireCurrentSpace, handleApiError, ApiError } from "@/lib/auth";
import { PRESET_MAP } from "@/lib/categories";

export async function GET() {
  try {
    const { spaceId } = await requireCurrentSpace();
    const rows = await sql`
      SELECT id, name, sort_order FROM categories
      WHERE space_id = ${spaceId}
      ORDER BY sort_order
    `;
    return NextResponse.json(rows);
  } catch (e) {
    return handleApiError(e);
  }
}

// 从预置类目库开/关分类（全体成员可操作，和加菜同级的内容权限）。
// 只能操作预置库里的 id，不接受自由新建。
export async function PUT(req: Request) {
  try {
    const { spaceId } = await requireCurrentSpace();
    const { id, enabled } = (await req.json()) as { id?: string; enabled?: boolean };
    const preset = id ? PRESET_MAP.get(id) : undefined;
    if (!preset || typeof enabled !== "boolean") throw new ApiError(400, "没有这个分类哦");

    if (enabled) {
      await sql`
        INSERT INTO categories (space_id, id, name, sort_order)
        VALUES (${spaceId}, ${preset.id}, ${preset.name}, ${preset.sort_order})
        ON CONFLICT (space_id, id) DO NOTHING
      `;
    } else {
      // 分类下还有可见的菜时不允许关闭（关闭会连带清掉这个分类的数据）
      const [{ count }] = await sql<{ count: string }>`
        SELECT count(*)::text AS count FROM menu_items
        WHERE space_id = ${spaceId} AND category_id = ${preset.id} AND is_archived = false
      `;
      if (Number(count) > 0) {
        throw new ApiError(400, `「${preset.name}」里还有 ${count} 道菜，先把它们移到别的分类吧`);
      }
      const [{ total }] = await sql<{ total: string }>`
        SELECT count(*)::text AS total FROM categories WHERE space_id = ${spaceId}
      `;
      if (Number(total) <= 1) throw new ApiError(400, "至少要留一个分类哦");
      await sql`DELETE FROM categories WHERE space_id = ${spaceId} AND id = ${preset.id}`;
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
