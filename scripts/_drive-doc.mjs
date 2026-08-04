// Загрузка документов из Google Drive + извлечение текста.
// Используется scripts/legal-audit-ai.mjs (юр-разбор документов объектов).
//
// В базе ссылка на документы лежит одной строкой и бывает трёх видов:
//   • прямой файл   drive.google.com/file/d/<id>/view
//   • Google Doc    docs.google.com/document/d/<id>/edit
//   • папка         drive.google.com/drive/folders/<id>
// Файлы и доки с доступом «по ссылке» тянутся анонимно. Папку без Drive API
// перечислить нельзя — возвращаем понятную ошибку, а не падаем.

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const execFileP = promisify(execFile)

// Меньше этого числа символов в PDF — текстового слоя нет, это скан.
export const MIN_TEXT_CHARS = 200

/** Разобрать ссылку Google Drive в { kind, id }. kind: file | doc | sheet | folder | unknown. */
export function parseDriveLink(raw) {
  const url = typeof raw === 'string' ? raw.trim() : Array.isArray(raw) ? String(raw[0] ?? '').trim() : ''
  if (!url) return { kind: 'unknown', id: null, url }
  const pick = (re, kind) => {
    const m = url.match(re)
    return m ? { kind, id: m[1], url } : null
  }
  return (
    pick(/docs\.google\.com\/document\/d\/([A-Za-z0-9_-]+)/, 'doc') ??
    pick(/docs\.google\.com\/spreadsheets\/d\/([A-Za-z0-9_-]+)/, 'sheet') ??
    pick(/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([A-Za-z0-9_-]+)/, 'folder') ??
    pick(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/, 'file') ??
    pick(/[?&]id=([A-Za-z0-9_-]+)/, 'file') ??
    { kind: 'unknown', id: null, url }
  )
}

// Порядок важен: usercontent-хост отдаёт файл сразу, минуя страницу
// «Google не может проверить файл на вирусы» (она приходит как text/html).
const FILE_URLS = [
  id => `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`,
  id => `https://drive.google.com/uc?export=download&id=${id}`,
]

/**
 * Скачать файл Drive по id.
 * @returns {Promise<{ buffer: Buffer, contentType: string }>}
 * @throws при приватном файле или недоступном Drive
 */
export async function downloadDriveFile(id) {
  let lastNote = 'нет ответа'
  for (const build of FILE_URLS) {
    const res = await fetch(build(id), { redirect: 'follow' })
    if (!res.ok) { lastNote = `HTTP ${res.status}`; continue }
    const contentType = res.headers.get('content-type') ?? ''
    const buffer = Buffer.from(await res.arrayBuffer())
    // HTML вместо файла = страница логина или подтверждения: файл закрыт
    // либо слишком большой для прямой отдачи.
    if (contentType.includes('text/html')) { lastNote = 'вернулся HTML (файл не публичный?)'; continue }
    if (buffer.length === 0) { lastNote = 'пустой ответ'; continue }
    return { buffer, contentType }
  }
  throw new Error(`не скачался: ${lastNote}`)
}

/** Выгрузить Google Doc / Sheet как текст (доступ «по ссылке» обязателен). */
export async function exportGoogleDoc(id, kind) {
  const url = kind === 'sheet'
    ? `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`
    : `https://docs.google.com/document/d/${id}/export?format=txt`
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok) throw new Error(`экспорт не удался: HTTP ${res.status}`)
  const text = await res.text()
  if (/<html/i.test(text.slice(0, 200))) throw new Error('экспорт вернул HTML (документ не публичный?)')
  return text.trim()
}

/**
 * Перечислить файлы публичной папки через Drive API.
 * Без ключа (или при выключенном API) бросает — вызывающий помечает объект
 * как «нужен доступ» и идёт дальше.
 */
