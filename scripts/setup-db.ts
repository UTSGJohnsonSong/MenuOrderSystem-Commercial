import { readFileSync, existsSync } from "fs";
import path from "path";

// 手动建表入口（服务启动时 instrumentation.ts 也会自动建）：npm run db:setup
const envPath = path.join(__dirname, "..", ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)="?(.*?)"?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

if (!process.env.DATABASE_URL) {
  console.error("缺少 DATABASE_URL（.env.local 或环境变量）");
  process.exit(1);
}

import("../lib/schema").then(async ({ ensureSchema }) => {
  await ensureSchema();
  console.log("数据库表结构就绪。");
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
