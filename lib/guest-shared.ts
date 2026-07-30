/*
 * Guest tour constants shared by both sides of the wire.
 *
 * Kept apart from lib/guest.ts because that module imports next/server and so
 * can never be pulled into a client component. Nothing here imports anything.
 */

/* Not a credential: carries no identity, is not signed, and unlocks nothing
 * beyond the static fixtures in lib/guest.ts. Readable by client script on
 * purpose so the tour bar needs no extra round trip. */
export const GUEST_COOKIE = "fm_guest";
export const GUEST_COOKIE_VALUE = "1";
export const GUEST_MAX_AGE = 7 * 24 * 3600;

/* 403 is taken: lib/store.ts treats it as "no space yet" and redirects to
 * /onboarding, which would throw the guest out mid-tour instead of showing the
 * copy below. 422 falls through to each page's own error surface. */
export const GUEST_WRITE_STATUS = 422;
export const GUEST_WRITE_MESSAGE = "现在是参观模式，只能看看～注册之后就能自己加菜啦";

/*
 * Pages a tour visitor may open. Read by proxy.ts (which admits them) and by
 * GuestBar (which decides where the tour bar shows) — one list, because the two
 * drift in both directions and both hurt: a page in proxy.ts only strands the
 * visitor with no bar and therefore no way out, and a page here only means the
 * bar never renders because proxy already bounced them to /welcome.
 *
 * Exact matches. /settings, /onboarding, /manage and /admin stay behind the
 * session gate. /cart is a redirect to "/" (app/cart/page.tsx) so it needs no
 * bottom offset of its own.
 */
export const GUEST_PATHS = ["/", "/cart", "/shiji", "/chufang", "/chufang/library"];
