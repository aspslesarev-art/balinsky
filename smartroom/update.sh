#!/usr/bin/env bash
# Обновление Smart Room до свежей версии из репозитория.
# Данные (data/) и настройки (.env) не трогаются.
set -euo pipefail
cd "$(dirname "$0")"

BRANCH="${BRANCH:-claude/hotel-qr-service-6j61is}"
SRC=$(mktemp -d)
trap 'rm -rf "$SRC"' EXIT

echo "→ качаю $BRANCH"
git clone -q --depth 1 -b "$BRANCH" https://github.com/aspslesarev-art/balinsky "$SRC"

# Ничего не изменилось — не трогаем работающий сервис (важно для таймера,
# который дёргает скрипт каждые 10 минут).
if [ -f server.mjs ] && diff -rq server.mjs "$SRC/smartroom/server.mjs" >/dev/null 2>&1 \
   && diff -rq public "$SRC/smartroom/public" >/dev/null 2>&1; then
  echo "→ версия уже свежая, перезапуск не нужен"
  exit 0
fi

echo "→ обновляю код"
cp -a "$SRC/smartroom/server.mjs" ./
rm -rf public && cp -a "$SRC/smartroom/public" ./
cp -a "$SRC/smartroom/package.json" "$SRC/smartroom/Dockerfile" "$SRC/smartroom/docker-compose.yml" ./

echo "→ перезапускаю"
if [ -f docker-compose.yml ] && docker compose ps >/dev/null 2>&1 && [ -n "$(docker compose ps -q 2>/dev/null)" ]; then
  docker compose up -d --build
elif systemctl --user is-active --quiet smartroom 2>/dev/null; then
  systemctl --user restart smartroom
else
  echo "  сервис не найден ни в docker, ни в systemd — запустите вручную: node server.mjs"
  exit 1
fi

PORT_HOST=$(grep -E '^HOST_PORT=' .env 2>/dev/null | cut -d= -f2 || echo 3000)
sleep 2
CODE=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT_HOST}/admin" || echo 000)
echo "→ /admin отвечает: $CODE (ожидается 200)"
