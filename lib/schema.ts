import { sql } from "./db";

/*
 * 建表全部幂等（IF NOT EXISTS），服务启动时自动执行（见 instrumentation.ts），
 * 也可以手动跑 `npm run db:setup`。
 * 单实例部署下并发安全；以后横向扩容多实例时改为部署前手动跑迁移。
 */
export async function ensureSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      phone           TEXT UNIQUE NOT NULL,
      nickname        TEXT NOT NULL DEFAULT '',
      active_space_id UUID,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS spaces (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name         TEXT NOT NULL DEFAULT '我们的小厨房',
      invite_code  TEXT UNIQUE NOT NULL,
      member_limit INT NOT NULL DEFAULT 8,
      owner_id     UUID NOT NULL REFERENCES users(id),
      deleted_at   TIMESTAMPTZ,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS space_members (
      space_id  UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
      user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role      TEXT NOT NULL DEFAULT 'member',
      joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (space_id, user_id)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_space_members_user ON space_members(user_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)`;

  await sql`
    CREATE TABLE IF NOT EXISTS sms_codes (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      phone      TEXT NOT NULL,
      code       TEXT NOT NULL,
      attempts   INT NOT NULL DEFAULT 0,
      used       BOOLEAN NOT NULL DEFAULT false,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_sms_codes_phone ON sms_codes(phone, created_at DESC)`;

  // 分类 id 沿用语义化 slug（zaochan/zhushi...，前端图标映射依赖它），
  // 所以主键是 (space_id, id) 复合键，每个空间一套
  await sql`
    CREATE TABLE IF NOT EXISTS categories (
      space_id   UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
      id         TEXT NOT NULL,
      name       TEXT NOT NULL,
      sort_order INT NOT NULL,
      PRIMARY KEY (space_id, id)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS menu_items (
      id          TEXT PRIMARY KEY,
      space_id    UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
      category_id TEXT NOT NULL,
      name        TEXT NOT NULL,
      image_url   TEXT NOT NULL DEFAULT '',
      ingredients TEXT NOT NULL DEFAULT '',
      instructions TEXT NOT NULL DEFAULT '',
      notes       TEXT NOT NULL DEFAULT '',
      is_active   BOOLEAN NOT NULL DEFAULT true,
      is_archived BOOLEAN NOT NULL DEFAULT false,
      sort_order  INT NOT NULL DEFAULT 0,
      created_by  UUID REFERENCES users(id),
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      FOREIGN KEY (space_id, category_id) REFERENCES categories(space_id, id) ON DELETE CASCADE
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_menu_items_space ON menu_items(space_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS meal_logs (
      id         TEXT PRIMARY KEY,
      space_id   UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
      date       TEXT NOT NULL,
      items      JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (space_id, date)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_meal_logs_space ON meal_logs(space_id, date DESC)`;
}
