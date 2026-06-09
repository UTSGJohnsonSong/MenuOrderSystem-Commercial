import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{
      width: "100%", height: "100%",
      background: "linear-gradient(145deg, #FFF8EF 0%, #FFE0A0 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      borderRadius: 40,
    }}>
      <div style={{ display: "flex", fontSize: 72, lineHeight: 1 }}>
        🦔🦥
      </div>
    </div>,
    { ...size }
  );
}
