import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "linear-gradient(145deg, #FFF8EF 0%, #FFE0A0 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "0",
      }}
    >
      {/* Bowl body */}
      <div
        style={{
          width: 300,
          height: 300,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {/* Steam wisps */}
        <div style={{
          position: "absolute", top: 0, left: "50%",
          display: "flex", gap: 24, transform: "translateX(-50%)",
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 14, height: 60,
              background: "#F5B460",
              borderRadius: 99,
              opacity: 0.7,
              transform: `scaleY(${i === 1 ? 1 : 0.75}) translateY(${i === 1 ? 0 : 8}px)`,
            }} />
          ))}
        </div>

        {/* Bowl */}
        <div style={{
          position: "absolute",
          bottom: 0,
          width: 260,
          height: 160,
          background: "linear-gradient(180deg, #F5B460 0%, #E8991E 100%)",
          borderRadius: "0 0 130px 130px",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          boxShadow: "0 24px 48px rgba(232,153,30,0.35)",
        }}>
          {/* Bowl rim */}
          <div style={{
            width: "100%",
            height: 32,
            background: "#F8C878",
            borderRadius: "50% 50% 0 0 / 100% 100% 0 0",
          }} />
        </div>

        {/* Chopsticks */}
        <div style={{
          position: "absolute",
          bottom: 80,
          width: 260,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          transform: "rotate(-20deg) translateX(30px)",
        }}>
          {[0, 1].map(i => (
            <div key={i} style={{
              width: 180,
              height: 12,
              background: "#8B5E3C",
              borderRadius: 99,
              marginLeft: i * 18,
            }} />
          ))}
        </div>
      </div>
    </div>,
    { ...size }
  );
}
