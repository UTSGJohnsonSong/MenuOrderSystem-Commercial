#!/bin/bash
# ============================================================
# 上线脚本（在服务器上执行）：
#   ssh -i ~/.ssh/menuapp_deploy ubuntu@175.27.240.113
#   cd ~/app && sudo bash deploy/golive.sh [--stage1]
#
# 两种模式：
#   --stage1  阶段一上线：域名 + HTTPS + 备案号 + 备份，短信仍走内测
#             console 模式（验证码只进服务器日志，陌生用户注册不了）。
#             用在备案已过、短信签名还没批下来的窗口期。
#   （无参数）完整上线：要求真实短信通道已接通，对外开放注册。
#
# 前置（脚本会逐项检查，不满足会停下来告诉你改什么）：
#   1. ~/app/.env 里已填 NEXT_PUBLIC_ICP_NUMBER（备案号）
#   2. 短信：完整模式要 SMS_PROVIDER=tencent/aliyun + 对应密钥；
#           阶段一模式要 SMS_CONSOLE_IN_PROD=1（否则生产环境
#           sendSmsCode 直接抛错，谁都登不进去，见 lib/sms.ts）
#   3. chishenmeya.cn 和 www 的 A 记录都已指向本机（脚本会验）
#
# 安全顺序：内测 3000 端口留到 HTTPS 确认可用之后才关闭，
# 中途任何一步失败都不会让站点失联。
# ============================================================
set -euo pipefail

APP_DIR=/home/ubuntu/app
DOMAIN=chishenmeya.cn
EXPECT_IP=175.27.240.113   # 本机公网 IP，换服务器时改这里
CERTBOT_EMAIL=zeksong0914@gmail.com

STAGE1=0
[ "${1:-}" = "--stage1" ] && STAGE1=1

# 实际生效的短信通道，由第 0 步按 .env 的真实内容决定，不等同于命令行参数：
# 带 --stage1 跑、但 .env 里已经填好 SMS_PROVIDER=tencent 时，走的是真实通道。
SMS_MODE=""

cd "$APP_DIR"

# 失败提示里"还能从 3000 口进"这句话不能写死。基础 docker-compose.yml 绑的是
# 127.0.0.1:3000（只监听本机），外网能进 3000 完全依赖 docker-compose.override.yml；
# 而本脚本成功跑完一次就会把 override 停用。写死那句话，会在重跑失败时
# 把人指向一个根本不存在的入口——人在国外只有 SSH，这个误导代价很大。
fallback_hint() {
  local listening=""
  listening=$(ss -lnt 2>/dev/null | awk '{print $4}' \
              | grep -E '(^0\.0\.0\.0|^\*|^\[::\]):3000$' || true)
  if [ -f "$APP_DIR/docker-compose.override.yml" ] && [ -n "$listening" ]; then
    echo "   站点未失联：内测口 http://$EXPECT_IP:3000 仍在对外监听。"
  else
    echo "   ⚠️ 内测 3000 口没有对外监听，当前没有备用 web 入口。"
    echo "      应急重开：cd $APP_DIR \\"
    echo "        && mv -f docker-compose.override.yml.disabled docker-compose.override.yml \\"
    echo "        && docker compose up -d"
  fi
}

if [ "$STAGE1" = "1" ]; then
  echo "🚧 阶段一模式：短信走内测 console，不对外开放注册"
else
  echo "🚀 完整上线模式：要求真实短信通道"
fi
echo ""

echo "== 0. 检查 .env =="
[ -f .env ] || {
  echo "❌ $APP_DIR/.env 不存在。先从 .env.example 复制并填好，再跑本脚本"
  exit 1
}

fail=0
grep -q '^NEXT_PUBLIC_ICP_NUMBER=..*' .env || { echo "❌ .env 缺 NEXT_PUBLIC_ICP_NUMBER（备案号）"; fail=1; }

if grep -q '^SMS_PROVIDER=tencent' .env; then
  for k in TENCENT_SECRET_ID TENCENT_SECRET_KEY TENCENT_SMS_SDK_APP_ID TENCENT_SMS_SIGN_NAME TENCENT_SMS_TEMPLATE_ID; do
    grep -q "^$k=..*" .env || { echo "❌ .env 缺 $k"; fail=1; }
  done
  grep -q '^SMS_CONSOLE_IN_PROD=1' .env && { echo "❌ 真实短信通道已配，但 SMS_CONSOLE_IN_PROD 还开着，请删除该行"; fail=1; }
  SMS_MODE=real
