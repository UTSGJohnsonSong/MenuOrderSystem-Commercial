import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "家庭菜单",
  description: "我们的私家菜单",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh">
      <body>
        <main className="pb-20">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
