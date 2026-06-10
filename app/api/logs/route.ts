import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { MealLog } from "@/lib/types";

export async function GET() {
  const rows = await sql`SELECT * FROM meal_logs ORDER BY date DESC`;
  return NextResponse.json(rows);
}

// upsert by date
export async function POST(req: Request) {
  const log = (await req.json()) as MealLog;

  const [row] = await sql`
    INSERT INTO meal_logs (id, date, items, created_at)
    VALUES (${log.id}, ${log.date}, ${JSON.stringify(log.items)}, ${log.created_at})
    ON CONFLICT (date) DO UPDATE SET
      items = EXCLUDED.items,
      created_at = EXCLUDED.created_at
    RETURNING *
  `;
  return NextResponse.json(row);
}
