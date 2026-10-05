#!/bin/zsh
# Ручная выкладка balinsky на прод. Автодеплой из git выключен (Vercel →
# gitProviderOptions.createDeployments = disabled), push в main сайт НЕ меняет.
# Выкладывает ровно origin/main из чистой копии, без локального мусора.
set -euo pipefail
# Автор последнего коммита должен быть участником команды Vercel (почта
# asp.slesarev@gmail.com) — иначе выкладка висит в статусе Blocked.
REPO=${0:A:h:h}
WT=$HOME/.balinsky-ship
git -C "$REPO" fetch -q origin main
if [ ! -d "$WT" ]; then git -C "$REPO" worktree add -q --detach "$WT" origin/main; fi
git -C "$WT" checkout -q --detach origin/main
git -C "$WT" clean -qfdx -e .vercel
mkdir -p "$WT/.vercel" && cp "$REPO/.vercel/project.json" "$WT/.vercel/"
echo "Выкладываю $(git -C "$WT" log -1 --format='%h %s')"
cd "$WT" && npx -y vercel deploy --prod --yes
