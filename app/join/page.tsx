"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEntryCanvas } from "@/components/EntryScene";

/*
 * Invite landing page.
 *
 * Reached two ways: from a shared link (/join?code=ABC123), or from the
 * 加入小厨房 button on /welcome with no code at all. The app offers a
 * "copy just the invite code" button, so people do end up holding a bare
 * six-character code — without the entry state below they have nowhere to put it.
 */

const CODE_LEN = 6;

function JoinContent() {
  const router = useRouter();
  const params = useSearchParams();
  const code = (params.get("code") ?? "").trim().toUpperCase();
  useEntryCanvas();

  const [entry, setEntry] = useState("");
  // Bound to the code it belongs to. A bare string never cleared when `code`
  // changed, so going back from an error screen left the error showing on a
  // URL that no longer had a code — a dead end for the Android back button.
  const [failure, setFailure] = useState<{ code: string; message: string } | null>(null);
  const [joining, setJoining] = useState(false);
  // null means "not looked up yet" — the phase below is derived from it rather
  // than assigned in the effect, which would be a cascading render.
  //
  // Bound to its code for the same reason `failure` is, and it matters more here:
  // going back from a preview does not remount, so a bare `{name}` stayed put.
  // Typing a different code then rendered "TA 邀请你加入「<the previous space>」"
  // over an enabled button that POSTs the NEW code — the user would join a space
  // whose name they were never shown. `loggedIn` rides along so it cannot go
  // stale independently either.
  const [preview, setPreview] = useState<
    { code: string; name: string; loggedIn: boolean } | null
  >(null);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    Promise.all([
      fetch(`/api/space/preview?code=${encodeURIComponent(code)}`).then(r => r.json().then(d => ({ ok: r.ok, d }))),
      fetch("/api/auth/me").then(r => r.json()),
    ]).then(([res, me]) => {
      if (cancelled) return;
      if (!res.ok) { setFailure({ code, message: res.d.error ?? "邀请码无效" }); return; }
      if (res.d.full) { setFailure({ code, message: "这个小厨房已经满员啦" }); return; }
      setPreview({ code, name: res.d.name, loggedIn: !!me.user });
    }).catch(() => { if (!cancelled) setFailure({ code, message: "网络开小差了，请重试" }); });
    return () => { cancelled = true; };
  }, [code]);

  const error = failure && failure.code === code ? failure.message : "";
  // Everything downstream reads `ok`, never `preview` — that is what keeps a
  // result from a previous code off the screen.
  const ok = preview && preview.code === code ? preview : null;
  const state: "input" | "loading" | "ready" | "joining" | "error" =
    !code ? "input"
      : error ? "error"
        : joining ? "joining"
          : ok ? "ready" : "loading";
  const spaceName = ok?.name ?? "";

  const rootRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  /* Same scroll pinning as /login. `overflow: hidden` does not stop a browser
   * scrolling a box to reveal a focused descendant, and on this device the
   * mover turned out to be document.scrollingElement — so reset every candidate,
   * in the same tick the scroll happens and again across the keyboard's
   * animation. */
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

  /* Keyboard up on arrival, like /login. */
  useEffect(() => {
    if (code) return;                       // an invite link goes straight to the preview
    const id = window.setTimeout(() => {
      try { codeRef.current?.focus({ preventScroll: true }); } catch { codeRef.current?.focus(); }
    }, 80);
    return () => window.clearTimeout(id);
  }, [code]);

  const open = () => {
    if (entry.length !== CODE_LEN) return;
    // Through the URL rather than local state: the invite stays shareable and
    // the back button behaves.
    router.push(`/join?code=${encodeURIComponent(entry)}`);
  };

  const join = async () => {
    if (!ok?.loggedIn) {
      router.push(`/login?code=${encodeURIComponent(code)}`);
      return;
    }
    setJoining(true);
    try {
      const res = await fetch("/api/space/join", { method: "POST", body: JSON.stringify({ code }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "加入失败");
      router.replace("/");
    } catch (e) {
      setFailure({ code, message: e instanceof Error ? e.message : "加入失败" });
      setJoining(false);
    }
  };

  const pill: React.CSSProperties = {
    height: 56, borderRadius: 999, width: "100%", border: "none",
    fontSize: "1rem", fontWeight: 700, letterSpacing: "0.06em",
    display: "flex", alignItems: "center", justifyContent: "center",
  };

  return (
    <div ref={rootRef} style={{
      height: "100%", position: "relative", overflow: "hidden",
      display: "flex", flexDirection: "column",
      background: "linear-gradient(180deg, #FFFDF8 0%, #FFF3E0 100%)",
      /* Content starts at the top rather than centred: iOS pulls a focused field
         up to roughly 100px from the top of the visible area, so a centred form
         guarantees a shove of a couple of hundred pixels. Same fix as /login. */
      padding: "max(26px, calc(env(safe-area-inset-top) + 16px)) 28px calc(24px + var(--ktn-bottom))",
      textAlign: "center",
    }}>
      {/* Same position and hit size as the back arrow on /login. */}
      <button
        onClick={() => {
          // A shared invite usually opens in a fresh tab (WeChat, Safari), where
          // there is no in-app history and back() silently does nothing.
          if (window.history.length > 1) router.back();
          else router.replace("/welcome");
        }}
        aria-label="返回"
        style={{
          position: "absolute", top: "var(--ktn-nav-top)", left: 11,
          width: 44, height: 44, borderRadius: "50%", background: "none",
          color: "#6F5A48", display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <svg width="10" height="17" viewBox="0 0 10 17" fill="none" stroke="currentColor"
          strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M8.5 1.5L1.5 8.5l7 7" />
        </svg>
      </button>

      {state !== "input" && (
        <div style={{ fontSize: "3.5rem", marginBottom: "16px", flex: "none" }}>💌</div>
      )}

      {state === "input" && (
        <>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 10, height: 44, flex: "none",
          }}>
            <span style={{ fontSize: "1.5rem", lineHeight: 1 }}>💌</span>
            <h1 style={{
              color: "#2F241D", fontSize: "1.125rem", fontWeight: 800,
              letterSpacing: "0.04em", lineHeight: 1.2,
            }}>
              输入邀请码
            </h1>
          </div>

          <input
            ref={codeRef}
            className="ktn-code-input"
            value={entry}
            onChange={e => {
              setEntry(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, CODE_LEN));
            }}
            onKeyDown={e => { if (e.key === "Enter") open(); }}
            inputMode="text"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            placeholder="ABC123"
            aria-label="邀请码"
            /* background / border / box-shadow deliberately live in the
               .ktn-code-input rule instead — an inline style outranks a class,
               so keeping them here would make the :focus ring unreachable. */
            style={{
              marginTop: 22, width: "100%", height: 62, flex: "none",
              borderRadius: 20,
              textAlign: "center", color: "#2F241D",
              // 16px minimum, or Safari zooms the page on focus.
              fontSize: "22px", fontWeight: 700, letterSpacing: "0.42em",
              textIndent: "0.42em",
            }}
          />

          <p style={{ color: "#A58A72", fontSize: "0.78125rem", marginTop: 12 }}>
            TA 分享给你的 6 位码
          </p>

          <button
            onClick={open}
            disabled={entry.length !== CODE_LEN}
            style={{
              ...pill, marginTop: 22,
              ...(entry.length === CODE_LEN
                ? { background: "linear-gradient(180deg, #F5B460 0%, #E8991E 100%)", color: "#FFFFFF",
                    boxShadow: "0 8px 20px rgba(232,153,30,0.32)", cursor: "pointer" }
                : { background: "#F3E4C8", color: "#977B4E", cursor: "default" }),
            }}
          >
            下一步
          </button>

          <button
            onClick={() => router.replace("/welcome")}
            style={{ ...pill, marginTop: 12, background: "transparent",
              border: "1.5px solid #DCB98A", color: "#C9831F", cursor: "pointer" }}
          >
            我还没有邀请码
          </button>
        </>
      )}

      {state === "loading" && <p style={{ color: "#9A7B5F" }}>正在打开邀请…</p>}

      {state === "error" && (
        <>
          <h1 style={{ color: "#2F241D", fontSize: "1.25rem", fontWeight: 800 }}>{error}</h1>
          <button
            onClick={() => { setEntry(""); setFailure(null); setPreview(null); router.replace("/join"); }}
            style={{
              ...pill, marginTop: 24,
              background: "linear-gradient(180deg, #F5B460 0%, #E8991E 100%)",
              color: "#FFFFFF", boxShadow: "0 8px 20px rgba(232,153,30,0.32)", cursor: "pointer",
            }}
          >
            重新输入
          </button>
          <button
            onClick={() => router.replace("/welcome")}
            style={{ ...pill, marginTop: 12, background: "transparent",
              border: "1.5px solid #DCB98A", color: "#C9831F", cursor: "pointer" }}
          >
            回到首页
          </button>
        </>
      )}

      {(state === "ready" || state === "joining") && (
        <>
          <h1 style={{ color: "#2F241D", fontSize: "1.5rem", fontWeight: 800, lineHeight: 1.4 }}>
            TA 邀请你加入<br />「{spaceName}」
          </h1>
          <p style={{ color: "#6F5A48", fontSize: "0.9375rem", marginTop: "10px" }}>
            加入后就能一起点菜、一起记录每天吃了什么
          </p>
          <button
            onClick={join}
            disabled={state === "joining"}
            style={{
              ...pill, marginTop: 32,
              background: "linear-gradient(180deg, #F5B460 0%, #E8991E 100%)",
              color: "#FFFFFF", boxShadow: "0 8px 20px rgba(232,153,30,0.32)", cursor: "pointer",
            }}
          >
            {state === "joining" ? "正在加入…" : ok?.loggedIn ? "加入小厨房" : "登录并加入"}
          </button>
        </>
      )}
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinContent />
    </Suspense>
  );
}
