import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireUser, handleApiError } from "@/lib/auth";

// 菜品库配图映射（所有登录用户只读；配图本身只能管理员在 /admin 里改）
export async function GET() {
  try {
    await requireUser();
    const rows = await sql<{ dish_name: string; image_url: string }>`
      SELECT dish_name, image_url FROM library_images
    `;
    const images: Record<string, string> = {};
    for (const r of rows) images[r.dish_name] = r.image_url;
    return NextResponse.json({ images });
  } catch (e) {
    return handleApiError(e);
  }
}
