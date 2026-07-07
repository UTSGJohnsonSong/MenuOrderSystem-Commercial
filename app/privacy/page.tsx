import Link from "next/link";

export const metadata = { title: "隐私政策 · 今天吃什么呀" };

const h2: React.CSSProperties = { color: "#2F241D", fontSize: "1rem", fontWeight: 800, marginTop: "24px", marginBottom: "8px" };
const p: React.CSSProperties = { color: "#6F5A48", fontSize: "0.875rem", lineHeight: 1.8 };

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: "100dvh", backgroundColor: "#FFF8EF", padding: "24px 24px 80px", maxWidth: "640px", margin: "0 auto" }}>
      <Link href="/welcome" style={{ color: "#9A7B5F", fontSize: "0.875rem", textDecoration: "none" }}>← 返回</Link>
      <h1 style={{ color: "#2F241D", fontSize: "1.375rem", fontWeight: 800, marginTop: "16px" }}>隐私政策</h1>
      <p style={{ ...p, marginTop: "8px", color: "#9A7B5F" }}>更新日期：2026年7月7日</p>

      <h2 style={h2}>我们收集的信息</h2>
      <p style={p}>
        我们只收集提供服务所必需的最少信息：<br />
        1. <strong>手机号</strong>：仅用于登录和账号识别。展示给小厨房成员时会脱敏（如 138****1234），我们不会用它发送营销短信。<br />
        2. <strong>您创建的内容</strong>：菜品（名称、食材、做法、备注、照片）、食记与备餐计划、小厨房名字和封面。<br />
        3. <strong>匿名使用统计</strong>：注册来源渠道（如「来自小红书」）、最近活跃时间、落地页访问次数。这些数据仅用于改进产品，
        <strong>不含任何可识别身份的信息，绝不用于广告或数据变现，也不与任何第三方共享</strong>。<br />
        4. <strong>安全日志</strong>：为防范攻击，服务器会记录必要的访问日志（IP、时间），以及验证码发送记录（用于防刷限流）。
      </p>

      <h2 style={h2}>我们不收集的信息</h2>
      <p style={p}>
        本应用不会以任何形式收集：您的真实姓名、身份证号等身份信息；精确地理位置；
        通讯录、短信、通话记录；设备唯一识别码（如 IDFA、IMEI）。我们也不接入任何第三方广告或统计 SDK。
      </p>

      <h2 style={h2}>谁能看到您的数据</h2>
      <p style={p}>
        · 您的菜单、食记、照片仅对<strong>您所在小厨房的成员</strong>可见，不同小厨房之间完全隔离。<br />
        · 我们的运营后台只统计数量（如注册数、菜品总数），<strong>不展示任何用户的菜单、食记或照片内容</strong>；
        除非您主动请求协助排查问题，我们不会查看您的内容。<br />
        · 我们不会向任何第三方出售或共享您的个人信息。
      </p>

      <h2 style={h2}>数据存储与安全</h2>
      <p style={p}>
        · 全部数据存储在位于中国境内的服务器上，每日备份。<br />
        · 登录凭证以加密哈希形式存储，即使发生数据泄露也无法伪造您的登录状态。<br />
        · 照片经压缩后存储，仅能通过不可枚举的随机链接访问。<br />
        · 正式上线后，全部数据传输均通过 HTTPS 加密完成。
      </p>

      <h2 style={h2}>第三方服务</h2>
      <p style={p}>
        发送验证码时，您的手机号会传递给短信服务商（阿里云短信）用于完成发送——这是登录功能必需的最小共享，
        短信服务商不会获得您的其他任何数据。除此之外，我们不与任何第三方共享数据。
      </p>

      <h2 style={h2}>您的权利</h2>
      <p style={p}>
        · <strong>删除内容</strong>：菜品、食记可随时在应用内删除。<br />
        · <strong>退出小厨房</strong>：设置页「退出这个小厨房」，退出后不再能访问该厨房数据。<br />
        · <strong>注销账号</strong>：设置页「危险操作 → 注销账号」，<strong>应用内自助、立即生效</strong>——您名下的小厨房将被解散，
        会话与验证码记录即刻删除，账号信息匿名化处理，手机号与您的数据彻底解绑，不可恢复。<br />
        · <strong>数据导出</strong>：如需导出您的菜单和食记，请邮件联系我们。<br />
        · <strong>投诉与异议</strong>：您可随时通过下方邮箱对我们的数据处理提出异议，或向有管辖权的监管机构投诉。
      </p>

      <h2 style={h2}>未成年人保护</h2>
      <p style={p}>
        本应用面向具备完全民事行为能力的用户。如您未满 14 周岁，请在监护人陪同和同意下使用。
      </p>

      <h2 style={h2}>政策更新</h2>
      <p style={p}>
        随着产品迭代或法律法规变化，我们可能更新本政策。如涉及数据使用范围的重大调整，
        我们会在应用内明显位置提示，并在征得您同意后才处理新增的数据类型。
      </p>

      <h2 style={h2}>联系我们</h2>
      <p style={p}>
        如您对本政策有任何疑问，或希望行使上述权利，请发邮件至 zeksong0914@gmail.com，
        我们会在 10 个工作日内答复并处理您的请求。
      </p>
    </div>
  );
}
