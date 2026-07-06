import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin, handleApiError } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();

    const [users] = await sql<{ total: string; today: string; week: string }>`
      SELECT count(*)::text AS total,
             count(*) FILTER (WHERE created_at >= date_trunc('day', now()))::text AS today,
             count(*) FILTER (WHERE created_at >= now() - interval '7 days')::text AS week
      FROM users WHERE phone NOT LIKE 'del_%'
    `;
    const [spaces] = await sql<{ total: string }>`
      SELECT count(*)::text AS total FROM spaces WHERE deleted_at IS NULL
    `;
    // 北极星：成员 ≥2 的空间占比（邀请成功率）
    const [invited] = await sql<{ multi: string }>`
      SELECT count(*)::text AS multi FROM (
        SELECT m.space_id FROM space_members m
        JOIN spaces s ON s.id = m.space_id AND s.deleted_at IS NULL
        GROUP BY m.space_id HAVING count(*) >= 2
      ) t
    `;
    const [sms] = await sql<{ today: string }>`
      SELECT count(*)::text AS today FROM sms_codes
      WHERE created_at >= date_trunc('day', now())
    `;
    const [content] = await sql<{ items: string; logs: string }>`
      SELECT (SELECT count(*) FROM menu_items)::text AS items,
             (SELECT count(*) FROM meal_logs)::text AS logs
    `;
    const [libImages] = await sql<{ count: string }>`
      SELECT count(*)::text AS count FROM library_images
    `;

    const totalSpaces = Number(spaces.total);
    return NextResponse.json({
      users: { total: Number(users.total), today: Number(users.today), week: Number(users.week) },
      spaces: totalSpaces,
      invite_rate: totalSpaces > 0 ? Math.round((Number(invited.multi) / totalSpaces) * 100) : 0,
      sms_today: Number(sms.today),
      menu_items: Number(content.items),
      meal_logs: Number(content.logs),
      library_images: Number(libImages.count),
    });
  } catch (e) {
    return handleApiError(e);
  }
}
