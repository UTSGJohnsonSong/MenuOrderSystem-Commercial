import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { MenuItem } from "@/lib/types";

export async function GET() {
  const rows = await sql`SELECT * FROM menu_items ORDER BY sort_order`;
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const item = (await req.json()) as MenuItem;

  const [row] = await sql`
    INSERT INTO menu_items (id, category_id, name, image_url, ingredients, instructions, notes, is_active, sort_order, created_at, updated_at)
    VALUES (${item.id}, ${item.category_id}, ${item.name}, ${item.image_url}, ${item.ingredients}, ${item.instructions}, ${item.notes}, ${item.is_active}, ${item.sort_order}, ${item.created_at}, ${item.updated_at})
    RETURNING *
  `;
  return NextResponse.json(row);
}
