#!/bin/zsh
# Добивает выборку рынка (Booking) только ночью 23:00–07:00, 2 копии, чтобы днём лимит был свободен.
# zsh scripts/vision-v2/night-booking.sh <base-dir>
B=$1; cd ~/balinsky; S=scripts/vision-v2
log() { echo "$(date +%H:%M:%S) $*" >> $B/overnight.log; }
left() { local n=0; for f in $B/vmk/batch_*.json; do [ -f $B/vmk/out/$(basename $f .json).jsonl ] || n=$((n+1)); done; echo $n; }
while [ $(left) -gt 0 ]; do
  h=$(date +%H)
  if [ $h -ge 23 -o $h -lt 7 ]; then
    log "ночь: осталось $(left) пачек"
    node $S/run.mjs $B/vmk --par=2 --clean >> $B/vmk/run.log 2>&1 &
    P=$!
    while kill -0 $P 2>/dev/null && { h=$(date +%H); [ $h -ge 23 -o $h -lt 7 ]; }; do sleep 60; done
    pkill -P $P 2>/dev/null; kill $P 2>/dev/null
    node $S/load.mjs market $B/vmk >> $B/overnight.log 2>&1; log "утро: залито, осталось $(left)"
  fi
  sleep 300
done
log "Booking выборка готова"
