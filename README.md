# 今天吃什么呀（MenuOrderSystem-Commercial）

和对象、室友一起维护你们自己的菜单库：想吃什么点一点，吃过什么都记得。
多租户商用版——每组用户拥有独立的「小厨房」（菜单库 + 食记），手机验证码登录，互不可见。

国内部署与备案指南见 **[DEPLOY_CN.md](./DEPLOY_CN.md)**；产品规划见 [COMMERCIALIZATION_PLAN.md](./COMMERCIALIZATION_PLAN.md)。

## 功能

### 🏠 小厨房（多租户）
- 手机验证码登录，首次登录自动创建自己的小厨房（自带家常菜谱模板）
- 6 位邀请码 / 邀请链接拉 TA 加入，可重置；成员上限 8 人
- 所有数据按空间隔离，API 层统一 `requireCurrentSpace()` 收口

### 🍽️ 点菜（`/`）
- 按分类浏览菜品，点卡片看详情（食材、做法、备注）
- 加减数量组成「今日菜单」，一键复制发给主厨，或保存到食记

### 📖 食记（`/shiji`）
- 按月分组的历史点菜记录，同一天重复保存自动覆盖

### 🧑‍🍳 厨房（`/chufang`）
- 添加 / 编辑 / 归档菜品；相册选图自动压缩后上传（文件存储，不占数据库）
- 小厨房设置：改名、邀请码、成员管理、退出

### 其他
- PWA：可添加到主屏幕、离线缓存（API 不缓存，不串数据）
- `/privacy` `/terms` 法务页；落地页底部展示 ICP 备案号（`NEXT_PUBLIC_ICP_NUMBER`）

## 技术栈

- Next.js 16（App Router）+ TypeScript + React 19
- Postgres（node-postgres，任何 Postgres 都能连：本地 Docker / 腾讯云 / 阿里云 RDS / Neon）
- 自建手机验证码登录（阿里云短信，可扩展其他厂商），会话存库（token 只存哈希）
- Docker 部署（standalone 输出，见 `Dockerfile` / `docker-compose.yml`）

## 项目结构

```
app/
  welcome/ login/ onboarding/ join/     # 登录与邀请流程
  settings/ privacy/ terms/             # 设置与法务页
  page.tsx shiji/ chufang/              # 点菜 / 食记 / 厨房
  api/
    auth/                               # send-code / verify / logout / me
    space/                              # 空间信息 / 加入 / 退出 / 邀请码 / 预览
    categories/ items/ logs/            # 业务数据（全部按空间隔离）
    upload/ uploads/                    # 图片上传与访问
lib/
  db.ts        # pg 连接池 + sql`` 模板 + 事务
  schema.ts    # 幂等建表（启动自动执行）
  auth.ts      # 会话 / requireCurrentSpace / 错误处理
  sms.ts       # 短信通道（console / aliyun）
  space.ts     # 建空间 / 邀请码 / 加入
proxy.ts       # 未登录访客重定向到落地页
```

## 本地开发

```bash
npm install

# 起个本地 Postgres
docker run -d --name menudb -p 5432:5432 -e POSTGRES_PASSWORD=dev postgres:16-alpine

cp .env.example .env.local   # 默认连上面的本地库，短信走 console 模式

npm run dev                  # 首次启动自动建表
```

打开 http://localhost:3000 —— 开发模式下验证码直接显示在登录页，随便填个手机号即可体验完整流程。

## 生产部署

```bash
cp .env.example .env   # 配好 DB_PASSWORD / 阿里云短信 / 备案号
docker compose up -d --build
```

详细步骤（服务器选型、Nginx + HTTPS、ICP 备案、短信签名申请、备份）见 [DEPLOY_CN.md](./DEPLOY_CN.md)。
