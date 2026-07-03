import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireCurrentSpace, handleApiError } from "@/lib/auth";

export async function GET() {
  try {
    const { spaceId } = await requireCurrentSpace();
    const rows = await sql`
      SELECT id, name, sort_order FROM categories
      WHERE space_id = ${spaceId}
      ORDER BY sort_order
    `;
    return NextResponse.json(rows);
  } catch (e) {
    return handleApiError(e);
  }
}
