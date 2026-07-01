# 商用化改造 Plan —— "今天吃什么呀"(暂定名)/ 我们的小厨房

> 版本:v2(吸收第一轮反馈后修订)
> 基础代码:`family-menu-commercial`(独立 Vercel 项目 + 独立 Neon 数据库,已与私人版解耦)
> 目标用户:普通消费者——情侣、室友、小家庭,每组用户拥有自己独立的"空间"(菜单库 + 点菜记录),互不可见
> 商业模式:免费增值(Freemium),核心功能永久免费,成员数/菜品数/图片上传等能力付费解锁
> 产品调性:**这是一个生活化、有情绪价值的小工具,不是 SaaS 后台**。所有商业化功能必须"藏在后面",不能让第一次打开的人有"企业软件"的感觉。

已验证:当前 `family-menu-commercial` 数据库里的种子数据(`lib/data.ts`)是通用公开菜谱 + Unsplash 公共图片,**不含你们私人的真实食记/照片**,可以放心作为陌生用户的默认体验,不存在隐私泄露。

---

## 0. 战略判断(先对齐,再看细节)

1. MVP = Phase 1(多租户)+ Phase 2(登录邀请)+ 简化版 Phase 4(品牌门面)。不做复杂支付、不做多空间切换 UI、不做管理后台。
2. 上线前要验证的只有三件事:陌生人愿不愿意注册 → 愿不愿意邀请对象/室友 → 用了一段时间后是否真的会因为容量/图片/分类而付费。想清楚这三件事之前,别投入支付网关和复杂后台。
3. 商业化功能的呈现方式:不是"Upgrade to Pro"弹窗轰炸,而是用到边界时才温柔地出现一次,文案要有生活感(例子见第 8 节)。

---

## 1. Phase 1 — 多租户数据模型改造

### 1.1 新增表

```sql
CREATE TABLE users (
  id            TEXT PRIMARY KEY,        -- 对应 Clerk 的 user id
  email         TEXT,
  active_space_id UUID,                  -- 当前激活空间；数据库层不强制"一人一空间"
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE spaces (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL DEFAULT '我们的小厨房',
  invite_code   TEXT UNIQUE NOT NULL,
  plan          TEXT NOT NULL DEFAULT 'free',   -- 'free' | 'paid'
  member_limit  INT NOT NULL DEFAULT 2,          -- 免费版默认 2 人
  owner_id      TEXT NOT NULL REFERENCES users(id),
  upgraded_at   TIMESTAMPTZ,
  deleted_at    TIMESTAMPTZ,                     -- 软删除，不做硬删
  settings      JSONB NOT NULL DEFAULT '{}',     -- 预留：主题文案、是否显示食记等零碎配置
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE space_members (
  space_id      UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'member', -- 'owner' | 'member'
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (space_id, user_id)
);

-- 人工收款留痕（v1 没有支付网关时的商业闭环）
CREATE TABLE payments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id    UUID NOT NULL REFERENCES spaces(id),
  amount      NUMERIC NOT NULL,
  method      TEXT NOT NULL,   -- 'manual' | 'wechat' | 'stripe'
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 谁、什么时候、手动改过什么——人工运营必备
CREATE TABLE admin_actions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id TEXT,
  space_id      UUID REFERENCES spaces(id),
  action        TEXT NOT NULL,   -- 'mark_paid' | 'reset_invite_code' | 'refund' | 'ban_space' | 'restore_space'
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

`space_members` 天然是多对多，v1 前端只用 `active_space_id` 展示一个空间，但不在数据库层写死"一人一空间"的约束——这样以后要做"我和对象的空间 / 我和室友的空间"不需要再迁移一次表结构。

### 1.2 改造现有表

```sql
ALTER TABLE categories ADD COLUMN space_id UUID REFERENCES spaces(id);

ALTER TABLE items
  ADD COLUMN space_id UUID REFERENCES spaces(id),
  ADD COLUMN created_by TEXT REFERENCES users(id),
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT false;  -- 菜品不做硬删除，避免破坏历史食记的关联

ALTER TABLE cart  ADD COLUMN space_id UUID REFERENCES spaces(id);
ALTER TABLE logs  ADD COLUMN space_id UUID REFERENCES spaces(id);

