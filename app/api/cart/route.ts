import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  const rows = await sql`SELECT item_id, quantity FROM cart_items`;
  return NextResponse.json(rows);
}

// body: { item_id, delta? } increments/decrements, or { item_id, quantity } sets absolute value
export async function POST(req: Request) {
  const body = (await req.json()) as { item_id: string; delta?: number; quantity?: number };

  if (body.quantity !== undefined) {
    // 绝对值设置（如清零）
    if (body.quantity <= 0) {
      await sql`DELETE FROM cart_items WHERE item_id = ${body.item_id}`;
    } else {
      await sql`
        INSERT INTO cart_items (item_id, quantity) VALUES (${body.item_id}, ${body.quantity})
        ON CONFLICT (item_id) DO UPDATE SET quantity = ${body.quantity}
      `;
    }
  } else {
    // 增量更新：用数据库原子运算，避免多人/连续点击时读旧值导致计数被覆盖
    const delta = body.delta ?? 0;
    await sql`
      INSERT INTO cart_items (item_id, quantity) VALUES (${body.item_id}, ${delta})
      ON CONFLICT (item_id) DO UPDATE SET quantity = cart_items.quantity + ${delta}
    `;
    await sql`DELETE FROM cart_items WHERE item_id = ${body.item_id} AND quantity <= 0`;
  }

  const rows = await sql`SELECT item_id, quantity FROM cart_items`;
  return NextResponse.json(rows);
}

// clear cart
export async function DELETE() {
  await sql`DELETE FROM cart_items`;
  return NextResponse.json({ ok: true });
}
