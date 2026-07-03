import Link from "next/link";

export const metadata = { title: "用户协议 · 今天吃什么呀" };

const h2: React.CSSProperties = { color: "#3A2A1A", fontSize: "1rem", fontWeight: 800, marginTop: "24px", marginBottom: "8px" };
const p: React.CSSProperties = { color: "#6B543F", fontSize: "0.875rem", lineHeight: 1.8 };

export default function TermsPage() {
  return (
    <div style={{ minHeight: "100dvh", backgroundColor: "#FFF8EF", padding: "24px 24px 80px" }}>
      <Link href="/welcome" style={{ color: "#9A7B5F", fontSize: "0.875rem", textDecoration: "none" }}>← 返回</Link>
      <h1 style={{ color: "#3A2A1A", fontSize: "1.375rem", fontWeight: 800, marginTop: "16px" }}>用户协议</h1>
      <p style={{ ...p, marginTop: "8px", color: "#9A7B5F" }}>更新日期：2026年7月3日</p>

      <h2 style={h2}>1. 服务说明</h2>
      <p style={p}>
        「今天吃什么呀」是一款供情侣、室友、家庭成员共同维护菜单和点菜记录的生活工具。
        当前所有功能免费提供；未来如推出付费能力，会提前在应用内明确告知，不会影响已有的免费功能。
      </p>

      <h2 style={h2}>2. 账号</h2>
      <p style={p}>
        使用手机号验证码登录即完成注册。请妥善保管你的手机号和验证码，
        因主动泄露验证码导致的损失需自行承担。
      </p>

      <h2 style={h2}>3. 用户内容</h2>
      <p style={p}>
        你在小厨房里创建的菜品、图片和食记归你所有。你上传的内容不得违反中华人民共和国相关法律法规，
        不得包含侵权、违法或不当信息；违规内容我们有权删除，情节严重的将封禁相关账号。
      </p>

      <h2 style={h2}>4. 服务变更与终止</h2>
      <p style={p}>
        我们会尽力保障服务稳定运行，但不对不可抗力导致的服务中断承担责任。
        如计划停止服务，我们将提前 30 天公告，并提供数据导出途径。
      </p>

      <h2 style={h2}>5. 联系方式</h2>
      <p style={p}>
        对本协议有任何疑问，请发邮件至 zeksong0914@gmail.com。
      </p>
    </div>
  );
}
