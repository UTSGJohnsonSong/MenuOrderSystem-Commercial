import { sql } from "./db";

/** 管理操作留痕：所有 /api/admin 下的写操作都必须调用（自证清白用） */
export async function logAdminAction(
  adminUserId: string,
  spaceId: string | null,
  action: "reset_invite" | "ban_space" | "restore_space" | "delete_user" | "mark_paid" | "refund",
  note = "",
) {
  await sql`
    INSERT INTO admin_actions (admin_user_id, space_id, action, note)
    VALUES (${adminUserId}, ${spaceId}, ${action}, ${note})
  `;
}
