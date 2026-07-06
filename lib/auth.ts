import { cookies } from "next/headers";
import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { sql } from "./db";

export const SESSION_COOKIE = "fm_session";
const SESSION_DAYS = 180;

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** 创建会话，返回明文 token（数据库只存哈希，拖库也无法伪造登录态） */
export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000);
  await sql`
    INSERT INTO sessions (token_hash, user_id, expires_at)
    VALUES (${hashToken(token)}, ${userId}, ${expires.toISOString()})
  `;
  return token;
}

export async function setSessionCookie(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 3600,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await sql`DELETE FROM sessions WHERE token_hash = ${hashToken(token)}`;
  }
  store.delete(SESSION_COOKIE);
}

export interface AuthUser {
  id: string;
  phone: string;
  nickname: string;
  active_space_id: string | null;
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [row] = await sql<AuthUser & { last_active_at: string | null }>`
    SELECT u.id, u.phone, u.nickname, u.active_space_id, u.last_active_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ${hashToken(token)} AND s.expires_at > now()
  `;
  if (!row) return null;

  // 活跃埋点：12 小时节流，绝大多数请求不产生额外写；失败不影响业务
  const stale = !row.last_active_at ||
    Date.now() - new Date(row.last_active_at).getTime() > 12 * 3600 * 1000;
  if (stale) {
    sql`UPDATE users SET last_active_at = now() WHERE id = ${row.id}`.catch(() => {});
  }
  return { id: row.id, phone: row.phone, nickname: row.nickname, active_space_id: row.active_space_id };
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) throw new ApiError(401, "未登录");
  return user;
}

/**
 * 管理员校验：手机号在 ADMIN_PHONES 白名单（逗号分隔）内。
 * 非管理员返回 404 而不是 403——不向普通用户暴露管理入口的存在。
 */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireUser();
  const whitelist = (process.env.ADMIN_PHONES ?? "")
    .split(",").map(s => s.trim()).filter(Boolean);
  if (!whitelist.includes(user.phone)) throw new ApiError(404, "Not Found");
  return user;
}

/**
 * 所有业务 API 的统一入口：拿到当前用户 + 当前空间。
 * 后续 SQL 一律使用这里返回的 spaceId，绝不信任前端传来的 space_id。
 */
export async function requireCurrentSpace(): Promise<{ user: AuthUser; spaceId: string }> {
  const user = await requireUser();
  if (!user.active_space_id) throw new ApiError(403, "NO_SPACE");
  const [member] = await sql`
    SELECT 1 AS ok FROM space_members m
    JOIN spaces s ON s.id = m.space_id AND s.deleted_at IS NULL
    WHERE m.space_id = ${user.active_space_id} AND m.user_id = ${user.id}
  `;
  if (!member) throw new ApiError(403, "NO_SPACE");
  return { user, spaceId: user.active_space_id };
}

/** 校验分类存在且属于当前空间，防止 NOT NULL 500 和跨空间分类引用 */
export async function requireCategoryInSpace(categoryId: string | null | undefined, spaceId: string) {
  if (!categoryId) throw new ApiError(400, "请选择分类");
  const [cat] = await sql`
    SELECT 1 AS ok FROM categories WHERE id = ${categoryId} AND space_id = ${spaceId}
  `;
  if (!cat) throw new ApiError(400, "分类不存在");
}

export function handleApiError(e: unknown): NextResponse {
  if (e instanceof ApiError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  console.error("[api]", e);
  return NextResponse.json({ error: "服务器开小差了，请稍后再试" }, { status: 500 });
}

/** 手机号脱敏展示：138****1234 */
export function maskPhone(phone: string) {
  return phone.length === 11 ? `${phone.slice(0, 3)}****${phone.slice(7)}` : phone;
}

export function isValidPhone(phone: string) {
  return /^1[3-9]\d{9}$/.test(phone);
}
