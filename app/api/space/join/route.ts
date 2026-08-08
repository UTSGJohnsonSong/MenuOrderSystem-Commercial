import { NextResponse } from "next/server";
import { requireUser, handleApiError, ApiError } from "@/lib/auth";
import { joinSpaceByCode } from "@/lib/space";
import { track } from "@/lib/track";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { code } = (await req.json()) as { code?: string };
    if (!code || !code.trim()) throw new ApiError(400, "请输入邀请码");
    const space = await joinSpaceByCode(user.id, code);

    // 北极星指标（注册后 48h 邀请成功率）的分子。这条路径是"已经注册的人
    // 后来输了邀请码"；注册时就带码的那条在 auth/verify 里单独打。
    track("invite_accepted", "code");

    return NextResponse.json({ ok: true, space: { id: space.id, name: space.name } });
  } catch (e) {
    return handleApiError(e);
  }
}
