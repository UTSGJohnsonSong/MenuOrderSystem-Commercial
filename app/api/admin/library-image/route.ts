import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin, handleApiError, ApiError } from "@/lib/auth";
import { LIBRARY_DISHES } from "@/lib/library";

// 设置/清除某道库菜的配图。仅管理员。
export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { dish_name, image_url } = (await req.json()) as { dish_name?: string; image_url?: string };

    if (!dish_name || !LIBRARY_DISHES.some(d => d.name === dish_name)) {
      throw new ApiError(400, "菜品库里没有这道菜");
    }
    const url = (image_url ?? "").trim();
    if (url && !url.startsWith("/api/uploads/")) {
      throw new ApiError(400, "图片必须先通过上传接口");
    }

    if (!url) {
      await sql`DELETE FROM library_images WHERE dish_name = ${dish_name}`;
    } else {
      await sql`
        INSERT INTO library_images (dish_name, image_url)
        VALUES (${dish_name}, ${url})
        ON CONFLICT (dish_name) DO UPDATE SET image_url = ${url}, updated_at = now()
      `;
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
