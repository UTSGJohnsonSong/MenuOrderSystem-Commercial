import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin, handleApiError } from "@/lib/auth";

// 「今日」统一按北京时间换天（服务器/数据库是 UTC，直接 date_trunc 会到早上 8 点才算新的一天）
const TZ = "Asia/Shanghai";

export async function GET() {
  try {
    await requireAdmin();

    const [users] = await sql<{ total: string; today: string; week: string }>`
      SELECT count(*)::text AS total,
             count(*) FILTER (WHERE created_at AT TIME ZONE ${TZ} >= date_trunc('day', now() AT TIME ZONE ${TZ}))::text AS today,
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
      WHERE created_at AT TIME ZONE ${TZ} >= date_trunc('day', now() AT TIME ZONE ${TZ})
    `;
    const [content] = await sql<{ items: string; logs: string }>`
      SELECT (SELECT count(*) FROM menu_items)::text AS items,
             (SELECT count(*) FROM meal_logs)::text AS logs
    `;
    const [libImages] = await sql<{ count: string }>`
      SELECT count(*)::text AS count FROM library_images
    `;

    // 留存与周活（口径见 Obsidian《12 指标体系与埋点方案》）：
    // D7 = 注册满 7 天的人里，最近 7 天内活跃过的占比；D30 同理放宽到 30 天
    const [retention] = await sql<{
      d7_base: string; d7_active: string; d30_base: string; d30_active: string; wau: string;
    }>`
      SELECT
        count(*) FILTER (WHERE created_at <= now() - interval '7 days')::text AS d7_base,
        count(*) FILTER (WHERE created_at <= now() - interval '7 days'
                           AND last_active_at >= now() - interval '7 days')::text AS d7_active,
        count(*) FILTER (WHERE created_at <= now() - interval '30 days')::text AS d30_base,
        count(*) FILTER (WHERE created_at <= now() - interval '30 days'
                           AND last_active_at >= now() - interval '30 days')::text AS d30_active,
        count(*) FILTER (WHERE last_active_at >= now() - interval '7 days')::text AS wau
      FROM users WHERE phone NOT LIKE 'del_%'
    `;

    // 近 14 天每日明细：落地页访问 / 注册 / 来源分布
    const dailyViews = await sql<{ day: string; views: string }>`
      SELECT to_char(created_at AT TIME ZONE ${TZ}, 'YYYY-MM-DD') AS day, count(*)::text AS views
      FROM events
      WHERE name = 'welcome_view' AND created_at >= now() - interval '15 days'
      GROUP BY 1
    `;
    const dailyRegs = await sql<{ day: string; source: string; count: string }>`
      SELECT to_char(created_at AT TIME ZONE ${TZ}, 'YYYY-MM-DD') AS day,
             source, count(*)::text AS count
      FROM users
      WHERE phone NOT LIKE 'del_%' AND created_at >= now() - interval '15 days'
      GROUP BY 1, 2
    `;

    // 组装成连续 14 天（无数据的日子也要有一行，一眼看出「今天没人来」）
    const viewMap = new Map(dailyViews.map(r => [r.day, Number(r.views)]));
    const regMap = new Map<string, { total: number; sources: Map<string, number> }>();
    for (const r of dailyRegs) {
      const entry = regMap.get(r.day) ?? { total: 0, sources: new Map() };
      entry.total += Number(r.count);
      const label = r.source || "直接";
      entry.sources.set(label, (entry.sources.get(label) ?? 0) + Number(r.count));
      regMap.set(r.day, entry);
    }
    const beijingNow = new Date(Date.now() + 8 * 3600 * 1000); // 只取日期用，Asia/Shanghai 无夏令时
    const daily = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(beijingNow.getTime() - i * 24 * 3600 * 1000);
      const day = d.toISOString().slice(0, 10);
      const views = viewMap.get(day) ?? 0;
      const reg = regMap.get(day);
      const regs = reg?.total ?? 0;
      return {
        day,
        views,
        regs,
        conversion: views > 0 ? Math.round((regs / views) * 100) : null,
        sources: reg
          ? [...reg.sources.entries()].sort((a, b) => b[1] - a[1])
              .map(([s, n]) => `${s} ×${n}`).join(", ")
          : "",
      };
    });

    const totalSpaces = Number(spaces.total);
    const d7Base = Number(retention.d7_base);
    const d30Base = Number(retention.d30_base);
    const today = daily[0];
    return NextResponse.json({
      users: { total: Number(users.total), today: Number(users.today), week: Number(users.week) },
      spaces: totalSpaces,
      invite_rate: totalSpaces > 0 ? Math.round((Number(invited.multi) / totalSpaces) * 100) : 0,
      sms_today: Number(sms.today),
      menu_items: Number(content.items),
      meal_logs: Number(content.logs),
      library_images: Number(libImages.count),
      d7_retention: d7Base > 0 ? Math.round((Number(retention.d7_active) / d7Base) * 100) : null,
      d30_retention: d30Base > 0 ? Math.round((Number(retention.d30_active) / d30Base) * 100) : null,
      wau: Number(retention.wau),
      conversion_today: today.conversion,
      daily,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
