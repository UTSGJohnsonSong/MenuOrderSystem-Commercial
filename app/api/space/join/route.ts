import { NextResponse } from "next/server";
import { requireUser, handleApiError, ApiError } from "@/lib/auth";
import { joinSpaceByCode } from "@/lib/space";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { code } = (await req.json()) as { code?: string };
    if (!code || !code.trim()) throw new ApiError(400, "请输入邀请码");
    const space = await joinSpaceByCode(user.id, code);
    return NextResponse.json({ ok: true, space: { id: space.id, name: space.name } });
  } catch (e) {
    return handleApiError(e);
  }
}
