import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import path from "path";
import { DEFAULT_CATEGORIES, DEFAULT_ITEMS } from "../lib/data";

const envPath = path.join(__dirname, "..", ".env.local");
for (const line of readFileSync(envPath, "utf-8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)="?(.*?)"?$/);
  if (m) process.env[m[1]] = m[2];
}

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  console.log("Creating tables...");

  await sql`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sort_order INT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS menu_items (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      image_url TEXT NOT NULL DEFAULT '',
      ingredients TEXT NOT NULL DEFAULT '',
      instructions TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      is_active BOOLEAN NOT NULL DEFAULT true,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS cart_items (
      item_id TEXT PRIMARY KEY REFERENCES menu_items(id) ON DELETE CASCADE,
      quantity INT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS meal_logs (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL UNIQUE,
      items JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  console.log("Seeding categories...");
  for (const cat of DEFAULT_CATEGORIES) {
    await sql`
      INSERT INTO categories (id, name, sort_order)
      VALUES (${cat.id}, ${cat.name}, ${cat.sort_order})
      ON CONFLICT (id) DO NOTHING
    `;
  }

  console.log("Seeding menu items...");
  for (const item of DEFAULT_ITEMS) {
    await sql`
      INSERT INTO menu_items (id, category_id, name, image_url, ingredients, instructions, notes, is_active, sort_order, created_at, updated_at)
      VALUES (${item.id}, ${item.category_id}, ${item.name}, ${item.image_url}, ${item.ingredients}, ${item.instructions}, ${item.notes}, ${item.is_active}, ${item.sort_order}, ${item.created_at}, ${item.updated_at})
      ON CONFLICT (id) DO NOTHING
    `;
  }

  console.log("Done.");
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
