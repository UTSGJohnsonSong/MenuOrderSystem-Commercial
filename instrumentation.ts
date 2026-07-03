export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  if (process.env.AUTO_MIGRATE !== "0") {
    const { ensureSchema } = await import("./lib/schema");
    await ensureSchema();
    console.log("[db] schema ready");
  }

  // 过期数据清理：会话和短信验证码，每 6 小时一次
  const { sql } = await import("./lib/db");
  const cleanup = async () => {
    try {
      await sql`DELETE FROM sessions WHERE expires_at < now()`;
      await sql`DELETE FROM sms_codes WHERE created_at < now() - interval '7 days'`;
    } catch (e) {
      console.error("[cleanup]", e);
    }
  };
  cleanup();
  setInterval(cleanup, 6 * 3600 * 1000);
}
