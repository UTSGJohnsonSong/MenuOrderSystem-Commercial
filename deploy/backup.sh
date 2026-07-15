#!/bin/bash
# 每日备份：数据库 + 上传图片，保留 14 天。
# golive.sh 会把它装进 root 的 crontab（每天凌晨 3 点）。
# 手动执行：sudo bash /home/ubuntu/app/deploy/backup.sh
set -euo pipefail

APP_DIR=/home/ubuntu/app
BACKUP_DIR=/home/ubuntu/backup
DATE=$(date +%F)

mkdir -p "$BACKUP_DIR"

# 数据库（自定义压缩格式，恢复用 pg_restore）
docker compose -f "$APP_DIR/docker-compose.yml" exec -T db \
  pg_dump -U menuapp -Fc menuapp > "$BACKUP_DIR/db-$DATE.dump"

# 上传的图片（uploads 卷）
docker compose -f "$APP_DIR/docker-compose.yml" exec -T app \
  tar czf - -C /app/uploads . > "$BACKUP_DIR/uploads-$DATE.tar.gz" 2>/dev/null || true

# 只保留最近 14 天
find "$BACKUP_DIR" -type f -mtime +14 -delete

echo "[backup] $DATE 完成：$(du -sh "$BACKUP_DIR" | cut -f1)"

# 恢复方法（演练用，DEPLOY_CN.md 第 5 节要求上线前实际做一次）：
#   数据库：docker compose exec -T db pg_restore -U menuapp -d menuapp --clean < db-日期.dump
#   图片：  docker compose exec -T app tar xzf - -C /app/uploads < uploads-日期.tar.gz