elif grep -q '^SMS_PROVIDER=aliyun' .env; then
  for k in ALIYUN_ACCESS_KEY_ID ALIYUN_ACCESS_KEY_SECRET ALIYUN_SMS_SIGN_NAME ALIYUN_SMS_TEMPLATE_CODE; do
    grep -q "^$k=..*" .env || { echo "❌ .env 缺 $k"; fail=1; }
  done
  grep -q '^SMS_CONSOLE_IN_PROD=1' .env && { echo "❌ 真实短信通道已配，但 SMS_CONSOLE_IN_PROD 还开着，请删除该行"; fail=1; }
  SMS_MODE=real
elif [ "$STAGE1" = "1" ]; then
  # console 模式在生产下必须有这个开关兜底，否则登录接口直接 500
  if grep -q '^SMS_CONSOLE_IN_PROD=1' .env; then
    echo "⚠️  短信走 console：验证码只进服务器日志，陌生用户注册不了"
    echo "   查验证码：sudo docker compose logs app | grep sms"
    SMS_MODE=console
  else
    echo "❌ 阶段一模式要求 .env 里有 SMS_CONSOLE_IN_PROD=1，否则生产环境发验证码会直接报错"
    fail=1
  fi
else
  echo "❌ .env 里 SMS_PROVIDER 必须是 tencent 或 aliyun（真实短信通道）"
  echo "   短信还没接通的话，用阶段一模式：sudo bash deploy/golive.sh --stage1"
  fail=1
fi

[ "$fail" = "1" ] && { echo ""; echo "先把上面的 .env 项改好，再重新跑本脚本"; exit 1; }
echo "✅ .env 检查通过"

echo ""
echo "== 1. 检查 DNS 解析 =="
# certbot 靠 HTTP-01 验证，域名解析不到本机会直接失败。提前验，避免
# Nginx 配置已改、证书却没签下来的半吊子状态。
dns_fail=0
for host in "$DOMAIN" "www.$DOMAIN"; do
  # `|| true` 不能省：域名解析不到时 getent 返回 2，pipefail 让整条管道非零，
  # 赋值语句失败 -> set -e 当场终止 -> 下面的报错和 DNSPod 指引一行都不会打印，
  # 操作者只看到一片空白和退出码 2。
  got=$(getent ahostsv4 "$host" 2>/dev/null | awk '{print $1}' | head -1 || true)
  if [ -z "$got" ]; then
    echo "❌ $host 解析不到（DNS 没配或还没生效）"; dns_fail=1
  elif [ "$got" != "$EXPECT_IP" ]; then
    echo "❌ $host 解析到 $got，期望 $EXPECT_IP"; dns_fail=1
  else
    echo "✅ $host → $got"
  fi
done
if [ "$dns_fail" = "1" ]; then
  cat <<EOF

去腾讯云 DNS 解析（DNSPod）给 $DOMAIN 加 A 记录指向 $EXPECT_IP：
  主机记录 @    类型 A   记录值 $EXPECT_IP
  主机记录 www  类型 A   记录值 $EXPECT_IP
加完等 10 分钟生效，再重新跑本脚本。
EOF
  exit 1
fi

echo ""
echo "== 2. 重新构建（把备案号固化进页面）并重启 =="
# NEXT_PUBLIC_* 是构建期固化的，改了备案号必须 --build 才会生效
docker compose up -d --build

echo ""
echo "== 3. 安装 Nginx + HTTPS =="
# 拆成两行：写成 `apt-get update && apt-get install` 时，update 失败会被 set -e
# 豁免（它不是 && 的最后一条命令），脚本会带着没装上的 nginx 继续往下跑。
apt-get update -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx
# certbot --nginx 会把 443 server block 直接写进 /etc/nginx/sites-available/menuapp
# （deploy/nginx-chishenmeya.conf 里只有 listen 80，文件开头也这么注明了）。
# 无条件 cp 覆盖，会在**重跑脚本**时把证书配置整段抹掉 -> 下面 reload 一生效
# HTTPS 当场就断，直到 certbot 再次成功才恢复。而本脚本在 certbot 失败和结尾
# 两处都主动建议"修好后重跑"，等于把重跑变成一次自伤。
if [ -f /etc/nginx/sites-available/menuapp ]; then
  cp -a /etc/nginx/sites-available/menuapp \
        "/etc/nginx/sites-available/menuapp.bak.$(date +%F-%H%M%S)"
