// Выкачка драфтов договоров LB Group (LOYO&BONDAR) из Google Drive.
//
// Источник ссылок — внутренняя таблица застройщика: колонки «Drafts of
// Agreements» и «Drafts of Property Management Agreements». Папки публичные,
// но Drive API в проекте выключен, поэтому список тянем через
// `listPublicFolder` (embeddedfolderview), а файлы — анонимно.
//
// Результат: reports/lb-legal/<slug>/*.txt + _index.json. Каталог reports/
// в .gitignore — тексты договоров в репозиторий не попадают.
//
//   node scripts/lb-contracts-fetch.mjs [--only <slug>]

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { listPublicFolder, downloadDriveFile, exportGoogleDoc, extractText } from './_drive-doc.mjs'

const OUT_DIR = 'reports/lb-legal'
const MAX_DEPTH = 4
// Украинские версии — те же договоры на другом языке, разбирать нечего.
const SKIP_PATH = /ukrain|укр/i
const PREFER_RU = /russian|рус/i
const PREFER_EN = /english|англ/i

// Проекты застройщика → slug ЖК на сайте. Один ЖК на сайте может собирать
// несколько строк таблицы (виллы + апартаменты одного проекта).
const PROJECTS = [
  { slug: 'jungle-flower-villas-ubud-bali', label: 'Jungle Flower Villas', pt: 'PT. BONDAR VILLAS BALI',
    folders: [['contracts', '1TdZT7k8Pp9N5Se-0QS79_gyyCPJovU6R'], ['pm', '1TomfAr9pK6oFTTdvFfbBPi-DkKPrvXXp']] },
  { slug: 'loyo-villas-ubud-ubud-bali', label: 'LOYO Villas', pt: 'PT. LOYO GROUP BALI',
    folders: [['contracts', '1oSQSZfI9Sx04b6AXbpCuZxGZwKbJTHxS'], ['pm', '1wAMGJCbdxM4nVD2L1EIlKnvi3RLyf8kT']] },
  { slug: 'ubud-dream-ubud-bali', label: 'Ubud Dream (villas + apartments)', pt: 'PT. LOYO GROUP BALI',
    folders: [['contracts', '1zQ23jWdtnuzSyHVXtsBQtNDk-FI-EL32']] },
  { slug: 'u-villas-i-melasti-bali', label: 'U Villas I', pt: 'PT. YOU INVESTMENTS BALI',
    folders: [['contracts', '1eUdlLkGsVs3TK8h93OxfWnq9cbSoFU_5'], ['pm', '1K_8c_r-3jN-tMyIevYD-f8OMPBswcPSH']] },
  { slug: 'u-villas-ii-melasti-bali', label: 'U Villas II', pt: 'PT. BONDAR VILLAS BALI',
    folders: [['contracts', '1unOTaYfG5wlPpm638kj1ijb17kKo5pP6']] },
  { slug: 'melasti-dream-melasti-bali', label: 'Melasti Dream', pt: 'PT. BONDAR VILLAS BALI',
    folders: [['contracts', '14meGI3zAxitRPVb9eApg0fVRBb1k3OaP'], ['pm', '1y59UkFDuHpZceK752LpkYbAVDrGgaXjq']] },
  { slug: 'melasti-arcade-pandawa-bali', label: 'Melasti Arcade', pt: 'PT. BONDAR VILLAS BALI',
    folders: [['contracts', '1l6JZszM6Ng8s-VST0IyQ3M1nGt3B-T5Z']] },
  { slug: 'xo-pandawa-pandawa-bali', label: 'XO Pandawa (apartments + villas)', pt: 'PT. XOLD PANDAWA BALI',
    folders: [['contracts', '1BVL-kcXTfrpXXZ2e8Onmo5p7Ebiw7zvr'], ['pm', '1dqlEN20Dzymd7w2XbjT04yqamIFsM3G3'],
              ['contracts-villas-doc', '1ZovfJj2zLi_X-Yvd_ITZ9Bso2BAp5IZH']] },
  { slug: 'pandawa-hills-pandawa-bali', label: 'Pandawa Hills (apartments + villas)', pt: 'PT. LOYO DEVELOPMENT BALI',
    folders: [['contracts-apartments', '1oMiG_ukHky_nUfXO4HmTJFtYt-D16m7I'], ['contracts-villas', '1AU_p49RNoqblq1OH1uAtdIEvNEuxRAK-']] },
  { slug: 'pandawa-dream-pandawa-bali', label: 'Pandawa Dream (villas + apartments)', pt: 'PT. LOYO DEVELOPMENT BALI',
    folders: [['contracts-villas', '1JO45v88JRdkfE2M_cOCR6rSNjFHgJcyf'], ['contracts-apartments', '13-KFqzIGVRhNXa4Ua4_mVad4R4AWZeCr']] },
  { slug: 'green-village-nusa-dua-bali', label: 'Green Village (apartments + villas)', pt: 'LOYO BONDAR GROUP (Homes)',
    folders: [['contracts-apartments', '1buoFYdGUCJG2skwWLEv9pz1SPw2gahWP'], ['contracts-villas', '194pwhiA5Mt5LHYKBpLkaUXQZnOcfLMTo']] },
  { slug: 'xo-canggu-batu-bolong-bali', label: 'XO Project I / XO Canggu (villas + apartments)', pt: 'PT. XOLD BALI GROUP',
    folders: [['contracts-villas', '1Ij8LN2TekHDKyMxS2chwEXpAcV_-srke'], ['contracts-apartments', '1BxpaqJ_JLH8uJ1JxriaB483-wi3M99l-'],
              ['pm', '13yqLaaUxLmTR_FUWcwoM2hAkFBJ8QE0A']] },
]