export async function listDriveFolder(id, apiKey) {
  if (!apiKey) throw new Error('нет GOOGLE_DRIVE_KEY — папку не перечислить')
  const q = encodeURIComponent(`'${id}' in parents and trashed = false`)
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&key=${apiKey}&fields=files(id,name,mimeType,size)&pageSize=100`
  const res = await fetch(url)
  const json = await res.json()
  if (!res.ok) throw new Error(`Drive API ${res.status}: ${(json?.error?.message ?? '').slice(0, 120)}`)
  return json.files ?? []
}

/**
 * Перечислить публичную папку без Drive API.
 * Легаси-вьюха `embeddedfolderview` отдаёт список одним HTML — этого хватает,
 * когда Drive API в проекте не включён (ключ отвечает API_KEY_SERVICE_BLOCKED).
 * @returns {Promise<Array<{ id: string, name: string, kind: 'folder'|'doc'|'sheet'|'file' }>>}
 */
export async function listPublicFolder(id) {
  const res = await fetch(`https://drive.google.com/embeddedfolderview?id=${id}#list`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })
  if (!res.ok) throw new Error(`папка не открылась: HTTP ${res.status}`)
  const html = await res.text()
  const re = /id="entry-([A-Za-z0-9_-]+)"[\s\S]*?<a href="([^"]+)"[\s\S]*?<div class="flip-entry-title">([\s\S]*?)<\/div>/g
  const out = []
  for (const m of html.matchAll(re)) {
    const [, entryId, href, rawName] = m
    const kind = href.includes('/folders/') ? 'folder'
      : href.includes('/document/') ? 'doc'
      : href.includes('/spreadsheets/') ? 'sheet'
      : 'file'
    out.push({ id: entryId, name: unescapeHtml(rawName.trim()), kind })
  }
  return out
}

function unescapeHtml(s) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
}

/**
 * Извлечь текст из скачанных байтов.
 * @returns {Promise<{ text: string, method: 'pdf-text' | 'pdf-scan' | 'docx' | 'text' | 'unsupported' }>}
 */
export async function extractText({ buffer, contentType = '', name = '' }) {
  const lower = name.toLowerCase()
  const isPdf = buffer.subarray(0, 5).toString('latin1') === '%PDF-' || contentType.includes('pdf') || lower.endsWith('.pdf')

  if (isPdf) {
    const text = await parsePdf(buffer)
    // Скан без текстового слоя: текст достанет только OCR у вызывающего.
    return { text, method: text.length >= MIN_TEXT_CHARS ? 'pdf-text' : 'pdf-scan' }
  }
  const isDocx = buffer.subarray(0, 2).toString('latin1') === 'PK' &&
    (lower.endsWith('.docx') || contentType.includes('wordprocessingml'))
  if (isDocx) {
    return { text: await parseDocx(buffer), method: 'docx' }
  }
  if (contentType.startsWith('text/') || /\.(txt|md|csv)$/.test(lower)) {
    return { text: buffer.toString('utf8').trim(), method: 'text' }
  }
  return { text: '', method: 'unsupported' }
}

/**
 * Текст из .docx. Он же zip: распаковываем `word/document.xml` системным unzip
 * (без новой зависимости) и снимаем разметку, сохраняя границы абзацев и ячеек.
 */
let docxSeq = 0

async function parseDocx(buffer) {
  const tmp = path.join(os.tmpdir(), `docx-${process.pid}-${docxSeq++}.docx`)
  fs.writeFileSync(tmp, buffer)
  try {
    const { stdout } = await execFileP('unzip', ['-p', tmp, 'word/document.xml'], {
      maxBuffer: 64 * 1024 * 1024,
      encoding: 'buffer',
    })
    return docxXmlToText(stdout.toString('utf8'))
  } catch {
    return ''
  } finally {
    fs.rmSync(tmp, { force: true })
  }
}

function docxXmlToText(xml) {
  return xml
    .replace(/<w:tab\b[^>]*\/?>/g, '\t')
    .replace(/<w:br\b[^>]*\/?>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<\/w:tc>/g, ' | ')
    .replace(/<\/w:tr>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function parsePdf(buffer) {
  const { PDFParse } = await import('pdf-parse')
  const parser = new PDFParse({ data: new Uint8Array(buffer) })
  try {
    const result = await parser.getText()
    return (result.text ?? '').replace(/[ \t]+\n/g, '\n').trim()
  } catch {
    return ''
  } finally {
    await parser.destroy().catch(() => {})
  }
}

/**
 * Отрендерить страницы PDF в PNG для OCR моделью (сканы без текстового слоя).
 * Нужен poppler: `brew install poppler`.
 * @returns {Promise<string[]>} пути к PNG
 */
export async function pdfPagesToPng(buffer, { dir, maxPages = 10, dpi = 150 }) {
  fs.mkdirSync(dir, { recursive: true })
  const src = path.join(dir, 'source.pdf')
  fs.writeFileSync(src, buffer)
  const prefix = path.join(dir, 'page')
  try {
    await execFileP('pdftoppm', ['-png', '-r', String(dpi), '-f', '1', '-l', String(maxPages), src, prefix])
  } catch (e) {
    if (e.code === 'ENOENT') throw new Error('нет pdftoppm — поставь poppler: brew install poppler')
    throw e
  }
  return fs.readdirSync(dir)
    .filter(f => f.startsWith('page') && f.endsWith('.png'))
    .sort()
    .map(f => path.join(dir, f))
}
