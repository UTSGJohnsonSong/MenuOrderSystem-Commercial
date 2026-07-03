"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function IconOrder({ active }: { active: boolean }) {
  const fill = active ? "#E8A34A" : "none";
  const stroke = active ? "#E8A34A" : "#B8A18D";
  const linestroke = active ? "#FFF3E0" : "#B8A18D";
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path d="M3 10.5h18c0 5.8-4 10-9 10S3 16.3 3 10.5z"
        fill={fill} stroke={stroke} strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9 7.5C9 6 10.3 6 10.3 4.5" stroke={linestroke} strokeWidth="1.7" strokeLinecap="round" />
      <path d="M13.8 7.5c0-1.5 1.2-1.5 1.2-3" stroke={linestroke} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function IconDiary({ active }: { active: boolean }) {
  const fill = active ? "#E8A34A" : "none";
  const stroke = active ? "#E8A34A" : "#B8A18D";
  const linestroke = active ? "#FFF3E0" : "#B8A18D";
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="3" width="14" height="18" rx="3.5"
        fill={fill} stroke={stroke} strokeWidth="1.7" />
      <path d="M9 8.5h6M9 12h4" stroke={linestroke} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function IconKitchen({ active }: { active: boolean }) {
  const fill = active ? "#E8A34A" : "none";
  const stroke = active ? "#E8A34A" : "#B8A18D";
  const linestroke = active ? "#FFF3E0" : "#B8A18D";
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path d="M4 12L12 4l8 8v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V12z"
        fill={fill} stroke={stroke} strokeWidth="1.7" strokeLinejoin="round" />
      <rect x="9.5" y="14" width="5" height="7" rx="2"
        fill={linestroke === "#FFF3E0" ? "#FFF3E0" : "none"}
        stroke={linestroke} strokeWidth="1.5" />
    </svg>
  );
}

const tabs = [
  { href: "/",        label: "点菜", Icon: IconOrder   },
  { href: "/shiji",   label: "食记", Icon: IconDiary   },
  { href: "/chufang", label: "厨房", Icon: IconKitchen },
];

// 登录前的公开页面和沉浸式流程页不显示底部导航
const HIDDEN_PATHS = ["/welcome", "/login", "/join", "/onboarding", "/privacy", "/terms"];

export default function BottomNav() {
  const pathname = usePathname();
  if (HIDDEN_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"))) return null;

  return (
    <nav style={{
      position: "fixed",
      bottom: 0,
      left: "50%",
      transform: "translateX(-50%)",
      width: "100%",
      maxWidth: "480px",
      backgroundColor: "rgba(255,255,255,0.92)",
      backdropFilter: "blur(10px)",
      WebkitBackdropFilter: "blur(10px)",
      borderTop: "1px solid #F1E2CC",
      boxShadow: "0 -4px 20px rgba(120,80,40,0.06)",
      zIndex: 50,
      paddingBottom: "env(safe-area-inset-bottom)",
    }}>
      <div style={{ display: "flex", height: "60px" }}>
        {tabs.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link key={href} href={href} style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: "3px", textDecoration: "none",
            }}>
              <Icon active={active} />
              <span style={{
                fontSize: "0.6875rem",
                fontWeight: active ? 800 : 400,
                color: active ? "#E8A34A" : "#B8A18D",
                lineHeight: 1,
              }}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
