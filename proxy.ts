import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/welcome", "/login", "/join", "/privacy", "/terms", "/install"];

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
    return NextResponse.redirect(new URL("/welcome", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // 只拦页面导航；API、静态资源、图标等一律放行
  matcher: ["/((?!api|_next|favicon\\.ico|manifest\\.json|sw\\.js|icon|apple-icon|.*\\.(?:png|jpg|svg|ico)).*)"],
};
