import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await sql`DELETE FROM meal_logs WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
