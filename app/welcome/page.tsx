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
        <div style={{ fontSize: "3.5rem", marginBottom: "18px" }}>🍲</div>
        <h1 style={{ color: "#3A2A1A", fontSize: "1.75rem", fontWeight: 800, lineHeight: 1.3 }}>
          今天吃什么呀
        </h1>
        <p style={{ color: "#9A7B5F", fontSize: "0.9375rem", marginTop: "12px", lineHeight: 1.7 }}>
          和对象、室友一起维护你们自己的菜单库。<br />
          想吃什么点一点，吃过什么都记得。
        </p>

        <div style={{ marginTop: "36px", display: "flex", flexDirection: "column", gap: "14px" }}>
          {[
            ["🏠", "你们的小厨房", "一人建厨房，邀请 TA 加入，菜单和食记只属于你们"],
            ["🍜", "像点外卖一样点菜", "选好想吃的，一键发给今天掌勺的人"],
            ["📖", "每天好好吃饭", "每一顿都自动记成食记，翻翻你们吃过的日子"],
          ].map(([icon, title, desc]) => (
            <div key={title} style={{
              display: "flex", gap: "14px", alignItems: "flex-start",
              backgroundColor: "#FFFFFF", borderRadius: "18px", padding: "16px",
              border: "1.5px solid rgba(240,210,170,0.5)",
              boxShadow: "0 4px 14px rgba(120,80,40,0.06)",
            }}>
              <span style={{ fontSize: "1.5rem" }}>{icon}</span>
              <div>
                <p style={{ color: "#3A2A1A", fontSize: "0.9375rem", fontWeight: 700 }}>{title}</p>
                <p style={{ color: "#9A7B5F", fontSize: "0.8125rem", marginTop: "3px", lineHeight: 1.5 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <Link href="/login" style={{
          marginTop: "36px",
          display: "block", textAlign: "center",
          padding: "16px", borderRadius: "18px",
          background: "linear-gradient(180deg, #F5B460 0%, #E8991E 100%)",
          color: "#FFFFFF", fontSize: "1rem", fontWeight: 700,
          textDecoration: "none",
          boxShadow: "0 6px 20px rgba(232,153,30,0.4)",
        }}>
          创建我们的小厨房
        </Link>
        <p style={{ textAlign: "center", color: "#C8A878", fontSize: "0.75rem", marginTop: "12px" }}>
          手机号登录，免费使用
        </p>
      </div>

      <footer style={{ padding: "24px 0 20px", textAlign: "center" }}>
        <p style={{ fontSize: "0.6875rem", color: "#C8A878" }}>
          <Link href="/terms" style={{ color: "#C8A878" }}>用户协议</Link>
          {" · "}
          <Link href="/privacy" style={{ color: "#C8A878" }}>隐私政策</Link>
          {" · "}
          <Link href="/install" style={{ color: "#C8A878" }}>放到手机桌面</Link>
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
