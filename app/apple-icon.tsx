import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "linear-gradient(145deg, #FFF8EF 0%, #FFE0A0 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Bowl */}
      <div style={{
        width: 110,
        height: 110,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        position: "relative",
      }}>
        {/* Steam */}
        <div style={{
          position: "absolute", top: 0, left: "50%",
          display: "flex", gap: 8, transform: "translateX(-50%)",
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 5, height: 20,
              background: "#F5B460",
              borderRadius: 99,
              opacity: 0.8,
              transform: `scaleY(${i === 1 ? 1 : 0.7})`,
            }} />
          ))}
        </div>
        {/* Bowl */}
        <div style={{
          width: 96,
          height: 60,
          background: "linear-gradient(180deg, #F5B460 0%, #E8991E 100%)",
          borderRadius: "0 0 48px 48px",
          boxShadow: "0 8px 20px rgba(232,153,30,0.4)",
        }} />
        {/* Rim */}
        <div style={{
          position: "absolute",
          bottom: 60,
          width: 96,
          height: 12,
          background: "#F8C878",
          borderRadius: 99,
        }} />
      </div>
    </div>,
    { ...size }
  );
}
