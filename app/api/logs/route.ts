import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { sql } from "@/lib/db";
import { requireCurrentSpace, handleApiError, ApiError } from "@/lib/auth";
import { MealLog } from "@/lib/types";

export async function GET() {
  try {
    const { spaceId } = await requireCurrentSpace();
    const rows = await sql`
      SELECT id, date, items, created_at FROM meal_logs
      WHERE space_id = ${spaceId}
      ORDER BY date DESC
      LIMIT 400
    `;
    return NextResponse.json(rows);
  } catch (e) {
    return handleApiError(e);
  }
}

// 同一天重复保存时覆盖当天记录
export async function POST(req: Request) {
  try {
    const { spaceId } = await requireCurrentSpace();
    const log = (await req.json()) as MealLog;
    if (!log.date || !/^\d{4}-\d{2}-\d{2}$/.test(log.date)) throw new ApiError(400, "日期格式不对");
    if (!Array.isArray(log.items) || log.items.length === 0) throw new ApiError(400, "还没有选菜哦");

    const [row] = await sql`
      INSERT INTO meal_logs (id, space_id, date, items)
      VALUES (${randomUUID()}, ${spaceId}, ${log.date}, ${JSON.stringify(log.items)})
      ON CONFLICT (space_id, date) DO UPDATE SET
        items = EXCLUDED.items,
        created_at = now()
      RETURNING id, date, items, created_at
    `;
    return NextResponse.json(row);
  } catch (e) {
    return handleApiError(e);
  }
}
