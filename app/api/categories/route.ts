import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  const rows = await sql`SELECT id, name, sort_order FROM categories ORDER BY sort_order`;
  return NextResponse.json(rows);
}
