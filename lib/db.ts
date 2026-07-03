import { Pool, PoolClient } from "pg";

/*
 * 通用 Postgres 连接池（node-postgres）。
 * 之前用的 @neondatabase/serverless 只能连 Neon；换成 pg 后
 * 国内云数据库（腾讯云/阿里云 RDS、自建 Docker Postgres）都能用。
 * sql`` 保持和 neon 相同的 tagged-template 用法，返回行数组。
 */

declare global {
  // dev 热重载时复用同一个连接池，避免连接泄漏
  var __pgPool: Pool | undefined;
}

function createPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}

const pool = global.__pgPool ?? createPool();
if (process.env.NODE_ENV !== "production") global.__pgPool = pool;

type Queryable = Pool | PoolClient;

function makeSql(runner: Queryable) {
  return async function sql<T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]> {
    let text = strings[0];
    for (let i = 0; i < values.length; i++) {
      text += `$${i + 1}` + strings[i + 1];
    }
    const res = await runner.query(text, values as unknown[]);
    return res.rows as T[];
  };
}

export const sql = makeSql(pool);

export type Sql = ReturnType<typeof makeSql>;

/** 事务：回调里的 sql 都跑在同一个连接上，抛错自动回滚 */
export async function withTransaction<T>(fn: (sql: Sql) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(makeSql(client));
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
