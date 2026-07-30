import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql } from "@/lib/db";
import { handleApiError } from "@/lib/auth";
import { GUEST_COOKIE, GUEST_COOKIE_VALUE, GUEST_MAX_AGE } from "@/lib/guest";

/*
 * Enter / leave the guest tour. No auth: the cookie carries no identity and
 * unlocks nothing but the fixtures in lib/guest.ts.
 */
export async function POST() {
  try {
    const store = await cookies();
    const returning = store.get(GUEST_COOKIE)?.value === GUEST_COOKIE_VALUE;

    store.set(GUEST_COOKIE, GUEST_COOKIE_VALUE, {
      httpOnly: false, // GuestBar reads it; rationale in lib/guest-shared.ts
      sameSite: "lax",
      path: "/",
      maxAge: GUEST_MAX_AGE,
    });

    /* Funnel metric, counted once per browser so the number means "tours
     * started" rather than "times the link was tapped".
     *
     * It is NOT a flood guard: `returning` comes from the request's own cookies,
     * so a caller that never sends one inserts a row per call. This endpoint
     * takes no auth, exactly like /api/events — rate limiting is still an open
     * item (C10 in the plan: throttle unauthenticated writes). Do not treat this
     * conditional as protection.
     *
     * Fire-and-forget: awaiting would put a DB round trip in front of the least
     * committed visitor in the funnel, and a metric must never keep anyone out.
     * Logged rather than swallowed so a renamed table cannot read as zero tours
     * forever. Nothing surfaces guest_enter yet — /api/admin/overview only
     * aggregates welcome_view. */
    if (!returning) {
      sql`INSERT INTO events (name, meta) VALUES ('guest_enter', '')`
        .catch(e => console.error("[guest] enter metric failed", e));
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}

/* No caller today: a tour ends server-side instead, in setSessionCookie and
 * destroySession (lib/auth.ts), which is what a converting or logging-out user
 * actually goes through. Kept for an in-page "leave the tour" affordance. */
export async function DELETE() {
  try {
    (await cookies()).delete(GUEST_COOKIE);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