-- 迁移期结束后（确认没有历史空数据）再加 NOT NULL 约束 + 索引
CREATE INDEX idx_items_space ON items(space_id);
CREATE INDEX idx_categories_space ON categories(space_id);
```

`is_archived` 很重要：用户删除菜品时只做隐藏，不做物理删除，否则会破坏历史食记里对这个菜品的引用。

### 1.3 迁移脚本

`scripts/migrate-to-multitenant.ts`:
1. 建上述新表
2. 把当前 `family-menu-commercial` 里已有的**通用种子数据**（已确认是公开菜谱，非私人内容）整体挂到一个 demo 空间下，作为"模板"来源，而不是直接当成某个真实用户的数据
3. 补 `NOT NULL` 约束和索引

**红线**：私人版（`点菜APP在这/family-menu`）的真实数据（你们的食记、照片、备注）任何时候都不导入 commercial 数据库。两边数据库物理隔离，代码库也不共享 `.env.local`，从架构上杜绝误操作。

### 1.4 API 层改造 —— 用 helper 强制收口，而不是每个 route 手写

不要让每个 API route 自己写 `WHERE space_id = ...`，容易漏。统一收口成一个 helper：

```ts
// lib/auth.ts
export async function requireCurrentSpace() {
  const { userId } = auth(); // Clerk
  if (!userId) throw new UnauthorizedError();
  const spaceId = await getActiveSpaceId(userId); // 查 users.active_space_id
  if (!spaceId) throw new NoSpaceError(); // 引导去 onboarding
  return { userId, spaceId };
}
```

所有 API route 第一行必须调用它拿 `spaceId`，后续 SQL 一律用这个变量，不允许从 query string / body 里信任前端传来的 `space_id`。

**中期加固（v1 之后再做，不阻塞上线）**：评估 Postgres Row-Level Security 作为第二层防线——给每个连接 `SET app.current_space_id`，表上加 `USING (space_id = current_setting('app.current_space_id')::uuid)` 的 policy。这个在 Neon serverless 驱动下需要额外处理连接级 session 变量，v1 先不做，等 API 层跑稳、有真实用户之后再补，避免一开始就把工程量堆太高。

**验收标准**：两个不同账号各自建空间，互相看不到对方的菜品/点菜记录；用 Postman 尝试用 A 账号的 token 访问 B 账号的 `item_id`，应返回 404/403 而非数据。

---

## 2. Phase 2 — 登录与邀请机制

### 2.1 Auth 方案
Clerk（Vercel Marketplace 原生集成，`vercel integration add clerk`），邮箱验证码登录即可，不需要自己写密码系统。

### 2.2 体验原则：登录感要轻，不要一上来就是表单
未登录访问 `/`：好看的落地页，一句话说清楚是什么 → 点击"创建我们的小厨房" → 才弹登录 → 登录后自动建空间，**不需要用户手填任何 workspace 名称之类的字段**。

第一屏文案示例（不要用"Workspace created"这种系统感语言）：

> 你们的小厨房已经准备好啦 🏠
> 现在可以邀请 TA 一起点菜。

### 2.3 邀请机制（v1 简化版，不做过期邀请码表）
- 每个空间保留一个 `invite_code`（6 位），设置页里可以"重置邀请码"（重置后旧码失效，防止被转发出去后长期暴露）
- 加入时校验空间当前成员数 `< member_limit`，超过则提示"这个小厨房已经满啦，需要空间主人升级"
- 成员数上限本身就是一个天然付费点（见第 3 节）

v1 不做独立的 `space_invites` 表（多码、限次数、过期时间那套），复杂度对当前阶段不划算；如果以后发现邀请码被滥用分享，再加。

### 2.4 需要新增的页面
- `/onboarding`：登录后自动建空间 → 展示邀请码/邀请链接
- `/join?code=xxx`：处理邀请链接，校验成员数上限
- 设置页轻量入口（不要做企业感的侧边栏），右上角一个入口："我们的小厨房 · 邀请"，点进去是设置页，包含：
  1. 空间名称
  2. 邀请对象/室友（邀请码 + 重置按钮）
  3. 当前版本：免费版 / 已解锁
  4. 数据与隐私（导出/删除说明）

---

## 3. Phase 3 — 付费点（Freemium，重新校准过的限额）

### 3.1 分级规则

| 能力 | 免费版 | 付费版 |
|---|---|---|
| 点菜 / 食记 | ✅ 永久无限 | ✅ |
| 成员数 | 2 人（情侣场景） | 6~8 人 |
| 菜品数量 | 30 个 | 无限 |
| 图片上传 | 每个空间 5 张 | 无限 |
| 分类 | 默认 8 个 + 最多 2 个自定义 | 无限自定义 |

调整依据：原来 20 个菜品上限太容易碰到，用户还没对这个空间产生情感连接就被拦住，付费意愿反而会降低。现在的目标是"免费版足够情侣认真用一段时间，直到它变成真正的长期菜单库才需要付费"。

### 3.2 支付方式 —— **v1 决定：人工收款（方案 C）**

不接支付网关，先用最小成本验证付费意愿：设置页展示"解锁完整小厨房 · ¥19.9（一次性）"+ 一个联系方式（微信/邮箱），用户转账后，你在 `admin_actions` 里手动执行 `mark_paid`，把对应 `spaces.plan` 改成 `paid`、`upgraded_at` 记录时间。

价格参考（先用一个价格测试，不用一次定死）：
- 国内：早鸟 ¥9.9~19.9，正式 ¥29.9~39.9，一次性买断（不做订阅——这个产品目前还没重到需要按月付费）
- 海外：CAD $4.99~6.99 one-time

跑出真实付费数据后再决定要不要接微信支付/支付宝（需要个体工商户或公司资质）或 Stripe（面向海外用户，国内银行卡基本用不了）。

### 3.3 付费墙触发方式（体验层面的关键）
不要常驻显示"升级"按钮。只在真正碰到边界时，用生活化文案弹一次：

> 你们已经收藏了 30 道菜啦 🍲
> 解锁完整小厨房后，可以继续添加更多菜、上传图片、创建分类。
> [解锁完整小厨房]

成员数超限、图片超限同理，各自有一句对应的生活化提示，而不是统一甩一个"Upgrade to Pro"。

---

## 4. Phase 4 — 品牌与门面

### 4.1 命名建议
- App 名（对外）：**今天吃什么呀**（副标题：和对象、室友一起维护你们自己的菜单库）
- 空间内部叫法：**我们的小厨房**

理由：这个产品的核心不是"家庭空间"（太大、太泛，容易让人联想到智能家居/家庭相册类产品），而是"两个人一起决定吃什么、并沉淀自己的菜单库"这件更小、更亲密的事。这个名字仍是建议，最终拍板权在你。

### 4.2 落地页 / PWA
- 落地页：一句话价值主张 + 免费能干嘛 + 付费解锁什么 + 登录入口
- 换 PWA 图标、`manifest.json` 的 `name`/`short_name`、Service Worker 缓存名
- 换独立域名指向 `family-menu-commercial` 项目

### 4.3 新空间的默认体验（避免"打开是空的"）
新建空间时，自动把 `lib/data.ts` 里的通用菜谱模板复制一份到新空间的 `categories`/`items` 里（已确认这些是通用公开数据，可以放心作为所有新用户的起点），用户可以自由编辑/删除。v1 不需要单独抽象一套 `template_categories`/`template_items` 表，直接复用现有 `lib/data.ts` 作为模板源即可，等以后要做"多套主题模板"再重构。

---

## 5. Phase 5 — 法务与合规

上线前至少需要三个页面：`/privacy`、`/terms`、设置页里的"删除空间/数据导出说明"。

需要写清楚的点：存了哪些数据（邮箱、菜品、点菜记录、可能的图片）、留存方式、如何删除。情侣/室友的点菜记录虽然不是医疗金融级敏感数据，但仍是私人生活数据，认真对待。

如果之后要真实收款：国内收款需要个体工商户或公司资质。

---

## 6. Phase 6 — 基础设施 / 运维

- 已完成：独立 Vercel 项目 + 独立 Neon 数据库
- 待办：
  - 邀请码校验加基础限流，防止被脚本批量尝试
  - 关注 Neon 免费额度（多租户后行数会明显增长）
  - 出问题时先看 Vercel 自带 Logs，用户量大了再上 Sentry

---

## 7. 实施优先级（按开发顺序排列）

| 优先级 | 内容 | 说明 |
|---|---|---|
| P0 | 确认 commercial 数据库不含私人数据（已验证：种子数据是公开菜谱，安全） | 防隐私事故 |
| P0 | 新增 `users`/`spaces`/`space_members`/`payments`/`admin_actions` | 多租户地基 + 商业闭环留痕 |
| P0 | 所有表加 `space_id`，`items` 加 `is_archived`/`created_by`/`updated_at` | 核心数据隔离 |
| P0 | Clerk 登录 + `requireCurrentSpace()` helper（所有 API 收口） | 统一身份入口，杜绝越权漏洞 |
| P0 | Onboarding：登录后自动建空间 + 自动填充默认菜谱模板 | 陌生人打开不是空的 |
| P1 | 邀请码 + 成员数上限校验 | 多人使用核心 + 天然付费点 |
| P1 | 设置页（空间名/邀请/版本/隐私说明） | 商用外壳，保持克制 |
| P2 | 免费限额校验（30 菜品/5 图片/2 自定义分类）+ 生活化文案的解锁弹窗 | 验证付费意愿 |
| P2 | 人工收款 + `admin_actions.mark_paid` | 最小商业闭环，不接支付网关 |
| P3 | `/privacy` `/terms` 页面 | 真实对外公开前必须补齐 |
| P3 | RLS 第二层防线、限流、监控、备份 | 有真实用户后再加强，不阻塞 MVP |

**MVP 范围** = 所有 P0 + P1。P2 决定商业模式是否成立，P3 是长期运营加固，不阻塞第一批陌生用户使用。

---

## 8. 待你最终拍板的开放问题

1. **产品名**：是否采用"今天吃什么呀"+"我们的小厨房"，还是有别的想法？
2. **付费定价**：早鸟价具体定多少（¥9.9 / ¥19.9 / 其他）？
3. **免费版限额**是否认可（30 菜品 / 2 成员 / 5 张图 / 2 自定义分类)，还是要再调？
4. **谁来当"人工客服"**接收付款消息并执行 `mark_paid`——是你自己出面还是需要留一个统一的收款联系方式？

想好这几点后，我们就可以直接开始写 Phase 1 的迁移脚本和 API 改造了。
