// Работа с ежедневными копиями прайсов (lib/market/snapshots.ts).
//
//   npx tsx --env-file=.env.local scripts/market-snapshot.ts days <source_key>
//       — за какие дни есть копия листа
//   npx tsx --env-file=.env.local scripts/market-snapshot.ts csv <source_key> <ГГГГ-ММ-ДД> [файл.csv]
//       — выгрузить копию листа таблицей (открывается в Google Sheets / Excel)
//   npx tsx --env-file=.env.local scripts/market-snapshot.ts parse <source_key> <ГГГГ-ММ-ДД>
//       — прогнать закреплённый разбор по копии: что было в прайсе в тот день
import { writeFileSync } from 'node:fs'
import { sbAdmin } from '../lib/market/apply'
import { loadSheetSnapshot, snapshotPath, snapshotToGrid, SNAPSHOT_BUCKET } from '../lib/market/snapshots'
import { pinnedFor, runPinned } from '../lib/market/pinned'

async function main() {
  const [cmd, sourceKey, day, out] = process.argv.slice(2)
  if (!cmd || !sourceKey) throw new Error('использование: days|csv|parse <source_key> [день]')
  const sb = sbAdmin()

  if (cmd === 'days') {
    const file = snapshotPath(sourceKey, 'X').split('/').pop()!
    const { data: dirs, error } = await sb.storage.from(SNAPSHOT_BUCKET).list('sheets', { limit: 1000, sortBy: { column: 'name', order: 'desc' } })
    if (error) throw new Error(error.message)
    for (const d of dirs ?? []) {
      const { data } = await sb.storage.from(SNAPSHOT_BUCKET).list(`sheets/${d.name}`, { search: file })
      if (data?.some(f => f.name === file)) console.log(d.name)
    }
    return
  }

  if (!day) throw new Error('нужен день в виде ГГГГ-ММ-ДД')
  const snap = await loadSheetSnapshot(sb, sourceKey, day)
  const grid = snapshotToGrid(snap)

  if (cmd === 'csv') {
    const esc = (t: string) => (/[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t)
    const lines: string[] = []
    for (let r = 1; r <= grid.rowCount; r++) {
      const row: string[] = []
      for (let c = 1; c <= grid.colCount; c++) row.push(esc(grid.rows[r][c].text))
      lines.push(row.join(','))
    }
    const path = out ?? `${sourceKey.replace(/[^\w.-]+/g, '_')}_${day}.csv`
    writeFileSync(path, lines.join('\n').replace(/(,)+$/gm, ''))
    console.log(`сохранено: ${path} (${grid.rowCount} строк)`)
    return
  }

  if (cmd === 'parse') {
    const pinned = pinnedFor(sourceKey)
    if (!pinned) throw new Error('для этого источника нет закреплённого разбора')
    const r = runPinned(grid, pinned)
    const by: Record<string, number> = {}
    for (const u of r.units) by[u.status] = (by[u.status] ?? 0) + 1
    console.log(`${day}: юнитов ${r.units.length}`, by)
    for (const u of r.units) console.log(`  ${u.unitKey}\t${u.status}\t${u.priceUsd ?? ''}`)
    return
  }

  throw new Error(`неизвестная команда: ${cmd}`)
}
main().catch(e => { console.error(e instanceof Error ? e.message : e); process.exit(1) })
