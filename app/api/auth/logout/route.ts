import { NextResponse } from "next/server";
import { destroySession, handleApiError } from "@/lib/auth";

export async function POST() {
  try {
    await destroySession();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
