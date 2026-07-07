"use client";

/*
 * 封面裁剪器：选完相册照片后，在与主页封面同比例的取景框里
 * 拖动（pan）+ 滑杆缩放（zoom）选取展示区域，确认时把框内区域
 * 画到 canvas 导出 jpeg 再上传——存的就是裁好的图，无需存裁剪参数。
 */

import { useEffect, useRef, useState } from "react";

const FRAME_ASPECT = 366 / 188; // 与主页封面卡一致（宽:高 ≈ 1.95）
const OUT_W = 1200;             // 导出宽度

export default function CoverCropper({ src, uploading, onConfirm, onCancel }: {
  src: string;                       // 原图 dataURL
  uploading: boolean;
  onConfirm: (jpegDataUrl: string) => void;
  onCancel: () => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);

  // 加载原图
  useEffect(() => {
    const img = new Image();
    img.onload = () => { imgRef.current = img; setReady(true); };
    img.src = src;
  }, [src]);

  const frameW = frameRef.current?.clientWidth ?? 340;
  const frameH = frameW / FRAME_ASPECT;
  const img = imgRef.current;
  const baseScale = img ? Math.max(frameW / img.width, frameH / img.height) : 1;
  const ds = baseScale * zoom;
  const drawW = img ? img.width * ds : 0;
  const drawH = img ? img.height * ds : 0;

  const clamp = (x: number, y: number) => ({
    x: Math.min(0, Math.max(frameW - drawW, x)),
    y: Math.min(0, Math.max(frameH - drawH, y)),
  });

  // 图片加载完成后居中
  useEffect(() => {
    if (img) setOffset({ x: (frameW - drawW) / 2, y: (frameH - drawH) / 2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // 缩放时保持取景框中心对应的画面点不动
  const handleZoom = (newZoom: number) => {
    if (!img) { setZoom(newZoom); return; }
    const ds2 = baseScale * newZoom;
    const cx = (frameW / 2 - offset.x) / ds;
    const cy = (frameH / 2 - offset.y) / ds;
    const nx = frameW / 2 - cx * ds2;
    const ny = frameH / 2 - cy * ds2;
    setZoom(newZoom);
    const dw = img.width * ds2, dh = img.height * ds2;
    setOffset({
      x: Math.min(0, Math.max(frameW - dw, nx)),
      y: Math.min(0, Math.max(frameH - dh, ny)),
    });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const { startX, startY, ox, oy } = drag.current;
    setOffset(clamp(ox + (e.clientX - startX), oy + (e.clientY - startY)));
  };
  const onPointerUp = () => { drag.current = null; };

  const confirm = () => {
    if (!img) return;
    const sx = -offset.x / ds, sy = -offset.y / ds;
    const sw = frameW / ds, sh = frameH / ds;
    const canvas = document.createElement("canvas");
    canvas.width = OUT_W;
    canvas.height = Math.round(OUT_W / FRAME_ASPECT);
    canvas.getContext("2d")!.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    onConfirm(canvas.toDataURL("image/jpeg", 0.82));
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 70,
      backgroundColor: "rgba(30,20,12,0.92)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "24px 16px",
      paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
    }}>
      <p style={{ color: "#FFF6E8", fontSize: "0.9375rem", fontWeight: 700, marginBottom: "6px" }}>
        调整封面位置
      </p>
      <p style={{ color: "rgba(255,246,232,0.65)", fontSize: "0.75rem", marginBottom: "18px" }}>
        拖动照片，把最好看的部分放进框里
      </p>

      {/* 取景框 */}
      <div
        ref={frameRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          width: "100%", maxWidth: "420px",
          aspectRatio: `${FRAME_ASPECT}`,
          borderRadius: "20px", overflow: "hidden",
          position: "relative",
          border: "2.5px solid rgba(255,246,232,0.9)",
          touchAction: "none", cursor: "grab",
          backgroundColor: "#1a120a",
        }}
      >
        {ready && img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src} alt="" draggable={false}
            style={{
              position: "absolute",
              left: offset.x, top: offset.y,
              width: drawW, height: drawH,
              maxWidth: "none", userSelect: "none", pointerEvents: "none",
            }}
          />
        )}
      </div>

      {/* 缩放 */}
      <div style={{ width: "100%", maxWidth: "420px", display: "flex", alignItems: "center", gap: "10px", marginTop: "18px" }}>
        <span style={{ color: "rgba(255,246,232,0.7)", fontSize: "0.875rem" }}>🔍</span>
        <input
          type="range" min={1} max={3} step={0.01} value={zoom}
          onChange={e => handleZoom(Number(e.target.value))}
          style={{ flex: 1, accentColor: "#F2A24A" }}
        />
      </div>

      {/* 操作 */}
      <div style={{ width: "100%", maxWidth: "420px", display: "flex", gap: "10px", marginTop: "20px" }}>
        <button onClick={onCancel} disabled={uploading} style={{
          flex: 1, padding: "13px", borderRadius: "14px", cursor: "pointer",
          backgroundColor: "transparent", color: "rgba(255,246,232,0.8)",
          border: "1.5px solid rgba(255,246,232,0.4)", fontSize: "0.875rem", fontWeight: 600,
        }}>
          取消
        </button>
        <button onClick={confirm} disabled={uploading || !ready} style={{
          flex: 2, padding: "13px", borderRadius: "14px", border: "none", cursor: "pointer",
          background: "linear-gradient(180deg, #F5B460 0%, #E8991E 100%)",
          color: "#FFFFFF", fontSize: "0.875rem", fontWeight: 700,
        }}>
          {uploading ? "正在上传…" : "就这样，换上 ✓"}
        </button>
      </div>
    </div>
  );
}
