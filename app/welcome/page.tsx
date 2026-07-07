import Link from "next/link";
import SourceTracker from "@/components/SourceTracker";

/*
 * 未登录访客的落地页。
 * 底部展示 ICP 备案号（NEXT_PUBLIC_ICP_NUMBER），国内域名备案后必须挂在首页。
 */
export default function WelcomePage() {
  const icp = process.env.NEXT_PUBLIC_ICP_NUMBER;

  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex", flexDirection: "column",
      background: "linear-gradient(180deg, #FFFDF8 0%, #FFF3E0 100%)",
      padding: "0 28px",
    }}>
      <SourceTracker />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingTop: "48px" }}>
        {/* 品牌图标：和 App 图标同源，落地页/登录页不断品牌 */}
        <img src="/icon.png" alt="" style={{
          width: "64px", height: "64px", borderRadius: "18px",
          marginBottom: "18px", display: "block",
          boxShadow: "0 4px 14px rgba(232,153,30,0.25)",
        }} />
        <h1 style={{ color: "#2F241D", fontSize: "1.75rem", fontWeight: 800, lineHeight: 1.3 }}>
          今天吃什么呀
        </h1>
        <p style={{ color: "#6F5A48", fontSize: "0.9375rem", marginTop: "12px", lineHeight: 1.7 }}>
          把 TA 会做的菜收进你们的小厨房。<br />
          想吃什么点一下，吃过的每一顿都记得。
        </p>

        <div style={{ marginTop: "32px", display: "flex", flexDirection: "column", gap: "14px" }}>
          {[
            ["🏠", "你们自己的小厨房", "把 TA 拉进来，菜单和食记都只属于你们"],
            ["🍜", "像点外卖一样点菜", "想吃什么点一下，今天掌勺的人马上知道"],
            ["📖", "吃过的每一顿都记得", "慢慢翻回去，全是你们一起生活的日子"],
          ].map(([icon, title, desc]) => (
            <div key={title} style={{
              display: "flex", gap: "14px", alignItems: "flex-start",
              backgroundColor: "#FFFFFF", borderRadius: "18px", padding: "16px",
              border: "1.5px solid rgba(240,216,180,0.7)",
              boxShadow: "0 4px 14px rgba(120,80,40,0.06)",
            }}>
              {/* emoji 统一进 40px 奶油圆底，消除系统 emoji 的大小跳动 */}
              <span style={{
                width: "40px", height: "40px", borderRadius: "50%", flexShrink: 0,
                backgroundColor: "#FFF1DD",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.375rem", lineHeight: 1,
              }}>{icon}</span>
              <div>
                <p style={{ color: "#2F241D", fontSize: "0.9375rem", fontWeight: 700 }}>{title}</p>
                <p style={{ color: "#6F5A48", fontSize: "0.8125rem", marginTop: "3px", lineHeight: 1.5 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <Link href="/login" style={{
          marginTop: "32px",
          display: "block", textAlign: "center",
          padding: "16px", borderRadius: "14px",
          background: "linear-gradient(180deg, #F5B460 0%, #E8991E 100%)",
          color: "#FFFFFF", fontSize: "1rem", fontWeight: 700,
          textDecoration: "none",
          boxShadow: "0 6px 20px rgba(232,153,30,0.4)",
        }}>
          创建我们的小厨房
        </Link>
        <p style={{ textAlign: "center", color: "#A58A72", fontSize: "0.75rem", marginTop: "12px" }}>
          手机号登录 · 现在免费使用
        </p>
      </div>

      <footer style={{ padding: "24px 0 20px", textAlign: "center" }}>
        <p style={{ fontSize: "0.6875rem", color: "#C8A878" }}>
          <Link href="/terms" style={{ color: "#C8A878" }}>用户协议</Link>
          {" · "}
          <Link href="/privacy" style={{ color: "#C8A878" }}>隐私政策</Link>
          {" · "}
          <Link href="/install" style={{ color: "#C8A878" }}>添加到主屏幕</Link>
        </p>
        {icp && (
          <p style={{ fontSize: "0.6875rem", color: "#D6BC9C", marginTop: "6px" }}>
            <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer" style={{ color: "#D6BC9C" }}>
              {icp}
            </a>
          </p>
        )}
      </footer>
    </div>
  );
}