fi
if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  echo "ℹ️  已有 $DOMAIN 的证书，保留现有 Nginx 配置（含 443），不覆盖"
else
  cp deploy/nginx-chishenmeya.conf /etc/nginx/sites-available/menuapp
fi
# sites-enabled 的改动发生在 nginx -t 之前，所以测试失败时必须把它退回去。
# 不退的后果是延迟性的、也因此更危险：正在跑的 nginx 还用着内存里那份旧配置，
# 当场什么都不坏；但下一次从磁盘重读配置的事件 —— 重启、systemctl restart、
# 甚至 certbot 续期钩子里的 reload —— 会加载失败，nginx 起不来。那时离这次
# 部署可能已经过去几个月，没人会把两件事联系起来。
enabled_had_default=0
[ -e /etc/nginx/sites-enabled/default ] && enabled_had_default=1
enabled_had_menuapp=0
[ -e /etc/nginx/sites-enabled/menuapp ] && enabled_had_menuapp=1

ln -sf /etc/nginx/sites-available/menuapp /etc/nginx/sites-enabled/menuapp
rm -f /etc/nginx/sites-enabled/default
# 不能写成 `nginx -t && systemctl reload nginx`：set -e 对 && 左侧命令豁免，
# 配置测试失败时 reload 会被静默跳过，脚本带着未生效的配置继续跑 certbot。
if ! nginx -t; then
  echo "❌ Nginx 配置测试失败，见上面的报错。"
  [ "$enabled_had_menuapp" = "0" ] && rm -f /etc/nginx/sites-enabled/menuapp
  [ "$enabled_had_default" = "1" ] \
    && ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default
  echo "   sites-enabled 已退回改动前的状态（nginx 未 reload，当前服务不受影响）。"
  fallback_hint
  exit 1
fi
# 先确保 nginx 起着再 reload：上次跑挂时若 80 被占用，nginx 会装上但没启动，
# 对已停止的 unit 执行 reload 会失败 -> set -e 终止，脚本头部承诺的"重跑即可"落空。
systemctl enable --now nginx
systemctl reload nginx

# certbot 自动改写 nginx 配置加 443 并配好自动续期。
# 失败不让 set -e 直接掐断——3000 内测口这时还开着，站点没失联，
# 留个明确的恢复指引比留个半吊子状态好。
if certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --redirect \
     --non-interactive --agree-tos -m "$CERTBOT_EMAIL"; then
  echo "✅ HTTPS 证书已签发"
else
  echo ""
  echo "❌ certbot 失败，HTTPS 没起来。"
  fallback_hint
  echo "   常见原因：安全组没放行 80、DNS 刚改还没全网生效、80 端口被占用。"
  echo "   排查：systemctl status nginx / certbot certificates / ss -lntp | grep :80"
  echo "   修好后可以重跑本脚本（已有证书时不会覆盖 443 配置）。"
  exit 1
fi

echo ""
echo "== 4. HTTPS 验收 =="
sleep 3
acc_fail=0

if curl -sf "https://$DOMAIN/api/auth/me" > /dev/null; then
  echo "✅ HTTPS + API 正常"
else
  echo "❌ https://$DOMAIN/api/auth/me 不通，查 docker compose logs app"
  acc_fail=1
fi

