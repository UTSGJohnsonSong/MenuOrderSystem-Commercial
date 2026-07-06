import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { handleApiError, ApiError } from "@/lib/auth";

// 邀请链接落地页用：根据邀请码展示空间名字和是否满员（不需要登录）
export async function GET(req: Request) {
  try {
    const code = new URL(req.url).searchParams.get("code")?.trim().toUpperCase();
    if (!code || !/^[0-9A-Z]{6}$/.test(code)) throw new ApiError(400, "邀请码好像不太对，检查一下再试试？");

    const [space] = await sql<{ name: string; member_limit: number; member_count: string }>`
      SELECT s.name, s.member_limit,
             (SELECT count(*) FROM space_members m WHERE m.space_id = s.id)::text AS member_count
      FROM spaces s
      WHERE s.invite_code = ${code} AND s.deleted_at IS NULL
    `;
    if (!space) throw new ApiError(404, "这个邀请码好像过期啦，问问小厨房主人要一个新的吧");

    return NextResponse.json({
      name: space.name,
      full: Number(space.member_count) >= space.member_limit,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
