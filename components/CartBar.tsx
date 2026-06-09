"use client";

import { useRouter } from "next/navigation";

interface Props {
  count: number;
}

export default function CartBar({ count }: Props) {
  const router = useRouter();

  if (count === 0) return null;

  return (
    <div className="fixed left-0 right-0 z-30 flex justify-center pointer-events-none" style={{ bottom: "76px" }}>
      <div
        onClick={() => router.push("/cart")}
        className="pointer-events-auto flex justify-between items-center px-5 py-3 cursor-pointer active:scale-[0.98] transition-transform"
        style={{
          backgroundColor: "#F59E42",
          borderRadius: "999px",
          boxShadow: "0 4px 20px rgba(245,158,66,0.4)",
          minWidth: "200px",
          maxWidth: "360px",
          width: "calc(100% - 48px)",
        }}
      >
        <span style={{ color: "#ffffff", fontSize: "0.875rem", fontWeight: 600 }}>
          今日已选 {count} 道
        </span>
        <span style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.8125rem" }}>
          查看
        </span>
      </div>
    </div>
  );
}