# 比对 .env 里的真实备案号，而不是只找 "ICP" 三个字母——那三个字母也可能
# 出现在 JS bundle 名或别处，会把“没显示备案号”误判成通过。
# 不用 `sed ... | head -1 | tr ...`：head 满足后先退出，sed 还在读 .env 就会吃
# SIGPIPE（141），pipefail 把整条管道判成失败 -> set -e 无声终止整个脚本。这正是
# 下面 12 行注释里为 curl|grep 避开的同一个坑，只是当时没顺手改这一行。
# 纯 bash 取值，一个管道都不用。
icp_raw=$(sed -n 's/^NEXT_PUBLIC_ICP_NUMBER=//p' .env || true)
icp_expect=${icp_raw%%$'\n'*}                  # 只取第一行
icp_expect=${icp_expect//[\"\'$'\r']/}         # 去掉包裹的引号和 CRLF 的 CR
if [ -z "$icp_expect" ]; then
  # 必须先挡空值：第 0 步的 `=..*` 只要求等号后有字符，写成 ="" 也能过；
  # 剥掉引号后这里就是空串，而 `grep -qF ""` 匹配任何输入，会把"备案号根本
  # 没上页面"判成通过，然后继续去关 3000 口。
  echo "❌ .env 里 NEXT_PUBLIC_ICP_NUMBER 取出来是空的（是不是写成了 =\"\"）"
  acc_fail=1
else
  # 不能写成 `curl ... | grep -qF ...`：grep -q 命中就立刻退出，curl 继续往已关闭的
  # 管道写会吃 SIGPIPE（退出码 141），pipefail 把整条管道判成失败——于是"备案号
  # 明明显示了"被判成没找到，操作者按提示白白 --build 重建十几分钟。
  # 先把 body 取下来，再分别判断"取不到"和"取到了但没有备案号"。
  welcome_body=$(curl -sf --max-time 20 "https://$DOMAIN/welcome") || welcome_body=""
  if [ -z "$welcome_body" ]; then
    echo "❌ 取不到 https://$DOMAIN/welcome（连不上或非 2xx），查 docker compose logs app"
    acc_fail=1
  elif printf '%s' "$welcome_body" | grep -qF "$icp_expect"; then
    echo "✅ 落地页备案号已显示：$icp_expect"
  else
    echo "❌ 页面取到了，但里面没有备案号 $icp_expect"
    echo "   NEXT_PUBLIC_* 是构建期固化的，改了 .env 必须 --build 重建才生效"
    acc_fail=1
  fi
fi

# /api/auth/me 未登录时在 getAuthUser() 里就 return null，一条 SQL 都不发，
# 所以上面那条 200 只证明 nginx+TLS+Next.js 活着，不证明数据库可用。
# 而"能不能关 3000 口"是拿验收结果做门禁的，这里必须真碰一下库。
if docker compose exec -T db pg_isready -U menuapp > /dev/null 2>&1; then
  echo "✅ 数据库可连接"
else
  echo "❌ 数据库 pg_isready 失败，查 docker compose logs db"
  acc_fail=1
fi

if [ "$acc_fail" = "1" ]; then
  echo ""
  echo "⚠️  验收没全过，本脚本不会去关内测 3000 口。"
  fallback_hint
  echo "   修好后重跑本脚本。"
  exit 1
fi

echo ""
echo "== 5. 关闭内测 3000 端口直连 =="
# HTTPS 确认可用之后才关，避免中途失败导致完全无法访问
if [ -f docker-compose.override.yml ]; then
  # 改名而不是 rm：docker-compose.override.yml 不在 git 里（git ls-files 确认过），
  # 删掉就再也退不回内测口，只能手写重建。留 .disabled，回滚只要改回名字。
  #
  # 这一整块是全脚本唯一「先动手、后验证」的地方，所以每条退路都必须走同一个
  # 恢复函数。此前 `docker compose up -d` 是裸命令：set -e 会在它非零退出时
  # 当场终止脚本 —— 也就是恰好跳过下面那段为它写的回滚。结果是 3000 口已关、
  # 容器没起来、override 停用中，而操作者只看到一行 docker 报错，既不知道有个
  # .disabled 文件，也不知道改回名字就能救。和这个脚本当初要修的 certbot 顺序
  # bug 是同一类，只是挪了个位置。
  restore_override() {
    mv -f docker-compose.override.yml.disabled docker-compose.override.yml 2>/dev/null \
      || echo "   ⚠️ override 自动恢复失败，手工执行：mv -f docker-compose.override.yml.disabled docker-compose.override.yml"
    docker compose up -d || true
    sleep 3
  }

  mv docker-compose.override.yml docker-compose.override.yml.disabled
  if ! docker compose up -d; then
    echo "❌ 关 3000 口后容器起不来（compose 非零退出），正在恢复 override…"
    restore_override
    fallback_hint
    echo "   查 docker compose logs app"
    exit 1
  fi

  # 必须复验：这一步会重建 app 容器（端口映射变了）。容器起不来时 nginx 反代
  # 后面就是空的 -> HTTPS 502，而 3000 外网口刚被关掉，站点彻底失联。
  # 第 4 步的验收发生在关口之前，不复验就等于把唯一的失联窗口留着不看。
  #
  # 轮询而不是 sleep 3 一锤子：容器重建在这台 2 核机上可能要 5~10 秒，单次
  # 复验会把「正常但慢」误判成「失败」，触发一次没必要的回滚，然后按提示重跑
  # 整个脚本 —— 第 2 步又是一次几分钟的 --build，而且下次可能再撞同一个竞态。
  https_ok=0
  for _ in $(seq 1 30); do
    if curl -sf --max-time 5 "https://$DOMAIN/api/auth/me" > /dev/null; then
      https_ok=1
      break
    fi
    sleep 2
  done

  if [ "$https_ok" = "1" ]; then
    echo "✅ 已关 3000 口，HTTPS 复验通过"
    echo "   override 备份在 $APP_DIR/docker-compose.override.yml.disabled"
    echo "   ⚠️ 记得去腾讯云控制台安全组把 3000 的放行规则也删掉"
  else
    echo "❌ 关掉 3000 口后 HTTPS 60 秒内没通，正在把 override 恢复回去…"
    restore_override
    # 这里绝不能写死"站点仍可从 3000 访问"。触发本分支最常见的原因就是 app
    # 容器根本起不来，那时恢复 override 也救不活 3000，而人在国外只有 SSH，
    # 被这句话指去一个连不上的地址会彻底失去方向。fallback_hint 会真的用
    # ss 探一遍有没有在监听，再决定说哪句话。
    fallback_hint
    echo "   查 docker compose logs app"
    exit 1
  fi
else
  echo "✅ override 不存在，3000 口本来就没开"
fi

echo ""
echo "== 6. 安装每日备份 cron（凌晨 3 点，保留 14 天）=="
chmod +x deploy/backup.sh
mkdir -p /home/ubuntu/backup

# 原来这里是 `( crontab -l | grep -v ... ; echo ... ) | crontab -`。在 set -o pipefail
# 下有个会静默丢备份的 bug：root 还没有 crontab 时 `crontab -l` 返回非零，grep 拿到
# 空输入时也返回非零，整条管道失败 -> 子 shell 里的 set -e 在 echo 之前就中断 ->
# 只有空内容被管给 `crontab -`，结果是装了个空 crontab，却照样打印“已装”。
# （已有 crontab 时旧写法是正常的——三场景对照测试确认过，只有全新机器会中招，
#   而这台正是全新机器。）改成先落盘再安装，装完回读验证。
CRON_LINE="0 3 * * * bash $APP_DIR/deploy/backup.sh >> /home/ubuntu/backup/backup.log 2>&1"
# 先落一份快照再动手。原来那个 `|| true` 是为了容忍"root 还没有 crontab"这个
# 正常情况，但它覆盖整条管道，连"读到一半失败"和"写盘失败（/tmp 满）"一起吞掉；
# 那时临时文件是残缺的，却会被整体安装上去，把 root 其它定时任务静默清空。
# 而只 grep 自己刚追加的那一行做回读，永远查不出"别的任务丢了"。
cron_bak="/home/ubuntu/backup/crontab-before-$(date +%F-%H%M%S).bak"
# root 的 crontab 源文件是 0600 root:root。这份拷贝落在放数据库 dump 的目录里，
# 按默认 umask 会变成 0644 —— 等于把一个只有 root 能读的文件降权。先建再写。
: > "$cron_bak"
chmod 600 "$cron_bak"
crontab -l > "$cron_bak" 2>/dev/null || : > "$cron_bak"
keep_before=$(grep -cv 'deploy/backup.sh' "$cron_bak" || true)
[ -n "$keep_before" ] || keep_before=0

cron_tmp=$(mktemp)
grep -v 'deploy/backup.sh' "$cron_bak" > "$cron_tmp" || : > "$cron_tmp"
echo "$CRON_LINE" >> "$cron_tmp"

keep_after=$(grep -cv 'deploy/backup.sh' "$cron_tmp" || true)
[ -n "$keep_after" ] || keep_after=0
if [ "$keep_after" != "$keep_before" ]; then
  echo "❌ 生成的 crontab 丢了原有任务（原 $keep_before 条，现 $keep_after 条），已中止安装。"
  echo "   原 crontab 备份在 $cron_bak"
  rm -f "$cron_tmp"
  exit 1
fi

crontab "$cron_tmp"
rm -f "$cron_tmp"

if crontab -l 2>/dev/null | grep -q 'deploy/backup.sh'; then
  echo "✅ cron 已装（root），回读验证通过（原有 $keep_before 条任务保留）"
  echo "   安装前快照：$cron_bak"
else
  echo "❌ cron 安装失败：回读不到备份任务。"
  echo "   站点已经上线且可用，但每日备份没生效——排查 sudo crontab -l"
  echo "   原 crontab 备份在 $cron_bak"
  exit 1
fi

echo "   先手动跑一次备份验证："
backup_ok=1
if bash deploy/backup.sh; then
  echo "✅ 备份跑通"
else
  backup_ok=0
  echo "⚠️  备份执行失败。站点已正常上线，但目前没有可用备份，务必排查后重跑："
  echo "   sudo bash $APP_DIR/deploy/backup.sh"
fi

echo ""

# 横幅里这行必须反映备份真实结果。备份失败时只在上面打一行 ⚠️、然后照样铺一屏
# 绿色成功，那行警告会被滚走——对单机无回滚的部署，"以为有备份"比"知道没备份"
# 危险得多。
if [ "$backup_ok" = "1" ]; then
  backup_line="✅ 每日备份 cron 已装，并已验证跑通"
else
  backup_line="❌ 备份跑不通——cron 装上了但每晚都会以同样原因失败，目前零可用备份，先修这个"
fi

# 用实际生效的短信通道判，不用命令行参数判：带 --stage1 跑但 .env 里已配好
# 真实通道时，走的是真发短信，此时打阶段一横幅会让人去日志里翻永远不会出现的
# 验证码（lib/sms.ts 那行 console.log 只在 console 分支执行）。
if [ "$SMS_MODE" = "console" ]; then
cat <<EOF
============================================================
✅ 阶段一上线完成：https://$DOMAIN

现在的状态：
  ✅ 域名可访问、HTTPS、备案号已挂在落地页底部
  $backup_line
  ⚠️ 短信仍是 console 模式——陌生用户注册不了（收不到验证码）
     所以：小红书简介暂时别放域名，等短信通了再放
     自己人登录取码：sudo docker compose logs app | grep sms

接下来：
  [ ] 30 天内提交公安备案 beian.mps.gov.cn（数据码 2026-08-23 过期）
  [ ] 备份恢复演练一次（方法见 deploy/backup.sh 底部注释）
  [ ] 短信签名批下来后，把真实通道填进 .env，
      删掉 SMS_CONSOLE_IN_PROD=1，再跑一次：
      sudo bash deploy/golive.sh
============================================================
EOF
else
cat <<EOF
============================================================
✅ 完整上线完成：https://$DOMAIN

现在的状态：
  ✅ 域名可访问、HTTPS、备案号已挂在落地页底部
  $backup_line

剩下的人工验收（DEPLOY_CN.md 第 5 节）：
  [ ] 真手机收短信登录一次（真实短信通道实发）
  [ ] 两个手机号各自注册，互相看不到对方的菜（多租户隔离）
  [ ] A 的邀请码让 B 加入；重置后旧码失效
  [ ] 备份恢复演练一次（方法见 deploy/backup.sh 底部注释）
  [ ] 30 天内提交公安备案 beian.mps.gov.cn（M11）
============================================================
EOF
fi

# 站点是好的，但没有可用备份——退出码要如实反映，否则任何自动化和事后回看
# 都会把这次部署当成完全成功。
[ "$backup_ok" = "1" ] || exit 1
