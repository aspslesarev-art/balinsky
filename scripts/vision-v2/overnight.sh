#!/bin/zsh
# Ночной v2-разбор всех фото: ЖК → виллы → апартаменты → выборка рынка → весь рынок.
# zsh scripts/vision-v2/overnight.sh <base-dir>
B=$1; cd ~/balinsky
log() { echo "$(date +%H:%M:%S) $*" >> $B/overnight.log; }
S=scripts/vision-v2
log старт
while pgrep -f "run.mjs $B/vzk" >/dev/null; do sleep 60; done
node $S/run.mjs $B/vzk --par=4 >> $B/vzk/run.log 2>&1   # добить сбойные
node $S/load.mjs complex $B/vzk >> $B/overnight.log 2>&1; log "ЖК залиты"
for k in villa apartment; do
  node $S/prep-complexes.mjs $B/v$k --kind=$k --max=6 --chunk=10 >> $B/overnight.log 2>&1
  node $S/run.mjs $B/v$k --par=6 --clean > $B/v$k/run.log 2>&1
  node $S/run.mjs $B/v$k --par=3 --clean >> $B/v$k/run.log 2>&1
  node $S/load.mjs $k $B/v$k >> $B/overnight.log 2>&1; log "$k залиты"
done
while pgrep -f "prep-market.mjs $B/vmk" >/dev/null; do sleep 60; done
node $S/run.mjs $B/vmk --par=8 --clean > $B/vmk/run.log 2>&1
node $S/run.mjs $B/vmk --par=4 --clean >> $B/vmk/run.log 2>&1
node $S/load.mjs market $B/vmk >> $B/overnight.log 2>&1; log "выборка рынка залита"
node $S/prep-market.mjs $B/vmr --cap=100000 --chunk=12 --skip=$B/vmk >> $B/overnight.log 2>&1
( while pgrep -f "overnight.sh $B" >/dev/null; do sleep 5400; node $S/load.mjs market $B/vmr >> $B/overnight.log 2>&1; log "рынок: промежуточная заливка"; done ) &
node $S/run.mjs $B/vmr --par=8 --clean > $B/vmr/run.log 2>&1
node $S/load.mjs market $B/vmr >> $B/overnight.log 2>&1; log "весь рынок залит, конец"
