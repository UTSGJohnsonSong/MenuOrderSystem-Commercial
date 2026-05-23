"use client";

import { useRouter } from "next/navigation";

interface Props {
  count: number;
  onClick?: () => void;
}

export default function CartBar({ count, onClick }: Props) {
  const router = useRouter();

  if (count === 0) return null;

  const handleClick = () => {
    if (onClick) onClick();
    router.push("/cart");
  };

  return (
    <div
      className="fixed left-4 right-4 z-30 rounded-2xl shadow-lg flex justify-between items-center py-3 px-5 cursor-pointer"
      style={{ bottom: "72px", backgroundColor: "#FF9F43" }}
      onClick={handleClick}
    >
      <span className="text-white text-sm font-medium">
        今日菜单 · {count} 道菜
      </span>
      <span className="text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>
        查看
      </span>
    </div>
  );
}
