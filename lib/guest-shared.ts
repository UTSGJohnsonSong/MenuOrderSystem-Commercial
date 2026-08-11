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

/* 加菜、点菜、存食记在参观模式下**是可以的**——它们不走网络，直接落在
 * localStorage（lib/guest-local.ts）。所以这句话不能再写「只能看看」。
 *
 * 现在还会撞到 422 的只剩换封面（PATCH /api/space）：裁剪器输出 1200 宽的图，
 * 一张就可能吃掉 localStorage 配额的一大块，所以刻意没有本地化。
 * 文案因此收窄到「封面」这一件事，而不是泛指所有写操作。 */
export const GUEST_WRITE_MESSAGE = "参观模式换不了封面呀～注册之后就能换成你们自己的照片";

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
