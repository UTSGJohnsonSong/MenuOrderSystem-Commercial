"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SourceTracker from "@/components/SourceTracker";
import { GUEST_COOKIE, GUEST_COOKIE_VALUE } from "@/lib/guest-shared";
import { ContactRing, KitchenScene, SteamLayer, useEntryCanvas } from "@/components/EntryScene";

/*
 * Landing page for signed-out visitors.
 * Shows the ICP licence number in the footer — required on the homepage of a
 * filed mainland domain.
 *
 * Tapping the simmering pot lid (or either button) plays the steam handoff:
 * the scene sinks toward its position on /login while fog fills the screen,
 * and we navigate at peak density so the route swap is never visible.
 */

/* Navigate once the fog is opaque. Measured against the puff timings in
 * globals.css — earlier than this and the swap shows through. */
const HANDOFF_MS = 950;
const REDUCED_HANDOFF_MS = 60;

export default function WelcomePage() {
  const icp = process.env.NEXT_PUBLIC_ICP_NUMBER;
  const router = useRouter();
  useEntryCanvas();

  const rootRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const [ring, setRing] = useState<{ x: number; y: number } | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [k, setK] = useState(1);

  /* The sink distance is measured, never hard-coded: it depends on the
   * subtitle's line-height, and PingFang / HarmonyOS / Noto each resolve
   * `normal` differently — a 3px error reads as a misaligned jump, which is
   * worse than a 30px one. */
  useEffect(() => {
    const place = () => {
      const root = rootRef.current, scene = sceneRef.current;
      if (!root || !scene) return;
      const rootBox = root.getBoundingClientRect();
      const sceneBox = scene.getBoundingClientRect();
      const s = sceneBox.width / 320;
      // Land with viewBox row 186 (the login crop's bottom edge) on the screen bottom.
      const sink = rootBox.height - (sceneBox.top - rootBox.top + 186 * s);
      root.style.setProperty("--ktn-sink", `${Math.round(sink)}px`);
      setK(rootBox.width / 375);
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, []);

  /* Cleared on unmount: without this, tapping the lid and then a footer link
   * drops the user onto /terms and yanks them to /login a second later. */
  const jump = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(jump.current), []);

  const go = useCallback((x?: number, y?: number) => {
    if (leaving || jump.current !== undefined) return;
    setLeaving(true);
    const root = rootRef.current;
    if (root && x != null && y != null) {
      const box = root.getBoundingClientRect();
      setRing({ x: x - box.left, y: y - box.top });
    }
    if (navigator.vibrate) {
      try { navigator.vibrate(12); } catch { /* unsupported, ignore */ }
    }
    const quiet = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    jump.current = window.setTimeout(() => {
      // Written here rather than up-front: if the user reaches another page
      // before the handoff fires, the flag would survive and make some later
      // visit to /login burst into fog for no reason.
      try { sessionStorage.setItem("ktn-enter", "1"); } catch { /* private mode */ }
      router.push("/login");
    }, quiet ? REDUCED_HANDOFF_MS : HANDOFF_MS);
  }, [leaving, router]);

  const linkGo = (e: React.MouseEvent) => { e.preventDefault(); go(); };

  /* Guest tour. The POST exists for the funnel counter in app/api/guest — the
   * cookie is not httpOnly, so setting it here in the browser would work too.
   * window.location rather than router.push: a full document load is what makes
   * proxy.ts see the cookie on the very first request for "/".
   * Ignored while the steam handoff is running: that timer already owns the
   * navigation, and two of them racing lands the visitor on the wrong page. */
  const [tourState, setTourState] = useState<"idle" | "busy" | "error" | "blocked">("idle");

  const enterTour = async () => {
    if (leaving || jump.current !== undefined || tourState === "busy") return;
    setTourState("busy");
    try {
      const res = await fetch("/api/guest", { method: "POST" });
      if (!res.ok) throw new Error(`guest cookie refused: ${res.status}`);
      /* Confirm the cookie actually landed before navigating. WeChat's in-app
       * browser and Safari's "Block All Cookies" drop it silently, and then
       * proxy.ts bounces "/" straight back to here — an invisible loop the
       * visitor can repeat forever. Same class of failure as commit 7d11199. */
      if (!document.cookie.split("; ").includes(`${GUEST_COOKIE}=${GUEST_COOKIE_VALUE}`)) {
        setTourState("blocked");
        return;
      }
      window.location.href = "/";
    } catch (e) {
      console.error("[welcome] could not start the tour", e);
      setTourState("error");
    }
  };

  return (
    <div
      ref={rootRef}
      className={leaving ? "ktn-go" : "ktn-idle"}
      style={{
        height: "100%", position: "relative", overflow: "hidden",
        display: "flex", flexDirection: "column",
        background: "linear-gradient(180deg, #FFFDF8 0%, #FFF3E0 100%)",
      }}
    >
      <SourceTracker />

      <div
        className="ktn-hero"
        style={{
          flex: "none", zIndex: 3, padding: "var(--ktn-top) 28px 0",
          display: "flex", flexDirection: "column", alignItems: "center",
        }}
      >
        <img
          src="/icon-192.png"
          decoding="async"
          alt=""
          className="ktn-out-3"
          style={{
            width: "64px", height: "64px", borderRadius: "18px", display: "block",
            boxShadow: "0 6px 18px rgba(232,153,30,0.22)",
          }}
        />
        <h1 className="ktn-out-2" style={{
          color: "#2F241D", fontSize: "1.6875rem", fontWeight: 800,
          letterSpacing: "0.05em", marginTop: "24px", lineHeight: 1.25,
        }}>
          今天吃什么呀
        </h1>
        <p className="ktn-out-1" style={{
          color: "#6F5A48", fontSize: "0.90625rem", marginTop: "12px", letterSpacing: "0.03em",
        }}>
          想吃什么，点给 TA
        </p>
      </div>

      {/* Flexible band. Bottom-aligned and clipped, so a short screen loses the
          top of the window rather than colliding with the buttons below. */}
      <div className="ktn-band" style={{
        flex: 1, minHeight: 0, zIndex: 2,
        display: "flex", alignItems: "flex-end",
      }}>
        {/* flexShrink:0 is load-bearing — as a shrinkable flex item the wrapper
            settles at 106% here but 112% on /login (absolute), so the scene
            would pop wider and shift right at the handoff. */}
        <div ref={sceneRef} className="ktn-scene" style={{ position: "relative", flexShrink: 0 }}>
          <KitchenScene variant="full" />
          {/* Covers the whole pot (viewBox x 112-208, y 100-154), not just the
              lid: the lid is a 10px line and nobody aims at a line — they tap
              the pot. onClick as well as onPointerDown because screen-reader
              and Voice Control activation synthesises a click, never a pointer
              sequence; `go` is idempotent so both firing is harmless. */}
          <div
            onPointerDown={e => go(e.clientX, e.clientY)}
            onClick={() => go()}
            role="button"
            tabIndex={0}
            aria-label="掀开锅盖，开始使用"
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } }}
            style={{
              position: "absolute",
              left: "35%", width: "30%",
              top: "47.2%", height: "25.5%",
              cursor: "pointer", borderRadius: "18px",
              touchAction: "manipulation",
            }}
          />
        </div>
      </div>

      {ring && <ContactRing x={ring.x} y={ring.y} />}
      <SteamLayer k={k} />

      <div className="ktn-out-1" style={{
        flex: "none", zIndex: 3, padding: "0 28px calc(22px + var(--ktn-bottom))",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
          color: "#8E7458", fontSize: "0.8125rem", letterSpacing: "0.03em",
          paddingBottom: "26px",
        }}>
          <span>共同的菜单</span>
          <i style={{ width: 3, height: 3, borderRadius: "50%", background: "#DCB98A" }} />
          <span>想吃就点给 TA</span>
          <i style={{ width: 3, height: 3, borderRadius: "50%", background: "#DCB98A" }} />
          <span>每一顿都记得</span>
        </div>

        <Link
          href="/login"
          onClick={linkGo}
          style={{
            height: "56px", borderRadius: "999px", width: "100%",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "linear-gradient(180deg, #F5B460 0%, #E8991E 100%)",
            color: "#FFFFFF", fontSize: "1rem", fontWeight: 700, letterSpacing: "0.06em",
            boxShadow: "0 8px 20px rgba(232,153,30,0.32)",
          }}
        >
          创建我们的小厨房
        </Link>
        {/* Goes to /join, not /login: this is the path for someone holding a
            partner's invite code. No steam — the transition lands the scene at
            the bottom of /login specifically, and /join has no such scene. */}
        <Link
          href="/join"
          style={{
            height: "56px", borderRadius: "999px", width: "100%", marginTop: "12px",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "1.5px solid #DCB98A", color: "#C9831F",
            fontSize: "1rem", fontWeight: 700, letterSpacing: "0.06em",
          }}
        >
          加入小厨房
        </Link>

        {/* Third way in, for visitors who will not hand over a phone number to
            something they have not seen. Deliberately the quietest of the three
            — it leads to sample data, not to their own kitchen. No steam: the
            transition is choreographed to land on /login specifically. */}
        <button
          onClick={enterTour}
          style={{
            height: "40px", width: "100%", marginTop: "10px",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "none", border: "none", cursor: "pointer",
            color: tourState === "idle" || tourState === "busy" ? "#A58A72" : "#C9831F",
            fontSize: "0.8125rem", letterSpacing: "0.04em",
          }}
        >
          {tourState === "busy" ? "正在打开…"
            : tourState === "error" ? "没打开，再点一下试试"
              : tourState === "blocked" ? "浏览器不让存 Cookie，参观模式打不开"
                : "先随便逛逛 →"}
        </button>

        <p style={{ textAlign: "center", fontSize: "0.6875rem", color: "#C8A878", marginTop: "10px" }}>
          <Link href="/terms" style={{ color: "#C8A878" }}>用户协议</Link>
          {" · "}
          <Link href="/privacy" style={{ color: "#C8A878" }}>隐私政策</Link>
          {" · "}
          <Link href="/install" style={{ color: "#C8A878" }}>添加到主屏幕</Link>
        </p>
        {icp && (
          <p style={{ textAlign: "center", fontSize: "0.6875rem", color: "#D6BC9C", marginTop: "5px" }}>
            <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer" style={{ color: "#D6BC9C" }}>
              {icp}
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
