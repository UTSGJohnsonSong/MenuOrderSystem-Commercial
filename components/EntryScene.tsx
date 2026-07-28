"use client";

import { useEffect } from "react";

/*
 * Shared kitchen line-art used by /welcome and /login, plus the steam layer
 * that hides the route swap between them.
 *
 * The login illustration is not a second asset: rows 90–186 of the welcome
 * viewBox ARE the login illustration (pot 120→30, lid 114→24, counter 152→62,
 * bowls 136→46 — every element differs by exactly 90). Cropping via viewBox
 * keeps one source of truth and avoids re-laying out the SVG mid-transition.
 */

export const SCENE_VIEWBOX = { full: "0 0 320 212", bottom: "0 90 320 96" } as const;

type Puff = {
  size: number; tx: number; ty: number; scale: number;
  delay: number; dur: number; thin: boolean;
};

/* Origin is a fixed fraction of the container on BOTH pages, not the pot's
 * actual position — the landing page must pick the puffs up exactly where the
 * outgoing page left them, and the pot has moved by then. */
export const STEAM_ORIGIN = { left: "50%", top: "48%" };

const PUFFS: Puff[] = [
  [104, 4, -330, 3.1, 0, 0, 0], [118, -40, -360, 3.3, 30, 30, 0], [110, 46, -336, 3.2, 60, 20, 0],
  [92, -88, -300, 2.9, 20, 60, 1], [96, 94, -296, 3.0, 50, 70, 1], [130, -8, -402, 3.5, 90, 40, 0],
  [84, -136, -268, 2.7, 45, 100, 1], [86, 142, -262, 2.8, 75, 110, 1], [124, -60, -382, 3.4, 110, 80, 0],
  [120, 66, -376, 3.3, 125, 90, 0], [76, -178, -236, 2.6, 95, 140, 1], [78, 184, -230, 2.6, 115, 150, 1],
  [136, -26, -424, 3.6, 150, 100, 0], [128, 34, -418, 3.5, 165, 110, 0], [72, -212, -206, 2.4, 140, 180, 1],
  [74, 216, -200, 2.4, 160, 190, 1], [140, 0, -440, 3.7, 195, 120, 0], [100, -108, -330, 3.0, 185, 160, 1],
  [102, 114, -326, 3.0, 205, 170, 1], [132, -48, -408, 3.5, 225, 130, 0], [126, 54, -402, 3.4, 240, 140, 0],
  [68, -238, -176, 2.3, 210, 215, 1], [70, 242, -172, 2.3, 230, 225, 1], [144, -14, -452, 3.8, 265, 150, 0],
  [88, -160, -286, 2.8, 255, 200, 1], [90, 166, -282, 2.8, 275, 210, 1],
  // Corner fill: without these the screen edges stay visibly empty at peak.
  [118, -196, -386, 3.2, 170, 160, 1], [120, 202, -382, 3.2, 190, 170, 1],
  [126, -166, -448, 3.4, 235, 185, 1], [128, 172, -444, 3.4, 255, 195, 1],
  [110, -226, -330, 3.0, 205, 205, 1], [112, 232, -326, 3.0, 225, 215, 1],
].map(([size, tx, ty, scale, delay, dur, thin]) => ({
  size, tx, ty, scale, delay, dur, thin: !!thin,
}));

/**
 * Warm fog that fills the screen. `k` scales spread to the container width so
 * the landing page picks the puffs up exactly where the outgoing page left them.
 *
 * Both sides render the full set. Halving it on the landing side was tried as a
 * jank fix and rejected — it thinned the fog visibly, and the stutter turned out
 * to be the 279KB app icon decoding mid-transition, now a 41KB one.
 */
export function SteamLayer({ k = 1 }: { k?: number }) {
  return (
    <>
      <div className="ktn-veil" aria-hidden />
      <div className="ktn-steam" aria-hidden>
        {PUFFS.map((p, i) => (
          <div
            key={i}
            className={p.thin ? "ktn-puff ktn-thin" : "ktn-puff"}
            style={{
              width: p.size, height: p.size,
              left: STEAM_ORIGIN.left, top: STEAM_ORIGIN.top,
              "--ktx": `${Math.round(p.tx * k)}px`,
              "--kty": `${Math.round(p.ty * k)}px`,
              "--ksc": p.scale,
              "--krt": `${((p.tx > 0 ? 1 : -1) * (4 + p.dur / 50)).toFixed(1)}deg`,
              "--kdel": `${90 + Math.round(p.delay * 1.3)}ms`,
              "--kdur": `${1500 + Math.round(p.dur * 1.5)}ms`,
            } as React.CSSProperties}
          />
        ))}
      </div>
    </>
  );
}

