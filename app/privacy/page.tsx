import Link from "next/link";

export const metadata = { title: "隐私政策 · 今天吃什么呀" };

const h2: React.CSSProperties = { color: "#3A2A1A", fontSize: "1rem", fontWeight: 800, marginTop: "24px", marginBottom: "8px" };
const p: React.CSSProperties = { color: "#6B543F", fontSize: "0.875rem", lineHeight: 1.8 };

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: "100dvh", backgroundColor: "#FFF8EF", padding: "24px 24px 80px" }}>
      <Link href="/welcome" style={{ color: "#9A7B5F", fontSize: "0.875rem", textDecoration: "none" }}>← 返回</Link>
      <h1 style={{ color: "#3A2A1A", fontSize: "1.375rem", fontWeight: 800, marginTop: "16px" }}>隐私政策</h1>
      <p style={{ ...p, marginTop: "8px", color: "#9A7B5F" }}>更新日期：2026年7月3日</p>

      <h2 style={h2}>我们收集哪些信息</h2>
      <p style={p}>
        1. <strong>手机号</strong>：仅用于登录和账号识别，不会用于营销短信。<br />
        2. <strong>你创建的内容</strong>：菜品（名称、食材、做法、备注、图片）和点菜记录（食记）。<br />
        3. <strong>基础日志</strong>：为保障服务安全，服务器会记录必要的访问日志（IP、时间）。
      </p>

      <h2 style={h2}>信息如何使用与存储</h2>
      <p style={p}>
        你的菜单和食记仅对你所在小厨房的成员可见，我们不会向任何第三方出售或共享你的个人信息。
        所有数据存储在位于中国境内的服务器上，图片经压缩后存储，仅通过不可枚举的随机链接访问。
      </p>

      <h2 style={h2}>短信服务</h2>
      <p style={p}>
        发送验证码时，你的手机号会传递给短信服务商（如阿里云短信）用于完成发送，
        这是登录功能必需的最小共享。
      </p>

      <h2 style={h2}>如何删除数据</h2>
      <p style={p}>
        · 删除单个菜品或食记：在应用内直接操作即可。<br />
        · 退出小厨房：设置页「退出这个小厨房」。<br />
        · 注销账号并删除全部数据：通过下方联系方式联系我们，我们将在 15 个工作日内处理完毕。
      </p>

      <h2 style={h2}>联系我们</h2>
      <p style={p}>
        如对本政策有任何疑问，或需要注销账号，请发邮件至 zeksong0914@gmail.com。
      </p>
    </div>
  );
}
