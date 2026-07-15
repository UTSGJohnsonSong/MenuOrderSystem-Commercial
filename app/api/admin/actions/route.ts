import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin, handleApiError, maskPhone } from "@/lib/auth";

// 操作日志：admin_actions 倒序，自证清白用
export async function GET() {
  try {
    await requireAdmin();
    const rows = await sql<{
      id: string; action: string; note: string; created_at: string;
      admin_phone: string | null; space_name: string | null; invite_code: string | null;
    }>`
      SELECT a.id, a.action, a.note, a.created_at,
             u.phone AS admin_phone, s.name AS space_name, s.invite_code
      FROM admin_actions a
      LEFT JOIN users u ON u.id = a.admin_user_id
      LEFT JOIN spaces s ON s.id = a.space_id
      ORDER BY a.created_at DESC
      LIMIT 200
    `;
    return NextResponse.json({
      actions: rows.map(r => ({
        id: r.id,
        action: r.action,
        note: r.note,
        at: r.created_at,
        admin: r.admin_phone ? maskPhone(r.admin_phone) : "—",
        space: r.space_name ? `${r.space_name}（${r.invite_code}）` : "—",
      })),
    });
  } catch (e) {
    return handleApiError(e);
  }
}
