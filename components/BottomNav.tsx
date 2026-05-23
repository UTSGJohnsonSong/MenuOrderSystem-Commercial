"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "菜单", href: "/" },
  { label: "今日", href: "/cart" },
  { label: "管理", href: "/manage" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
      <div className="flex">
        {tabs.map((tab) => {
          const isActive = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex-1 flex items-center justify-center py-3 text-sm transition-colors"
              style={{
                color: isActive ? "#FF9F43" : "#8A6F5A",
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
