import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div style={{
      width: "100%", height: "100%",
      background: "linear-gradient(145deg, #FFF8EF 0%, #FFE0A0 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      borderRadius: 128,
    }}>
      <div style={{ display: "flex", fontSize: 200, lineHeight: 1 }}>
        🦔🦥
      </div>
    </div>,
    { ...size }
  );
}
