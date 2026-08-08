import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { sql } from "@/lib/db";
import { requireCurrentSpace, handleApiError, ApiError, isGuestVisitor } from "@/lib/auth";
import { guestJson, guestLogs } from "@/lib/guest";
import { MealLog } from "@/lib/types";
import { track } from "@/lib/track";
import { MEAL_IDS } from "@/lib/meals";

export async function GET() {
  try {
    if (await isGuestVisitor()) return guestJson(guestLogs());
    const { spaceId } = await requireCurrentSpace();
    const rows = await sql`
      SELECT id, date, meal, items, created_at FROM meal_logs
      WHERE space_id = ${spaceId}
      ORDER BY date DESC
      LIMIT 400
    `;
    return NextResponse.json(rows);
  } catch (e) {
    return handleApiError(e);
  }
}

// 按「日期 + 餐次」保存，同一天同一餐重复保存覆盖。日期可以是未来（备餐）。
export async function POST(req: Request) {
  try {
    const { spaceId } = await requireCurrentSpace();
    const log = (await req.json()) as MealLog;
    if (!log.date || !/^\d{4}-\d{2}-\d{2}$/.test(log.date)) throw new ApiError(400, "日期格式不对");
    if (!log.meal || !MEAL_IDS.has(log.meal)) throw new ApiError(400, "选一下早餐、午餐还是晚餐吧");
    if (!Array.isArray(log.items) || log.items.length === 0) throw new ApiError(400, "还没有选菜哦");

    const [row] = await sql`
      INSERT INTO meal_logs (id, space_id, date, meal, items)
      VALUES (${randomUUID()}, ${spaceId}, ${log.date}, ${log.meal}, ${JSON.stringify(log.items)})
      ON CONFLICT (space_id, date, meal) DO UPDATE SET
        items = EXCLUDED.items,
        created_at = now()
      RETURNING id, date, meal, items, created_at
    `;

    // 未来的日期 = 备餐计划（评论区最高赞的功能请求），当天或过去 = 记录刚吃的。
    // 两者的留存含义完全不同，混在一起统计等于没统计。
    const today = new Date().toISOString().slice(0, 10);
    track("meal_log_write", log.date > today ? "plan" : "record");

    return NextResponse.json(row);
  } catch (e) {
    return handleApiError(e);
  }
}
