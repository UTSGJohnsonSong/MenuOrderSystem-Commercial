import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { GUEST_COOKIE, GUEST_COOKIE_VALUE, GUEST_PATHS } from "@/lib/guest-shared";

const PUBLIC_PATHS = ["/welcome", "/login", "/join", "/privacy", "/terms", "/install"];

/*
 * GUEST_PATHS is shared with GuestBar — see lib/guest-shared.ts for the list and
 * why it is not duplicated. Importing a constants-only module here is fine: the
 * proxy docs warn against relying on shared *state*, and their own auth example
 * imports a helper. Sample data for the tour: lib/guest.ts.
 *
 * /chufang/library is on the list because its dishes are a static array in
 * lib/library.ts, not database rows; the only thing that page fetches is the
 * admin-curated image map, which returns 401 for a guest and degrades to no
 * photos.
 */

/*
 * 轻量守门：没有会话 cookie 的访客直接送去落地页。
 * 这里只看 cookie 存在与否（proxy 里不查数据库）；
 * 真正的鉴权在每个 API route 的 requireCurrentSpace() 里。
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }
  if (!request.cookies.get("fm_session")) {
    // Value equality, matching isGuestVisitor() and GuestBar: admitting any
    // fm_guest value would let a page load and then have every read 401 into a
    // bounce, which reads as a broken app rather than a closed door.
    const guest = request.cookies.get(GUEST_COOKIE)?.value === GUEST_COOKIE_VALUE;
    if (guest && GUEST_PATHS.includes(pathname)) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/welcome", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // 只拦页面导航；API、静态资源、图标等一律放行
  matcher: ["/((?!api|_next|favicon\\.ico|manifest\\.json|sw\\.js|icon|apple-icon|.*\\.(?:png|jpg|svg|ico)).*)"],
};
