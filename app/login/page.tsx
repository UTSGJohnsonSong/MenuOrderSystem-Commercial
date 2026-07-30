"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { KitchenScene, SteamLayer, useEntryCanvas } from "@/components/EntryScene";

/*
 * Phone + SMS code sign-in.
 *
 * When arriving from /welcome the page mounts inside the fog that page built
 * (flagged via sessionStorage) and disperses it while the form rises in, so the
 * route swap reads as one continuous motion. Opened directly, it just appears.
 */

const ROW_H = 52;

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const inviteCode = params.get("code") ?? "";
  useEntryCanvas();

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [focus, setFocus] = useState<"phone" | "code" | null>(null);
  const [sent, setSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [devCode, setDevCode] = useState("");

  /* Read during the first render, not in an effect: effects run after paint, so
   * the page would flash un-fogged for one frame and expose the route swap.
   * Only the flag *clear* is deferred — mutating in a lazy initializer is unsafe
   * under StrictMode's double render. */
  const [landing] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return sessionStorage.getItem("ktn-enter") === "1"; } catch { return false; }
  });
  useEffect(() => {
    try { sessionStorage.removeItem("ktn-enter"); } catch { /* private mode */ }
  }, []);

  const rootRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  /* Puff offsets must use the same scale /welcome used, or all 32 of them snap
   * inward at the swap — up to ~123px on a 480px container. */
  const [k, setK] = useState(1);
  useEffect(() => {
    const measure = () => {
      const w = rootRef.current?.getBoundingClientRect().width;
      if (w) setK(w / 375);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);



  const phoneOk = /^1[3-9]\d{9}$/.test(phone);
  const codeOk = code.length === 6;
  const canSend = phoneOk && countdown === 0 && !busy;
  const ready = phoneOk && codeOk && agreed;
  // Clickable while only the agreement is missing, otherwise there is no way
  // for the user to find out why nothing happens.
  const clickable = phoneOk && codeOk && !busy;

  /* 短信通道还没接通时，服务端会回 smsPending。不显示的话，用户会对着
   * 一个永远不会到的验证码干等 —— 页面这边看起来一切正常。 */
  const [smsPending, setSmsPending] = useState(false);
  const [tourBusy, setTourBusy] = useState(false);

  const enterTour = async () => {
    if (tourBusy) return;
    setTourBusy(true);
    try {
      const res = await fetch("/api/guest", { method: "POST" });
      if (!res.ok) throw new Error("guest cookie refused");
      window.location.href = "/";
    } catch (e) {
      console.error("[login] could not start the tour", e);
      setTourBusy(false);
    }
  };

  const sendCode = async () => {
    if (!canSend) return;
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "发送失败");
      setSent(true);
      setCountdown(60);
      if (data.devCode) setDevCode(data.devCode);
      if (data.smsPending) setSmsPending(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "发送失败，请重试");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setAttempted(true);
    if (!clickable) return;
    if (!agreed) return;                       // message renders from `attempted`
    setError("");
    setBusy(true);
    try {
      // Sign-up source: /welcome stashes ?from= into sessionStorage, pass it through.
      // Guarded like every other access — WeChat's in-app browser and private
      // mode can throw here, and inside this try it would surface as
      // "登录失败，请重试" with no way for the user to ever get in.
      let source = "";
      try { source = sessionStorage.getItem("fm-source") ?? ""; } catch { /* storage off */ }
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        body: JSON.stringify({ phone, code, source, ...(inviteCode ? { inviteCode } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "登录失败");
      router.replace(data.created ? "/onboarding" : "/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "登录失败，请重试");
      setBusy(false);
    }
  };

  const rowStyle = (name: "phone" | "code"): React.CSSProperties => ({
    display: "flex", alignItems: "center", height: ROW_H, padding: "0 14px",
    borderRadius: 15, margin: "3px 0",
    borderTop: name === "code" ? "1px solid #E8D1AB" : undefined,
    borderTopLeftRadius: name === "code" ? 0 : 15,
    borderTopRightRadius: name === "code" ? 0 : 15,
    ...(focus === name
      ? { background: "#FFFBF3", boxShadow: "inset 0 0 0 1.5px #F5B460", borderTopColor: "transparent" }
      : null),
  });

  /* 16px exactly — globals.css forces it on every input for a reason: below
   * 16px Safari zooms the page on focus, and this page is the one signed-out
   * visitors meet in the browser. */
  const inputStyle: React.CSSProperties = {
    border: "none", outline: "none", flex: 1, fontSize: "16px",
    color: "#2F241D", background: "transparent", minWidth: 0,
  };

  /* Second line of defence behind the geometry.
   *
   * The masthead being one short row is what actually removes the shove — the
   * first field sits above the ~100px mark iOS pulls a focused input to, so
   * there is nothing to scroll. This keeps the belt on anyway: `overflow:hidden`
   * does not stop a browser scrolling a box to reveal a focused descendant, and
   * on the device this was measured on the mover was document.scrollingElement.
   * Reset in the same tick the scroll happens, and again across the keyboard's
   * animation, during which iOS re-adjusts more than once. */
  const pinScroll = useCallback(() => {
    const root = rootRef.current;
    const nodes: (Element | null)[] = [
      document.scrollingElement, document.documentElement, document.body,
      root, root?.parentElement ?? null,
    ];
    nodes.forEach(el => { if (el && el.scrollTop !== 0) el.scrollTop = 0; });
    if (window.scrollY !== 0) window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const timers: number[] = [];
    const pinning = { on: false };
    const onScroll = () => { if (pinning.on) pinScroll(); };
    const onFocusIn = () => {
      pinning.on = true;
      pinScroll();
      requestAnimationFrame(pinScroll);
      [16, 50, 120, 250, 400, 600, 900].forEach(
        d => timers.push(window.setTimeout(pinScroll, d)),
      );
    };
    const onFocusOut = () => { timers.push(window.setTimeout(() => { pinning.on = false; }, 400)); };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    window.addEventListener("scroll", onScroll, true);
    document.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      window.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("scroll", onScroll, true);
      timers.forEach(window.clearTimeout);
    };
  }, [pinScroll]);

  /* Tight stagger — the elements should feel like one movement, not a queue. */
  const step = (i: number) => ({ "--kdel": `${320 + i * 46}ms` } as React.CSSProperties);

  return (
    <div
      ref={rootRef}
      className={landing ? "ktn-land" : undefined}
      style={{
        height: "100%", position: "relative",
        display: "flex", flexDirection: "column",
        /* Not scrollable, by measurement rather than preference: on the phone
         * the readout caught this element at scrollTop=46 while the layout
         * viewport, the container and the window all stayed put — iOS was
         * scrolling THIS box on focus, and that was the whole "page jumps up"
         * complaint. It cannot scroll what cannot scroll. The form ends around
         * y=473, so even a 553px viewport only clips decoration. */
        overflow: "hidden",
        background: "linear-gradient(180deg, #FFFDF8 0%, #FFF3E0 100%)",
      }}
    >
      <Link
        href="/welcome"
        aria-label="返回"
        className={landing ? "ktn-in" : undefined}
        style={{
          position: "absolute", top: "var(--ktn-nav-top)",
          left: 11, width: 44, height: 44,
          borderRadius: "50%", zIndex: 5, color: "#6F5A48",
          display: "flex", alignItems: "center", justifyContent: "center",
          ...(landing ? step(2) : null),
        }}
      >
        <svg width="10" height="17" viewBox="0 0 10 17" fill="none" stroke="currentColor"
          strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M8.5 1.5L1.5 8.5l7 7" />
        </svg>
      </Link>

      {/* In normal flow, with the illustration as a sibling below — the earlier
          absolute + big bottom-padding version was always taller than the
          viewport, so it was permanently scrollable. */}
      <div style={{
        flex: "none", zIndex: 3,
        // Vertical rhythm shrinks on short viewports so the form still fits.
        padding: "max(26px, calc(env(safe-area-inset-top) + 16px)) 28px 0",
        transition: "padding-top 180ms ease",
        display: "flex", flexDirection: "column", alignItems: "center",
      }}>
        {/* Logo and title share one row.
         *
         * Geometry, not a JS trick: iOS scrolls a focused field up to roughly
         * 100px from the top of the visible area, so the only way to get zero
         * movement is for the field to already be there. A stacked masthead put
         * it at 163px — hence the 60px shove that survived every attempt to
         * cancel it in script. This header is ~70px tall, which lands the first
         * field around 78px and leaves iOS nothing to do. */}
        <div
          className={landing ? "ktn-in" : undefined}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 10, flex: "none", height: 44,
            ...(landing ? step(0) : null),
          }}
        >
          <img
            src="/icon-192.png"
            decoding="async"
            alt=""
            style={{
              width: 32, height: 32, borderRadius: 10, flex: "none", display: "block",
              boxShadow: "0 3px 10px rgba(232,153,30,0.22)",
            }}
          />
          <h1 style={{
            color: "#2F241D", fontSize: "1.125rem", fontWeight: 800,
            letterSpacing: "0.04em", lineHeight: 1.2,
          }}>
            {inviteCode ? "来一起点菜" : "登录小厨房"}
          </h1>
        </div>

        <div style={{ height: "clamp(14px, 3.7vh, 30px)", flex: "none" }} />

        <div
          className={landing ? "ktn-in" : undefined}
          style={{
            background: "#FFFFFF", borderRadius: 20, padding: "0 4px", width: "100%",
            border: "1.5px solid rgba(220,185,138,0.45)",
            boxShadow: "0 4px 16px rgba(120,80,40,0.06)", flex: "none",
            ...(landing ? step(3) : null),
          }}
        >
          {/* Tapping the row focuses the real input; onFocus/onBlur stay the only
              writers of `focus`, so the ring can never light a field that has no
              caret — or stay lit after the user taps elsewhere. */}
          <div style={rowStyle("phone")} onClick={() => phoneRef.current?.focus()}>
            <span style={{
              color: "#2F241D", fontSize: "16px", fontWeight: 600, flex: "none",
              paddingRight: 12, marginRight: 12, borderRight: "1px solid #E8D1AB",
            }}>+86</span>
            <input
              ref={phoneRef}
              type="tel" inputMode="numeric" maxLength={11} placeholder="手机号"
              value={phone} style={inputStyle}
              onFocus={() => setFocus("phone")} onBlur={() => setFocus(null)}
              onChange={e => { setPhone(e.target.value.replace(/\D/g, "")); setError(""); }}
            />
          </div>
          <div style={rowStyle("code")} onClick={() => codeRef.current?.focus()}>
            <input
              ref={codeRef}
              type="text" inputMode="numeric" maxLength={6} placeholder="验证码"
              value={code} style={inputStyle}
              onFocus={() => setFocus("code")} onBlur={() => setFocus(null)}
              onChange={e => { setCode(e.target.value.replace(/\D/g, "")); setError(""); }}
            />
            <button
              onClick={e => { e.stopPropagation(); sendCode(); }}
              disabled={!canSend}
              style={{
                background: "none", border: "none", flex: "none",
                fontSize: "0.875rem", fontWeight: 700,
                color: canSend ? "#C9831F" : "#C4B097",
                cursor: canSend ? "pointer" : "default",
              }}
            >
              {countdown > 0 ? `${countdown}s 后重发` : sent ? "重新发送" : "获取验证码"}
            </button>
          </div>
        </div>

        <div
          className={landing ? "ktn-in" : undefined}
          style={{
            display: "flex", alignItems: "flex-start", gap: 10, marginTop: 18,
            width: "100%", flex: "none", ...(landing ? step(4) : null),
          }}
        >
          {/* The box stays 18px, but the button is padded out to 44px (pulled
              back with negative margin so the layout is unchanged) — an 18px
              target fails WCAG 2.2 SC 2.5.8, and ticking this is now mandatory
              before anyone can sign in. */}
          <button
            onClick={() => setAgreed(v => !v)}
            role="checkbox"
            aria-checked={agreed}
            aria-label="我已阅读并同意用户协议和隐私政策"
            style={{
              flex: "none", padding: 13, margin: "-12px -13px -13px -13px",
              background: "none", border: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <span style={{
              width: 18, height: 18, borderRadius: 6, flex: "none",
              border: agreed ? "1.5px solid #E8991E" : "1.5px solid #DCB98A",
              background: agreed ? "#E8991E" : "#FFFFFF",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {agreed && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none" stroke="#fff"
                  strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 4.2L3.7 7 9 1" />
                </svg>
              )}
            </span>
          </button>
          <p style={{ color: "#A58A72", fontSize: "0.75rem", lineHeight: 1.6 }}>
            我已阅读并同意
            <Link href="/terms" style={{ color: "#C9831F" }}>《用户协议》</Link>和
            <Link href="/privacy" style={{ color: "#C9831F" }}>《隐私政策》</Link>
          </p>
        </div>

        {attempted && !agreed && (
          <p role="alert" style={{ color: "#C9563F", fontSize: "0.78125rem", marginTop: 10, width: "100%", flex: "none" }}>
            请先阅读并同意用户协议和隐私政策
          </p>
        )}
        {devCode && (
          <p style={{ color: "#C47A2C", fontSize: "0.8125rem", marginTop: 10, width: "100%", flex: "none" }}>
            开发模式验证码：<strong>{devCode}</strong>
          </p>
        )}
        {smsPending && (
          <div style={{ marginTop: 10, width: "100%", flex: "none" }}>
            <p role="alert" style={{ color: "#C47A2C", fontSize: "0.78125rem", lineHeight: 1.6 }}>
              验证码还发不出来——还差一道手续，批下来就开放注册。
              <br />现在可以先进去逛逛，菜单、食记、菜品库都能翻。
            </p>
            <button
              onClick={enterTour}
              style={{
                marginTop: 8, height: 38, padding: "0 16px", borderRadius: 999,
                border: "1.5px solid #DCB98A", background: "none", cursor: "pointer",
                color: "#C9831F", fontSize: "0.8125rem", fontWeight: 700,
              }}
            >
              {tourBusy ? "正在打开…" : "先随便逛逛 →"}
            </button>
          </div>
        )}
        {error && (
          <p role="alert" style={{ color: "#C9563F", fontSize: "0.78125rem", marginTop: 10, width: "100%", flex: "none" }}>
            {error}
          </p>
        )}

        <div style={{ height: "clamp(12px, 2.7vh, 22px)", flex: "none" }} />

        <button
          onClick={verify}
          disabled={!clickable}
          className={landing ? "ktn-in" : undefined}
          style={{
            height: 56, borderRadius: 999, width: "100%", flex: "none",
            fontSize: "1rem", fontWeight: 700, letterSpacing: "0.06em",
            display: "flex", alignItems: "center", justifyContent: "center",
            ...(ready
              ? { background: "linear-gradient(180deg, #F5B460 0%, #E8991E 100%)", color: "#FFFFFF",
                  boxShadow: "0 8px 20px rgba(232,153,30,0.32)" }
              : { background: "#F3E4C8", color: "#977B4E", boxShadow: "none",
                  cursor: clickable ? "pointer" : "default" }),
            ...(landing ? step(5) : null),
          }}
        >
          {busy ? "请稍等…" : "登录"}
        </button>

        <p
          className={landing ? "ktn-in" : undefined}
          style={{
            textAlign: "center", color: "#A58A72", fontSize: "0.78125rem",
            marginTop: 16, flex: "none", ...(landing ? step(6) : null),
          }}
        >
          收到邀请？登录后就能加入 TA 的小厨房
        </p>
      </div>

      {/* Absorbs the slack so the illustration stays pinned to the bottom edge —
          which is exactly where the scene lands when it sinks off /welcome. */}
      <div style={{ flex: 1, minHeight: 0 }} />
      <div className="ktn-scene" style={{ flex: "none" }}>
        <KitchenScene variant="bottom" />
      </div>

      {landing && <SteamLayer k={k} />}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
