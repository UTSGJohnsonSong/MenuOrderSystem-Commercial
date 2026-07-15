#!/bin/bash
# ============================================================
# 备案通过日的一键上线脚本（在服务器上执行）：
#   ssh -i ~/.ssh/menuapp_deploy ubuntu@175.27.240.113
#   cd ~/app && sudo bash deploy/golive.sh
#
# 前置（脚本会逐项检查，不满足会停下来告诉你改什么）：
#   1. ~/app/.env 里已填：NEXT_PUBLIC_ICP_NUMBER（备案号）、
#      SMS_PROVIDER=aliyun + 四个 ALIYUN_ 变量（M4 办完）
#   2. .env 里已删除/注释 SMS_CONSOLE_IN_PROD（内测开关）
#   3. 域名 chishenmeya.cn 的 A 记录已指向本机（早就配好了）
# ============================================================
set -euo pipefail

APP_DIR=/home/ubuntu/app
DOMAIN=chishenmeya.cn
cd "$APP_DIR"

echo "== 0. 检查 .env =="
fail=0
grep -q '^NEXT_PUBLIC_ICP_NUMBER=..*' .env || { echo "❌ .env 缺 NEXT_PUBLIC_ICP_NUMBER（备案号）"; fail=1; }
grep -q '^SMS_PROVIDER=aliyun' .env       || { echo "❌ .env 里 SMS_PROVIDER 不是 aliyun"; fail=1; }
for k in ALIYUN_ACCESS_KEY_ID ALIYUN_ACCESS_KEY_SECRET ALIYUN_SMS_SIGN_NAME ALIYUN_SMS_TEMPLATE_CODE; do
  grep -q "^$k=..*" .env || { echo "❌ .env 缺 $k"; fail=1; }
done
if grep -q '^SMS_CONSOLE_IN_PROD=1' .env; then
  echo "❌ .env 里还开着内测短信开关 SMS_CONSOLE_IN_PROD，请删除该行"; fail=1
fi
[ "$fail" = "1" ] && { echo "先把上面的 .env 项改好，再重新跑本脚本"; exit 1; }
echo "✅ .env 检查通过"

echo "== 1. 关闭内测 3000 端口直连 =="
rm -f docker-compose.override.yml && echo "✅ 已删 override（3000 口不再对外）"
echo "   ⚠️ 记得去腾讯云控制台安全组把 3000 的放行规则删掉"

echo "== 2. 重新构建（把备案号固化进页面）并重启 =="
docker compose up -d --build

echo "== 3. 安装 Nginx + HTTPS =="
apt-get update -qq && apt-get install -y -qq nginx certbot python3-certbot-nginx
cp deploy/nginx-chishenmeya.conf /etc/nginx/sites-available/menuapp
ln -sf /etc/nginx/sites-available/menuapp /etc/nginx/sites-enabled/menuapp
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
# certbot 自动改写 nginx 配置加 443 并配好自动续期
certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --redirect \
  --non-interactive --agree-tos -m zeksong0914@gmail.com

echo "== 4. 安装每日备份 cron（凌晨 3 点，保留 14 天）=="
chmod +x deploy/backup.sh
( crontab -l 2>/dev/null | grep -v deploy/backup.sh ; echo "0 3 * * * bash $APP_DIR/deploy/backup.sh >> /home/ubuntu/backup/backup.log 2>&1" ) | crontab -
echo "✅ cron 已装（root）。先手动跑一次验证："
bash deploy/backup.sh

echo ""
echo "== 5. 自动验收 =="
sleep 3
curl -sf "https://$DOMAIN/api/auth/me" > /dev/null && echo "✅ HTTPS + API 正常" || echo "❌ https://$DOMAIN/api/auth/me 不通，查 docker compose logs app"
curl -s "https://$DOMAIN/welcome" | grep -q "ICP" && echo "✅ 落地页备案号已显示" || echo "❌ 落地页没看到备案号（检查 .env 后需 --build 重建）"

cat <<'EOF'

============================================================
剩下的人工验收（DEPLOY_CN.md 第 5 节）：
  [ ] 真手机收短信登录一次（阿里云短信实发）
  [ ] 两个手机号各自注册，互相看不到对方的菜（多租户隔离)
  [ ] A 的邀请码让 B 加入；重置后旧码失效
  [ ] 备份恢复演练一次（方法见 deploy/backup.sh 底部注释）
  [ ] 30 天内提交公安备案 beian.mps.gov.cn（M11）
============================================================
EOF
