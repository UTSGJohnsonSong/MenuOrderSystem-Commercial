#!/bin/bash
# 每日备份：数据库 + 上传图片，保留 14 天。
# golive.sh 会把它装进 root 的 crontab（每天凌晨 3 点）。
# 手动执行：sudo bash /home/ubuntu/app/deploy/backup.sh
set -euo pipefail

APP_DIR=/home/ubuntu/app
BACKUP_DIR=/home/ubuntu/backup
DATE=$(date +%F)

mkdir -p "$BACKUP_DIR"
# dump 里是全量用户数据（手机号、会话）。root 默认 umask 022 会让目录 0755、
# 文件 0644 —— 服务器上任何一个非 root 进程都能整份读走。收紧到只有 root 能进。
chmod 700 "$BACKUP_DIR"

# 清理上一次被硬杀留下的 .partial。
# 下面的 trap 只在 bash 能收到信号时才跑：SIGTERM（systemd 关机）会触发，但
# SIGKILL（OOM killer、kill -9）和断电不会 —— 而这三种恰好就是注释里点名的场景。
# 更麻烦的是收窄后的清理 glob（第 60 行附近）不匹配 .partial，也没有别的规则管它，
# 于是一份完整 dump 大小的垃圾会永久占着盘，而备份和 Postgres 数据卷共用这块盘。
# 只删一天前的：今天的 .partial 可能是另一个正在跑的实例正在写。
find "$BACKUP_DIR" -maxdepth 1 -type f -name '*.partial' -mtime +0 -delete 2>/dev/null || true

# 数据库（自定义压缩格式，恢复用 pg_restore）
# 先写 .partial 再改名：重定向会在 pg_dump 跑之前就把目标文件建出来，导出失败
# 时留下的 0 字节文件看起来和真备份一样，等要恢复才发现是空的。
db_tmp="$BACKUP_DIR/db-$DATE.dump.partial"
up_tmp="$BACKUP_DIR/uploads-$DATE.tar.gz.partial"
# 备份被非正常打断时（重启 / OOM / cron 被 kill）else 分支的 rm 不会执行，而
# .partial 既不匹配下面收窄后的清理 glob 也不匹配别的规则，会永久占着一份完整
# dump 的体积。数据库和备份共用一块盘，堆积到写满就是数据库故障。
trap 'rm -f "$db_tmp" "$up_tmp"' EXIT

if docker compose -f "$APP_DIR/docker-compose.yml" exec -T db \
     pg_dump -U menuapp -Fc menuapp > "$db_tmp" && [ -s "$db_tmp" ]; then
  chmod 600 "$db_tmp"
  mv -f "$db_tmp" "$BACKUP_DIR/db-$DATE.dump"
else
  rm -f "$db_tmp"
  echo "[backup] ❌ 数据库导出失败，未生成 db-$DATE.dump" >&2
  exit 1
fi

# 上传的图片（uploads 卷）。卷为空时 tar 仍会产出一个合法的小包，所以失败就是
# 真失败——不再用 `|| true` 一律吞掉，改成留下明确告警。
up_ok=1
if docker compose -f "$APP_DIR/docker-compose.yml" exec -T app \
     tar czf - -C /app/uploads . > "$up_tmp"; then
  chmod 600 "$up_tmp"
  mv -f "$up_tmp" "$BACKUP_DIR/uploads-$DATE.tar.gz"
else
  rm -f "$up_tmp"
  up_ok=0
  echo "[backup] ⚠️ 图片备份失败（数据库已备份成功）" >&2
fi

# 只保留最近 14 天——但**只清理本脚本自己产出的文件**。
# 原来是 `find "$BACKUP_DIR" -type f -mtime +14 -delete`，会连手工做的
# 升级前基线（db-pre-upgrade-*.dump、app-code-pre-upgrade-*.tar.gz 等）一起删掉。
# 图片备份今天失败时，绝不能清理 uploads 的历史包——否则连续失败 15 天，
# 最后一份好的也会被这条 find 删掉，而每天的日志看起来都一样。
prune_args=( -name 'db-????-??-??.dump' )
if [ "$up_ok" = "1" ]; then
  prune_args+=( -o -name 'uploads-????-??-??.tar.gz' )
else
  echo "[backup] ⚠️ 图片备份失败，本次跳过 uploads 历史包的清理" >&2
fi
find "$BACKUP_DIR" -maxdepth 1 -type f \( "${prune_args[@]}" \) -mtime +14 -delete

# 收尾行必须说实话：cron 那条是 `>> backup.log 2>&1`，stdout 和 stderr 混在
# 一起，如果最后一行永远是“完成”，那么"图片备份连续几周失败"和"一切正常"
# 在日志里长得一模一样。退出码也要跟着变，否则监控同样看不出来。
if [ "$up_ok" = "1" ]; then
  echo "[backup] $DATE 完成（数据库 + 图片）：$(du -sh "$BACKUP_DIR" | cut -f1)"
else
  echo "[backup] $DATE 部分完成：数据库 ✅ / 图片 ❌ —— 需人工排查" >&2
  exit 1
fi

# 恢复方法（演练用，DEPLOY_CN.md 第 5 节要求上线前实际做一次）：
#   数据库：docker compose exec -T db pg_restore -U menuapp -d menuapp --clean < db-日期.dump
#   图片：  docker compose exec -T app tar xzf - -C /app/uploads < uploads-日期.tar.gz
