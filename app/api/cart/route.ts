import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  const rows = await sql`SELECT item_id, quantity FROM cart_items`;
  return NextResponse.json(rows);
}

// body: { item_id, delta? } increments/decrements, or { item_id, quantity } sets absolute value
export async function POST(req: Request) {
  const body = (await req.json()) as { item_id: string; delta?: number; quantity?: number };

  let nextQty: number;
  if (body.quantity !== undefined) {
    nextQty = body.quantity;
  } else {
    const [existing] = await sql`SELECT quantity FROM cart_items WHERE item_id = ${body.item_id}`;
    nextQty = (existing?.quantity ?? 0) + (body.delta ?? 0);
  }

  if (nextQty <= 0) {
    await sql`DELETE FROM cart_items WHERE item_id = ${body.item_id}`;
  } else {
    await sql`
      INSERT INTO cart_items (item_id, quantity) VALUES (${body.item_id}, ${nextQty})
      ON CONFLICT (item_id) DO UPDATE SET quantity = ${nextQty}
    `;
  }

  const rows = await sql`SELECT item_id, quantity FROM cart_items`;
  return NextResponse.json(rows);
}

// clear cart
export async function DELETE() {
  await sql`DELETE FROM cart_items`;
  return NextResponse.json({ ok: true });
}
