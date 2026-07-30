import { cookies, headers } from "next/headers";
import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { sql } from "./db";
import { GUEST_COOKIE, GUEST_COOKIE_VALUE, GUEST_WRITE_MESSAGE, GUEST_WRITE_STATUS } from "./guest";

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
  // Leaving the tour for real. Without this the 7-day fm_guest outlives the
  // conversion it was meant to produce: the server correctly serves the user's
  // own kitchen, but GuestBar can only see fm_guest (fm_session is httpOnly),
  // so it keeps claiming they are looking at sample data — and /chufang hides
  // the only two links to /settings from guests, which would leave a real user
  // unable to reach their invite code, logout, or account deletion.
  await clearGuestCookie();
  // Secure 标记按实际协议判断，而不是按 NODE_ENV：
  // 备案期内测走 HTTP（IP:3000），带 Secure 会导致浏览器丢弃 cookie、永远登录不上；
  // 上线后 Nginx 转发 https（x-forwarded-proto=https）时自动恢复 Secure。
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: proto === "https",
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
  // A stale fm_guest here is worse than anywhere else: manifest.json starts the
  // PWA at "/", so someone who just logged out — or just deleted their account —
  // would relaunch from the home screen straight into the sample kitchen.
  await clearGuestCookie();
}

/** Both session transitions end the tour; see the callers for why. */
async function clearGuestCookie() {
  (await cookies()).delete(GUEST_COOKIE);
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

/**
 * Guest tour visitor: carries the tour cookie and no session cookie at all.
 *
 * Presence of a session cookie wins, even a stale one whose row is gone —
 * otherwise an fm_guest left over from someone's tour would hide their real
 * kitchen behind sample data. A stale session falls through to the normal 401,
 * which sends them back to /welcome.
 *
 * Deliberately tests for the cookie rather than a valid session, and every
 * other helper in this file does the opposite. Do NOT "align the style" by
 * switching to getAuthUser(): that turns the rule into "has a VALID session",
 * and any logged-in user holding a leftover fm_guest is silently downgraded to
 * the sample kitchen. tsc, eslint and build all pass either way.
 */
export async function isGuestVisitor(): Promise<boolean> {
  const store = await cookies();
  if (store.get(SESSION_COOKIE)) return false;
  return store.get(GUEST_COOKIE)?.value === GUEST_COOKIE_VALUE;
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
 *
 * Guests are rejected here and never get a space id, so no guest request can
 * read or write another kitchen's rows. Read endpoints that are part of the
 * tour serve their fixture BEFORE calling this; every write fails closed with
 * the tour message.
 *
 * Scope of that guarantee: it covers endpoints that come through THIS function.
 * Endpoints guarded only by requireUser() (space/join, library/images,
 * delete-account) return 401 to a guest instead, which apiFetch turns into a
 * bounce to /welcome. When adding an endpoint, pick the guard deliberately.
 */
export async function requireCurrentSpace(): Promise<{ user: AuthUser; spaceId: string }> {
  if (await isGuestVisitor()) throw new ApiError(GUEST_WRITE_STATUS, GUEST_WRITE_MESSAGE);
  const user = await requireUser();
  if (!user.active_space_id) throw new ApiError(403, "NO_SPACE");
  const [member] = await sql<{ banned_at: string | null }>`
    SELECT s.banned_at FROM space_members m
    JOIN spaces s ON s.id = m.space_id AND s.deleted_at IS NULL
    WHERE m.space_id = ${user.active_space_id} AND m.user_id = ${user.id}
  `;
  if (!member) throw new ApiError(403, "NO_SPACE");
  // 被管理员封禁的空间：所有业务接口一律 403，前端落到 onboarding 展示「暂时无法访问」
  if (member.banned_at) throw new ApiError(403, "SPACE_BANNED");
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