export function KitchenScene({ variant }: { variant: "full" | "bottom" }) {
  const full = variant === "full";
  return (
    <svg
      viewBox={SCENE_VIEWBOX[variant]}
      fill="none"
      stroke="#DCB98A"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {full && (
        <g className="ktn-upper">
          <path d="M28 94V49c0-11 8.5-19 19-19s19 8 19 19v45" />
          <path d="M47 32v62M28 64h38" stroke="#E8D1AB" />
          <path d="M212 54h84" />
          <path d="M232 54v22M232 76c-4 0-6 3-6 6.5s2 6.5 6 6.5 6-3 6-6.5-2-6.5-6-6.5z" />
          <path d="M266 54v20M259 74h14l-2 15h-10z" />
        </g>
      )}

      {full && (
        <g stroke="#EA9C64" strokeWidth={1.8}>
          <g className="ktn-heart" style={{ "--kx": "160px", "--kdx": "-5px", "--kd": "0ms" } as React.CSSProperties}>
            <path d="M0 0c-2.6-3.4-7-1.2-7 2.2 0 3.6 7 7.4 7 7.4s7-3.8 7-7.4c0-3.4-4.4-5.6-7-2.2z" />
          </g>
          <g className="ktn-heart" style={{ "--kx": "158px", "--kdx": "7px", "--kd": "1900ms" } as React.CSSProperties}>
            <path d="M0 0c-2.6-3.4-7-1.2-7 2.2 0 3.6 7 7.4 7 7.4s7-3.8 7-7.4c0-3.4-4.4-5.6-7-2.2z" />
          </g>
        </g>
      )}
      {full && (
        <>
          <path className="ktn-wisp" style={{ "--kd": "1100ms" } as React.CSSProperties}
            d="M141 106c2.2-2.6 1.2-5.4-.6-7.2" strokeWidth={1.6} />
          <path className="ktn-wisp" style={{ "--kd": "2300ms" } as React.CSSProperties}
            d="M180 104c-2.2-2.6-1.2-5.4.6-7.2" strokeWidth={1.6} />
        </>
      )}

      <path d="M12 152h296" />
      <path d="M74 152v36M232 152v36" stroke="#E8D1AB" />
      <path d="M40 168h14M150 168h14M258 168h14" stroke="#E8D1AB" />
      <path d="M126 120h68l-5 32h-58z" />
      <path d="M126 126h-7c-3 0-5 2-5 5s2 5 5 5h5M194 126h7c3 0 5 2 5 5s-2 5-5 5h-5" />
      <g className="ktn-lid">
        <path d="M120 114h80" />
        <path d="M160 108v6" stroke="#EA9C64" />
      </g>
      <path d="M228 136h30c0 9-6.7 16-15 16s-15-7-15-16z" />
      <path d="M254 141h26c0 7.5-5.8 11-13 11s-13-3.5-13-11z" stroke="#E8D1AB" />

      {/* Potted plant sits on the counter, outside .ktn-upper so it survives
          the transition and stays visible on the login screen. */}
      <g>
        <path d="M40 140c-7 0-11-5-11-11 6-1 11 3 11 11zM47 140c7-1 11-6 10-12-6-1-11 4-10 12z" stroke="#ADBF8B" />
        <path d="M43.5 140v-9" stroke="#ADBF8B" />
        <path d="M36 140h15l-2 12H38z" />
      </g>
    </svg>
  );
}

/**
 * Paints the page canvas to match the entry gradient's top colour.
 *
 * `viewportFit: "cover"` lets the page run under the status bar, but the strip
 * behind it is painted from the canvas background, which propagates from
 * <body> — globals.css sets that to #EDE5D8, so a grey seam appears above the
 * cream. Scoped to the entry pages and restored on unmount.
 */
export function useEntryCanvas() {
  useEffect(() => {
    const body = document.body;
    const saved = {
      bg: body.style.backgroundColor,
      position: body.style.position,
      inset: body.style.inset,
      overflow: body.style.overflow,
      width: body.style.width,
      height: body.style.height,
    };

    body.style.backgroundColor = "#FFFDF8";

    /* Pin the window so iOS cannot scroll it.
     *
     * When the keyboard opens, Safari scrolls the *window* to reveal the focused
     * field — `visualViewport` shrinks while `innerHeight` does not. Locking the
     * page's own scrolling does nothing about that, which is why the earlier
     * attempts failed; the window itself has to be unable to move. Everything on
     * these pages already fits a fixed viewport, and the layout container
     * (app/layout.tsx) is `100dvh; overflow:hidden` anyway. */
    body.style.position = "fixed";
    body.style.inset = "0";
    body.style.overflow = "hidden";
    body.style.width = "100%";
    body.style.height = "100%";

    return () => {
      body.style.backgroundColor = saved.bg;
      body.style.position = saved.position;
      body.style.inset = saved.inset;
      body.style.overflow = saved.overflow;
      body.style.width = saved.width;
      body.style.height = saved.height;
    };
  }, []);
}

/** Hairline ring at the finger position — same visual language as the line art. */
export function ContactRing({ x, y }: { x: number; y: number }) {
  return (
    <svg className="ktn-ring" style={{ left: x, top: y }} viewBox="0 0 74 74" fill="none" aria-hidden>
      <circle cx="37" cy="37" r="34" stroke="#EA9C64" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
