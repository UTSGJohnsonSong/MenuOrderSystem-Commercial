# MenuOrderSystem（家庭点菜系统）

一个为家庭设计的私家菜单点菜应用。家人可以在手机上浏览菜品、点菜、查看历史食记，厨房一方可以管理菜品库。所有数据存储在云端数据库，多台设备打开同一个链接即可实时同步。

在线访问：[family-menu-indol.vercel.app](https://family-menu-indol.vercel.app)

## 功能介绍

### 🍽️ 点菜（首页 `/`）
- 按分类（早餐、米饭、面面、肉肉、菜菜、果果、甜甜、小药）浏览菜品
- 点击菜品卡片查看详情（食材、做法、备注）
- `+` / `-` 加减数量，加入今日菜单
- 自动记住上次浏览的分类（`sessionStorage`）
- 「今日菜单」弹窗：分组展示已选菜品，可一键复制文字发送给主厨，也可保存到食记
- 保存到食记后自动清空购物车

### 📖 食记（`/shiji`）
- 按月份分组展示历史点菜记录
- 每条记录显示日期、星期、菜品分类与数量
- 支持删除某天的记录
- 今天还没记录时会有提示

### 🧑‍🍳 厨房（`/chufang`）
- 添加 / 编辑 / 删除菜品
- **手机相册上传图片**：选择照片后自动压缩（最长边 800px，JPEG 75% 质量）后存储
- 菜品管理列表，按分类分组展示
- 数据看板：菜品总数、分类数量、今日已点份数

### 📱 PWA 支持
- 可「添加到主屏幕」，全屏运行，无浏览器地址栏
- 自定义图标（🦔🦥）
- 离线缓存（Service Worker）

## 跨设备同步

所有数据（菜品库、分类、购物车、食记）存储在 **Neon Postgres**（Serverless Postgres）数据库中，通过 Next.js API 路由读写。任何设备打开同一个链接，看到的都是同一份实时数据。

## 技术栈

- **框架**：Next.js 16（App Router + Turbopack）
- **语言**：TypeScript + React 19
- **数据库**：Neon Postgres（`@neondatabase/serverless`）
- **部署**：Vercel
- **样式**：内联样式（家庭暖色系视觉风格）

## 项目结构

```
app/
  page.tsx              # 点菜首页
  shiji/page.tsx        # 食记页
  chufang/page.tsx      # 厨房（菜品管理）
  api/
    categories/         # 分类接口
    items/              # 菜品 CRUD
    cart/                # 购物车读写
    logs/                # 食记 CRUD
components/
  ItemForm.tsx          # 添加/编辑菜品表单（含图片上传压缩）
  ItemDetailModal.tsx   # 菜品详情弹窗
  BottomNav.tsx         # 底部导航
lib/
  db.ts                 # 数据库连接
  store.ts              # 数据读写 Hooks（useStore / useCart / useMealLog）
  types.ts              # 类型定义
  data.ts               # 默认菜品数据（用于初始化种子数据）
scripts/
  setup-db.ts           # 数据库建表与种子数据脚本
```

## 本地开发

```bash
npm install

# 配置数据库连接（.env.local）
# DATABASE_URL=postgres://...

# 初始化数据库表结构与种子数据
npx tsx scripts/setup-db.ts

npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)

## 部署

项目已配置好 Vercel + Neon Postgres 集成，推送到 `main`/`master` 分支后可通过：

```bash
npx vercel --prod
```

部署到生产环境。
