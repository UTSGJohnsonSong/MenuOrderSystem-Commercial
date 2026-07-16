# 国内商用部署指南

从零到「国内用户可以稳定访问、可支撑万级用户」的完整清单。
代码部分已经全部就绪，本文档里 **标 🧑 的步骤需要你本人操作**（实名/备案/资质类，没法代办）。

---

## 总览：要办的事和时间线

| 事项 | 谁来做 | 耗时 | 费用 |
|---|---|---|---|
| 买服务器（腾讯云/阿里云） | 🧑 注册+实名，之后我可以帮你写脚本 | 半小时 | ¥100~300/月 |
| 买域名 + 实名 | 🧑 | 半小时 + 实名审核 1 天 | ¥50~80/年 |
| ICP 备案 | 🧑（云厂商后台引导式提交） | **2~4 周（管局审核）** | 免费 |
| 公安备案 | 🧑（网站上线后 30 天内） | 1~2 周 | 免费 |
| 短信签名/模板申请（腾讯云优先） | 🧑 | 1~2 天审核 | ¥0.04~0.05/条 |
| 部署应用（本文档第 3 节） | 我可以远程指导/写好脚本 | 1 小时 | — |

> 重要：**没备案的域名在国内服务器上无法通过 80/443 端口对外服务**（云厂商会拦截）。
> 所以正确顺序是：买服务器和域名 → 提交备案 → 等待期间用 IP:端口 或海外节点内测 → 备案通过后正式上线。

---

## 1. 服务器选型（1 万用户够用吗？）

这个应用的负载特征：每用户每天打开几次、每次十几个轻量 API 请求，图片走文件缓存。
1 万注册用户 ≈ 日活 2~3 千 ≈ 峰值 QPS 几十——**一台 2核4G 的轻量服务器绰绰有余**。

推荐（按省心程度）：

- **腾讯云轻量应用服务器** 2核4G，选「Docker CE」镜像，约 ¥112/月
- 阿里云 ECS 经济型 e 系列 2核4G 同理

安全组只放行 22（SSH）、80、443。数据库跑在 Docker 里不对外暴露端口。

以后如果真到了 10 万用户，再把 Postgres 迁到云数据库 RDS、图片迁到 OSS/COS——代码里 `lib/db.ts` 和 `app/api/upload/route.ts` 都是单点收口，各改一处即可。

## 2. 🧑 你需要办的三件事

### 2.1 ICP 备案（最先启动，因为最慢）
1. 在买服务器的云厂商（腾讯云/阿里云）后台搜「ICP 备案」，全程引导式
2. 需要：身份证、手机号、域名、服务器（备案要求包月 3 个月以上）
3. 个人备案即可起步；**网站名称不要带"商城/平台"等字样**，写「生活记录工具」类
4. 通过后拿到备案号（如 京ICP备2026XXXXXX号），填进 `.env` 的 `NEXT_PUBLIC_ICP_NUMBER`，会自动显示在落地页底部（法律要求）
5. 上线后 30 天内在 beian.mps.gov.cn 补公安备案

### 2.2 短信服务（腾讯云优先——服务器/域名/备案同账号，材料互认）

**腾讯云短信**（推荐，新用户送个人 100 条试用）：
1. 控制台开通「短信 SMS」→ 创建**应用**（拿到 SdkAppId）
2. 国内短信 → 申请**签名**（如「今天吃什么呀」，个人验证码类可申请）和**模板**：
   `您的验证码是{1}，5分钟内有效，请勿泄露。`
3. 访问管理 CAM → 创建子账号（编程访问）→ 只授权 `QcloudSMSFullAccess` → 拿 SecretId/SecretKey
4. 填入 `.env`：
   ```
   SMS_PROVIDER=tencent
   TENCENT_SECRET_ID=...
   TENCENT_SECRET_KEY=...
   TENCENT_SMS_SDK_APP_ID=1400XXXXXX
   TENCENT_SMS_SIGN_NAME=今天吃什么呀
   TENCENT_SMS_TEMPLATE_ID=XXXXXXX
   ```

**阿里云短信**（备选，`SMS_PROVIDER=aliyun`）：申请签名+模板 `您的验证码是${code}，5分钟内有效，请勿泄露。`，RAM 子账号只授权 dysmsapi，填 `ALIYUN_ACCESS_KEY_ID/SECRET`、`ALIYUN_SMS_SIGN_NAME`、`ALIYUN_SMS_TEMPLATE_CODE`。

代码已内置限流（同号 60 秒 1 条、24 小时 10 条），防止被刷短信费。

### 2.3 收款资质（以后再说）
当前版本完全免费，无支付功能。以后要收费时需要个体工商户或公司执照 + 微信支付/支付宝商户号，届时付费墙代码再加（数据库已预留 `member_limit` 等字段）。

## 3. 部署步骤（服务器上执行）

```bash
# 1. 装 Docker（腾讯云 Docker 镜像自带，跳过）
curl -fsSL https://get.docker.com | sh

# 2. 拉代码
git clone https://github.com/UTSGJohnsonSong/MenuOrderSystem-Commercial.git app && cd app

# 3. 配置环境变量
cp .env.example .env
vim .env   # 设置 DB_PASSWORD（随机长密码）、短信、备案号

# 4. 起服务（首次启动自动建表）
docker compose up -d --build

# 5. 验证
curl -s http://127.0.0.1:3000/api/auth/me   # 应返回 {"user":null}
```

### Nginx + HTTPS（备案通过后）

```bash
apt install -y nginx certbot python3-certbot-nginx
```

`/etc/nginx/sites-available/menuapp`：

```nginx
server {
    server_name 你的域名.com;
    listen 80;
    client_max_body_size 5m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/menuapp /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d 你的域名.com   # 自动配 HTTPS + 续期
```

## 4. 运维

### 每日自动备份（crontab -e）

```bash
# 每天凌晨 3 点备份数据库和图片，保留 14 天
0 3 * * * docker compose -f /root/app/docker-compose.yml exec -T db pg_dump -U menuapp menuapp | gzip > /root/backup/db-$(date +\%F).sql.gz && find /root/backup -mtime +14 -delete
0 4 * * * tar czf /root/backup/uploads-$(date +\%F).tar.gz -C /var/lib/docker/volumes/app_uploads/_data . 2>/dev/null
```

强烈建议再把 /root/backup 同步到对象存储（OSS/COS 有免费额度），防服务器整机故障。

### 更新版本

```bash
cd /root/app && git pull && docker compose up -d --build
```

### 看日志 / 排障

```bash
docker compose logs -f app        # 应用日志（含短信发送失败等）
docker compose exec db psql -U menuapp   # 直接进数据库
```

## 5. 上线前检查清单

- [ ] `.env` 里 `SMS_PROVIDER=tencent`（或 aliyun）且发送测试通过（console 模式在生产会直接报错，防呆）
- [ ] `DB_PASSWORD` 是随机长密码
- [ ] HTTPS 生效（验证码接口必须走 HTTPS）
- [ ] 落地页底部显示备案号
- [ ] 两个手机号各自注册，互相看不到对方的菜品（多租户隔离验收）
- [ ] A 空间的邀请码能让 B 加入，重置后旧码失效
- [ ] 数据库备份 cron 已配置且能恢复
- [ ] 隐私政策里的联系邮箱是你真实在用的
