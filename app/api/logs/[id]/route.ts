import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireCurrentSpace, handleApiError } from "@/lib/auth";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { spaceId } = await requireCurrentSpace();
    const { id } = await params;
    await sql`DELETE FROM meal_logs WHERE id = ${id} AND space_id = ${spaceId}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