const onlyArg = process.argv.indexOf('--only')
const only = onlyArg > -1 ? process.argv[onlyArg + 1] : null

/** Рекурсивно собрать файлы папки, помня путь до них. */
async function collectFiles(id, trail = [], depth = 0) {
  let entries
  try {
    entries = await listPublicFolder(id)
  } catch (e) {
    console.warn(`    ! папка ${id}: ${e.message}`)
    return []
  }
  const files = []
  for (const entry of entries) {
    const trailNext = [...trail, entry.name]
    if (entry.kind === 'folder') {
      if (depth + 1 > MAX_DEPTH) continue
      files.push(...(await collectFiles(entry.id, trailNext, depth + 1)))
      continue
    }
    files.push({ ...entry, trail: trailNext })
  }
  return files
}

/** Украинское выкидываем всегда; английское — только если есть русское. */
function pickLanguage(files) {
  const kept = files.filter(f => !f.trail.some(part => SKIP_PATH.test(part)) && !SKIP_PATH.test(f.name))
  const hasRu = kept.some(f => f.trail.some(part => PREFER_RU.test(part)))
  if (!hasRu) return kept
  return kept.filter(f => !f.trail.some(part => PREFER_EN.test(part)))
}

function safeName(parts) {
  return parts.join('__')
    .replace(/\.(docx|pdf|doc|xlsx)$/i, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
}

async function loadText(file) {
  if (file.kind === 'doc' || file.kind === 'sheet') {
    return { text: await exportGoogleDoc(file.id, file.kind), method: file.kind }
  }
  const { buffer, contentType } = await downloadDriveFile(file.id)
  return extractText({ buffer, contentType, name: file.name })
}

async function run() {
  const projects = only ? PROJECTS.filter(p => p.slug === only) : PROJECTS
  if (projects.length === 0) throw new Error(`нет проекта со slug "${only}"`)

  const seenHashes = new Map() // sha1 → "slug/file" первого вхождения
  const summary = []

  for (const project of projects) {
    console.log(`\n## ${project.label} → ${project.slug}`)
    const dir = path.join(OUT_DIR, project.slug)
    fs.mkdirSync(dir, { recursive: true })

    const collected = []
    for (const [group, folderId] of project.folders) {
      // Одиночный Google Doc вместо папки (в таблице так бывает).
      const isFolder = !group.endsWith('-doc')
      const files = isFolder
        ? pickLanguage(await collectFiles(folderId, [group]))
        : [{ id: folderId, name: `${group}.docx`, kind: 'doc', trail: [group] }]
      collected.push(...files)
    }

    const index = []
    for (const file of collected) {
      let result
      try {
        result = await loadText(file)
      } catch (e) {
        console.warn(`  ✗ ${file.name}: ${e.message}`)
        index.push({ name: file.name, trail: file.trail, error: e.message })
        continue
      }
      const text = (result.text ?? '').trim()
      const hash = crypto.createHash('sha1').update(text).digest('hex')
      const duplicateOf = text.length > 0 ? seenHashes.get(hash) ?? null : null
      const outName = `${safeName([...file.trail])}.txt`
      if (text.length > 0 && !duplicateOf) seenHashes.set(hash, `${project.slug}/${outName}`)
      fs.writeFileSync(path.join(dir, outName), text)
      index.push({
        name: file.name, trail: file.trail, driveId: file.id,
        method: result.method, chars: text.length, file: outName, duplicateOf,
      })
      const dup = duplicateOf ? `  = ${duplicateOf}` : ''
      console.log(`  ✓ ${file.trail.join(' / ')} — ${text.length} симв. (${result.method})${dup}`)
    }

    fs.writeFileSync(
      path.join(dir, '_index.json'),
      JSON.stringify({ slug: project.slug, label: project.label, pt: project.pt, files: index }, null, 2),
    )
    const chars = index.reduce((sum, f) => sum + (f.chars ?? 0), 0)
    summary.push({ slug: project.slug, files: index.length, chars })
  }

  console.log('\n=== Итого ===')
  for (const s of summary) console.log(`${s.slug}: ${s.files} док., ${s.chars} симв.`)
}

run().catch(e => {
  console.error(e)
  process.exit(1)
})
