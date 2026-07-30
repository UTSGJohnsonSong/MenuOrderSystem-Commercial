"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GUEST_COOKIE, GUEST_COOKIE_VALUE, GUEST_PATHS } from "@/lib/guest-shared";

/*
 * The tour bar: tells a guest that what they are touching is a sample, and
 * gives them somewhere to go. Sits directly above BottomNav on the GUEST_PATHS
 * routes and nowhere else.
 *
 * The CTA lands on /welcome, NOT /login: signing up needs an SMS code and that
 * channel is still being filed, so pointing at /login would walk every visitor
 * into a dead end. Point it at /login once codes actually send.
 */

const TOUR_PATHS = new Set(GUEST_PATHS);

/** Height of the bar. Pages that place their own fixed furniture add this to
 *  their bottom offsets so nothing ends up underneath it — see the navH
 *  expressions in the tour pages. */
export const GUEST_BAR_H: `${number}px` = "44px";

/* Nothing clears this cookie mid-document: entering the tour is a full page
 * load, and the only thing that ends a tour is setSessionCookie /
 * destroySession on the server. Hence a subscribe that never fires — revisit if
 * an in-page "leave the tour" button ever lands. */
const subscribe = () => () => {};

const readTour = () => {
  // Throws on an opaque origin / with cookies fully blocked, and this runs
  // during render — an unguarded throw here is a white screen, the same class
  // of failure as commit 7d11199. See also components/SourceTracker.tsx.
  try {
    return document.cookie.split("; ").includes(`${GUEST_COOKIE}=${GUEST_COOKIE_VALUE}`);
  } catch {
    return false;
  }
};

const noTourOnServer = () => false;

/**
 * Whether this visitor is on the guest tour.
 *
 * useSyncExternalStore rather than an effect: document.cookie is external state,
 * this is the hook built for reading it, and the server snapshot keeps the first
 * client render matching the HTML. Reading it in an effect would trip
 * react-hooks/set-state-in-effect, already an error elsewhere in this repo.
 */
export function useGuestTour(): boolean {
  return useSyncExternalStore(subscribe, readTour, noTourOnServer);
}

export default function GuestBar() {
  const guest = useGuestTour();
  const pathname = usePathname();
  if (!guest || !TOUR_PATHS.has(pathname)) return null;

  return (
    <div style={{
      position: "fixed",
      // 60px is BottomNav's inner height; pages reserve 56px, so measuring off
      // the nav rather than off the pages keeps the bar clear of both.
      bottom: "calc(60px + env(safe-area-inset-bottom))",
      left: "50%",
      transform: "translateX(-50%)",
      width: "100%",
      maxWidth: "480px",
      height: GUEST_BAR_H,
      zIndex: 49,
      backgroundColor: "#FFF6E6",
      borderTop: "1px solid #F6E5CC",
      boxShadow: "0 -2px 12px rgba(120,80,40,0.05)",
      display: "flex", alignItems: "center", gap: "10px",
      padding: "0 12px 0 16px",
    }}>
      <span style={{
        flex: 1, minWidth: 0,
        color: "#8E7458", fontSize: "0.75rem", lineHeight: 1.35,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        正在参观示例小厨房 · 随便翻，改不了
      </span>
      <Link href="/welcome" style={{
        flexShrink: 0,
        height: "30px", padding: "0 14px", borderRadius: "999px",
        display: "flex", alignItems: "center",
        background: "linear-gradient(180deg, #F5B460 0%, #E8991E 100%)",
        boxShadow: "0 3px 10px rgba(232,153,30,0.28)",
        color: "#FFFFFF", fontSize: "0.75rem", fontWeight: 700,
        letterSpacing: "0.03em", textDecoration: "none",
      }}>
        我也要一个
      </Link>
    </div>
  );
}
