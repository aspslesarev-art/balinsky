#!/bin/zsh
# Добивает выборку рынка (vmk), заливает, затем весь рынок (vmr) с заливкой каждые 90 мин.
# zsh scripts/vision-v2/resume-market.sh <base-dir>
B=$1; cd ~/balinsky
log() { echo "$(date +%H:%M:%S) $*" >> $B/overnight.log; }
S=scripts/vision-v2
log "рестарт рынка"
node $S/run.mjs $B/vmk --par=8 --clean >> $B/vmk/run.log 2>&1
node $S/run.mjs $B/vmk --par=4 --clean >> $B/vmk/run.log 2>&1
node $S/load.mjs market $B/vmk >> $B/overnight.log 2>&1; log "выборка рынка залита (полностью)"
( while pgrep -f "resume-market.sh $B" >/dev/null; do sleep 5400; node $S/load.mjs market $B/vmr >> $B/overnight.log 2>&1; log "рынок: промежуточная заливка"; done ) &
node $S/run.mjs $B/vmr --par=8 --clean >> $B/vmr/run.log 2>&1
node $S/run.mjs $B/vmr --par=4 --clean >> $B/vmr/run.log 2>&1
node $S/load.mjs market $B/vmr >> $B/overnight.log 2>&1; log "весь рынок залит, конец"
