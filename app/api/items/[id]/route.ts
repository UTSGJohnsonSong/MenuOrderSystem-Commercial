import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { MenuItem } from "@/lib/types";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = (await req.json()) as MenuItem;

  const [row] = await sql`
    UPDATE menu_items SET
      category_id = ${item.category_id},
      name = ${item.name},
      image_url = ${item.image_url},
      ingredients = ${item.ingredients},
      instructions = ${item.instructions},
      notes = ${item.notes},
      is_active = ${item.is_active},
      sort_order = ${item.sort_order},
      updated_at = ${item.updated_at}
    WHERE id = ${id}
    RETURNING *
  `;
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await sql`DELETE FROM menu_items WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
