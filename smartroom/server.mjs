// Smart Room — гостевой портал отеля, который поднимается на своём сервере.
//
// Ничего внешнего: ни Supabase, ни Vercel, ни базы данных. Node + файлы в
// ./data. Запуск: `npm install && node server.mjs` → http://<сервер>:3000
//
// Три поверхности:
//   /stay/<token>  — гость (то, что за QR в номере)
//   /desk          — ресепшн
//   /admin         — отели, номера, каталог, печать QR

import http from 'node:http'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import QRCode from 'qrcode'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const DATA = process.env.DATA_DIR || path.join(ROOT, 'data')
const PUBLIC = path.join(ROOT, 'public')
const PORT = Number(process.env.PORT || 3000)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'
// Секрет подписи кук. Не задан — генерируем при старте: сессии живут до
// перезапуска, что для одного отеля нормально, а секрет не утекает в git.
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(16).toString('hex')
// Публичный адрес сервера — он попадает в QR-коды. За реверс-прокси задать
// PUBLIC_URL=https://hotel.example.com, иначе QR укажет на localhost.
const PUBLIC_URL = (process.env.PUBLIC_URL || `http://localhost:${PORT}`).replace(/\/$/, '')

/* ─────────────────────────── хранилище ─────────────────────────── */

// Файлы вместо базы: у одного отеля это сотни строк в день, а разворачивать
// Postgres ради них — лишний повод чему-то сломаться на чужом сервере.
const store = { hotels: [], threads: {}, events: [] }
const FILES = { hotels: 'hotels.json', threads: 'threads.json', events: 'events.json' }

async function load() {
  await fsp.mkdir(DATA, { recursive: true })
  for (const [key, file] of Object.entries(FILES)) {
    try {
      store[key] = JSON.parse(await fsp.readFile(path.join(DATA, file), 'utf8'))
    } catch {
      // Файла нет — первый запуск.
    }
  }
  if (store.hotels.length === 0) {
    store.hotels = [demoHotel()]
    await save('hotels')
    console.log('[smartroom] заведён демо-отель: код отеля "demo", код смены "1234"')
  }
}

const pending = new Set()
async function save(key) {
  // Пишем через временный файл: убитый на середине процесс не оставит
  // обрезанный JSON, из которого сервис потом не поднимется.
  if (pending.has(key)) return
  pending.add(key)
  setTimeout(async () => {
    pending.delete(key)
    const target = path.join(DATA, FILES[key])
    const tmp = `${target}.tmp`
    try {
      await fsp.writeFile(tmp, JSON.stringify(store[key], null, 2))
      await fsp.rename(tmp, target)
    } catch (e) {
      console.error('[smartroom] не удалось сохранить', key, e.message)
    }
  }, 50)
}

const id = () => crypto.randomBytes(8).toString('hex')
// Алфавит без похожих символов: токен из QR иногда диктуют голосом.
const TOKEN_ABC = '23456789abcdefghjkmnpqrstuvwxyz'
const token = (n = 10) =>
  Array.from({ length: n }, () => TOKEN_ABC[crypto.randomInt(TOKEN_ABC.length)]).join('')

/* ─────────────────────────── демо-контент ─────────────────────────── */

function demoHotel() {
  const cat = (code, section, icon, title, caption, items) => ({
    id: id(), code, section, icon, title, caption, active: true,
    items: items.map(i => ({ id: id(), active: true, unit: 'once', photo: '', ...i })),
  })
  return {
    id: id(),
    slug: 'demo',
    name: 'Villa Sunrise',
    staffCode: '1234',
    langs: ['en', 'ru', 'zh'],
    whatsapp: '',
    telegram: '',
    hasRestaurant: true,
    rooms: ['101', '102', 'Villa 05'].map(label => ({ id: id(), label, token: token(), active: true })),
    catalog: [
      cat('restaurant', 'hotel', 'kitchen',
        { en: 'Our restaurant', ru: 'Наш ресторан', zh: '酒店餐厅' },
        { en: 'Breakfast to room', ru: 'Завтрак в номер', zh: '早餐送房' }, [
          { code: 'breakfast', price: 0,
            title: { en: 'Breakfast to your room', ru: 'Завтрак в номер', zh: '早餐送到房间' },
            descr: { en: 'Served 7:00–10:30', ru: 'С 7:00 до 10:30', zh: '7:00–10:30' } },
          { code: 'dinner', price: 30,
            title: { en: 'Dinner for two', ru: 'Ужин на двоих', zh: '双人晚餐' },
            descr: { en: 'Three courses by candlelight', ru: 'Три блюда при свечах', zh: '三道菜烛光晚餐' } },
        ]),
      cat('tours', 'bali', 'map',
        { en: 'Tours & trips', ru: 'Туры и поездки', zh: '旅游线路' },
        { en: 'Uluwatu, Ubud, sunrise', ru: 'Улувату, Убуд, рассвет', zh: '乌鲁瓦图、乌布、日出' }, [
          { code: 'ubud', price: 55,
            title: { en: 'Ubud day trip', ru: 'День в Убуде', zh: '乌布一日游' },
            descr: { en: 'Monkey forest, rice terraces, waterfall', ru: 'Лес обезьян, рисовые террасы, водопад', zh: '猴林、梯田、瀑布' } },
          { code: 'batur', price: 40,
            title: { en: 'Mount Batur sunrise trek', ru: 'Рассвет на вулкане Батур', zh: '巴杜尔火山日出徒步' },
            descr: { en: 'Leave at 2:00, back by 10:00', ru: 'Выезд в 2:00, назад к 10:00', zh: '2:00出发，10:00返回' } },
        ]),
      cat('massage', 'bali', 'flower',
        { en: 'Massage & spa', ru: 'Массаж и спа', zh: '按摩与水疗' },
        { en: 'In your room tonight', ru: 'В номере уже сегодня', zh: '今晚在您房间' }, [
          { code: 'balinese', price: 20,
            title: { en: 'Balinese massage, 60 min', ru: 'Балийский массаж, 60 мин', zh: '巴厘式按摩，60分钟' },
            descr: { en: 'Therapist comes to your room', ru: 'Мастер приезжает в номер', zh: '技师上门' } },
        ]),
      cat('roomkit', 'room', 'gamepad',
        { en: 'Room kit', ru: 'Техника в номер', zh: '客房设备' },
        { en: 'PlayStation, monitor', ru: 'PlayStation, монитор', zh: 'PlayStation、显示器' }, [
          { code: 'ps5', price: 15, unit: 'day',
            title: { en: 'PlayStation 5 with games', ru: 'PlayStation 5 с играми', zh: 'PlayStation 5 含游戏' },
            descr: { en: 'Ten games, two controllers', ru: 'Десять игр, два геймпада', zh: '十款游戏，两个手柄' } },
        ]),
      cat('scooter', 'every', 'moto',
        { en: 'Scooter & car', ru: 'Скутер и авто', zh: '摩托车与汽车' },
        { en: 'Delivered to the villa', ru: 'Пригонят к вилле', zh: '送车到别墅' }, [
          { code: 'scooter-125', price: 6, unit: 'day',
            title: { en: 'Scooter 125cc', ru: 'Скутер 125cc', zh: '摩托车125cc' },
            descr: { en: 'Helmet and rain poncho included', ru: 'Шлем и дождевик в комплекте', zh: '含头盔和雨衣' } },
        ]),
    ],
  }
}

/* ─────────────────────────── поиск ─────────────────────────── */

const hotelBySlug = slug => store.hotels.find(h => h.slug === slug) || null
const hotelById = hid => store.hotels.find(h => h.id === hid) || null

function findRoom(tok) {
  for (const hotel of store.hotels) {
    const room = hotel.rooms.find(r => r.token === tok && r.active)
    if (room) return { hotel, room }
  }
  return null
}

// Переписка и заказы висят на «смене» гостя, а не на номере: нажали «Выезд» —
// следующий гость по той же наклейке видит чистый лист.
function thread(roomId) {
  if (!store.threads[roomId]) {
    store.threads[roomId] = { guestName: '', openedAt: null, messages: [], orders: [] }
  }
  return store.threads[roomId]
}

function logEvent(hotel, room, type, ctx, lang) {
  store.events.push({
    at: Date.now(), hotelId: hotel.id, room: room?.label ?? '', type, lang: lang || '', ctx: ctx || {},
  })
  if (store.events.length > 20000) store.events = store.events.slice(-20000)
  save('events')
}

/* ─────────────────────────── сессии ─────────────────────────── */

const sign = value => `${value}.${crypto.createHmac('sha256', SECRET).update(value).digest('hex').slice(0, 32)}`
function verify(raw) {
  if (!raw) return null
  const i = raw.lastIndexOf('.')
  if (i < 0) return null
  const value = raw.slice(0, i)
  return sign(value) === raw ? value : null
}
const cookies = req => Object.fromEntries(
  (req.headers.cookie || '').split(';').map(c => c.trim().split('=')).filter(p => p[0]))

const isAdmin = req => verify(cookies(req).sr_admin) === 'admin'
function deskHotel(req, slug) {
  const hotel = hotelBySlug(slug)
  if (!hotel) return null
  if (isAdmin(req)) return hotel
  return verify(cookies(req).sr_desk) === hotel.id ? hotel : null
}
const setCookie = (res, name, value) => {
  res.setHeader('Set-Cookie',
    `${name}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 30}`)
}

/* ─────────────────────────── HTTP ─────────────────────────── */

const send = (res, code, body, type = 'application/json; charset=utf-8') => {
  res.writeHead(code, { 'Content-Type': type })
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body))
}
const json = (res, body, code = 200) => send(res, code, body)

async function readJson(req) {
  const chunks = []
  let size = 0
  for await (const c of req) {
    size += c.length
    if (size > 256 * 1024) throw new Error('too big')
    chunks.push(c)
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon' }

async function serveStatic(res, name) {
  const file = path.join(PUBLIC, name)
  // Не выпускаем чтение за пределы public/ — путь приходит из URL.
  if (!file.startsWith(PUBLIC)) return send(res, 403, 'forbidden', 'text/plain')
  try {
    const body = await fsp.readFile(file)
    // Страницы отдаём без кэша: после обновления сервиса гость и стойка должны
    // увидеть новую вёрстку сразу, а не после ручного сброса кэша браузера.
    if (file.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache, must-revalidate')
    send(res, 200, body, MIME[path.extname(file)] || 'application/octet-stream')
  } catch {
    send(res, 404, 'not found', 'text/plain')
  }
}

/** Публичный вид отеля: без кода смены и чужих номеров. */
function publicHotel(hotel) {
  return {
    name: hotel.name, langs: hotel.langs, whatsapp: hotel.whatsapp,
    telegram: hotel.telegram, hasRestaurant: hotel.hasRestaurant,
    catalog: hotel.catalog.filter(c => c.active && c.items.some(i => i.active))
      .map(c => ({ ...c, items: c.items.filter(i => i.active) })),
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x')
  const parts = url.pathname.split('/').filter(Boolean)
  const method = req.method

  try {
    /* ── страницы ── */
    if (url.pathname === '/') return serveStatic(res, 'admin.html')
    if (parts[0] === 'stay' && parts[1]) return serveStatic(res, 'guest.html')
    if (parts[0] === 'desk') return serveStatic(res, 'desk.html')
    if (parts[0] === 'admin' && parts[1] === 'qr' && parts[2]) return qrSheet(req, res, parts[2])
    if (parts[0] === 'admin') return serveStatic(res, 'admin.html')
    if (parts[0] === 'public') return serveStatic(res, parts.slice(1).join('/'))

    /* ── гость ── */
    if (parts[0] === 'api' && parts[1] === 'stay' && parts[2]) {
      const found = findRoom(parts[2])
      if (!found) return json(res, { error: 'unknown_room' }, 404)
      const { hotel, room } = found
      const t = thread(room.id)

      if (method === 'GET' && parts.length === 3) {
        return json(res, {
          hotel: publicHotel(hotel),
          room: { label: room.label },
          stay: t.openedAt ? { guestName: t.guestName } : null,
          messages: t.messages,
          orders: t.orders,
        })
      }

      if (method === 'POST' && parts[3] === 'message') {
        const body = await readJson(req)
        const text = String(body.text || '').trim().slice(0, 2000)
        if (!text) return json(res, { error: 'empty' }, 400)
        t.openedAt ||= Date.now()
        if (body.name) t.guestName = String(body.name).trim().slice(0, 80)
        t.messages.push({ id: id(), from: 'guest', text, lang: body.lang || '', at: Date.now(), readByStaff: false })
        save('threads')
        logEvent(hotel, room, 'chat_message', { len: text.length }, body.lang)
        return json(res, { ok: true })
      }

      if (method === 'POST' && parts[3] === 'order') {
        const body = await readJson(req)
        const whatsapp = String(body.whatsapp || '').trim()
        // WhatsApp обязателен: по нему отель подтверждает заказ, и он же
        // делает заявку доказуемой, когда считаем комиссию.
        if (whatsapp.replace(/\D/g, '').length < 6) return json(res, { error: 'bad_whatsapp' }, 400)

        // Что заказали, решает каталог, а не тело запроса.
        const category = hotel.catalog.find(c => c.items.some(i => i.id === body.itemId))
        const item = category?.items.find(i => i.id === body.itemId)
        if (!item || !item.active) return json(res, { error: 'unknown_item' }, 400)

        const open = t.orders.filter(o => o.status !== 'done' && o.status !== 'declined')
        if (open.length >= 12) return json(res, { error: 'too_many_open' }, 429)

        const title = item.title.ru || item.title.en
        const note = String(body.note || '').trim().slice(0, 500)
        const when = String(body.time || '').trim().slice(0, 120)
        t.openedAt ||= Date.now()
        t.orders.unshift({
          id: id(), itemId: item.id, title, price: item.price || 0, note, time: when,
          whatsapp, lang: body.lang || '', status: 'new', at: Date.now(),
        })
        // Заказ дублируем строкой в чат: у гостя и стойки одна общая лента.
        t.messages.push({
          id: id(), from: 'guest', text: note ? `${title} — ${note}` : title,
          lang: body.lang || '', at: Date.now(), readByStaff: false,
        })
        save('threads')
        logEvent(hotel, room, 'order_submit', { item: item.code, price: item.price || 0 }, body.lang)
        return json(res, { ok: true })
      }

      if (method === 'POST' && parts[3] === 'event') {
        const body = await readJson(req)
        const allowed = ['screen_open', 'category_tap', 'item_tap', 'lang_change', 'messenger_open', 'chat_open']
        if (!allowed.includes(body.type)) return json(res, { error: 'bad_type' }, 400)
        logEvent(hotel, room, body.type, body.ctx, body.lang)
        return json(res, { ok: true })
      }
    }

    /* ── стойка ── */
    if (parts[0] === 'api' && parts[1] === 'desk') {
      if (method === 'POST' && parts[2] === 'login') {
        const body = await readJson(req)
        const hotel = hotelBySlug(String(body.slug || '').trim().toLowerCase())
        if (!hotel || String(body.code || '').trim() !== hotel.staffCode) {
          return json(res, { error: 'wrong_code' }, 401)
        }
        // Две куки: подписанная сессия (HttpOnly) и открытый slug — по нему
        // панель понимает, чей отель открывать, если её открыли по прямой
        // ссылке /desk на другом устройстве, где localStorage пуст.
        res.setHeader('Set-Cookie', [
          `sr_desk=${sign(hotel.id)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 30}`,
          `sr_slug=${hotel.slug}; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 30}`,
        ])
        return json(res, { ok: true, slug: hotel.slug })
      }

      if (method === 'POST' && parts[2] === 'logout') {
        res.setHeader('Set-Cookie', ['sr_desk=; HttpOnly; Path=/; Max-Age=0', 'sr_slug=; Path=/; Max-Age=0'])
        return json(res, { ok: true })
      }

      const hotel = parts[2] ? deskHotel(req, parts[2]) : null
      if (!hotel) return json(res, { error: 'unauthorized' }, 401)

      if (method === 'GET' && parts[3] === 'state') {
        const rooms = hotel.rooms.map(room => {
          const t = thread(room.id)
          const last = t.messages[t.messages.length - 1] || null
          return {
            id: room.id, label: room.label, token: room.token, active: room.active,
            guestName: t.guestName, occupied: !!t.openedAt,
            unread: t.messages.filter(m => m.from === 'guest' && !m.readByStaff).length,
            openOrders: t.orders.filter(o => o.status === 'new' || o.status === 'in_progress').length,
            lastText: last?.text || '', lastAt: last?.at || 0,
          }
        })
        const roomId = url.searchParams.get('room')
        let detail = null
        if (roomId && hotel.rooms.some(r => r.id === roomId)) {
          const t = thread(roomId)
          // Стойка открыла номер — сообщения гостя прочитаны.
          let changed = false
          for (const m of t.messages) if (m.from === 'guest' && !m.readByStaff) { m.readByStaff = true; changed = true }
          if (changed) save('threads')
          detail = { messages: t.messages, orders: t.orders, guestName: t.guestName }
        }
        return json(res, { hotel: { name: hotel.name, slug: hotel.slug }, rooms, detail })
      }

      if (method === 'POST' && parts[3] === 'reply') {
        const body = await readJson(req)
        const room = hotel.rooms.find(r => r.id === body.roomId)
        const text = String(body.text || '').trim().slice(0, 2000)
        if (!room || !text) return json(res, { error: 'bad_request' }, 400)
        const t = thread(room.id)
        t.openedAt ||= Date.now()
        t.messages.push({ id: id(), from: 'staff', who: String(body.who || '').slice(0, 40), text, at: Date.now(), readByStaff: true })
        save('threads')
        return json(res, { ok: true })
      }

      if (method === 'POST' && parts[3] === 'order') {
        const body = await readJson(req)
        const room = hotel.rooms.find(r => r.id === body.roomId)
        if (!room || !['new', 'in_progress', 'done', 'declined'].includes(body.status)) {
          return json(res, { error: 'bad_request' }, 400)
        }
        const order = thread(room.id).orders.find(o => o.id === body.orderId)
        if (!order) return json(res, { error: 'not_found' }, 404)
        order.status = body.status
        save('threads')
        return json(res, { ok: true })
      }

      if (method === 'POST' && parts[3] === 'checkout') {
        const body = await readJson(req)
        const room = hotel.rooms.find(r => r.id === body.roomId)
        if (!room) return json(res, { error: 'not_found' }, 404)
        store.threads[room.id] = { guestName: '', openedAt: null, messages: [], orders: [] }
        save('threads')
        return json(res, { ok: true })
      }
    }

    /* ── админка ── */
    if (parts[0] === 'api' && parts[1] === 'admin') {
      if (method === 'POST' && parts[2] === 'login') {
        const body = await readJson(req)
        if (String(body.password || '') !== ADMIN_PASSWORD) return json(res, { error: 'wrong' }, 401)
        setCookie(res, 'sr_admin', sign('admin'))
        return json(res, { ok: true })
      }
      if (method === 'POST' && parts[2] === 'logout') {
        res.setHeader('Set-Cookie', 'sr_admin=; HttpOnly; Path=/; Max-Age=0')
        return json(res, { ok: true })
      }
      if (!isAdmin(req)) return json(res, { error: 'unauthorized' }, 401)

      if (method === 'GET' && parts[2] === 'hotels') {
        return json(res, { hotels: store.hotels, publicUrl: PUBLIC_URL })
      }

      if (method === 'POST' && parts[2] === 'hotel') {
        const body = await readJson(req)
        const slug = String(body.slug || '').trim().toLowerCase()
        if (!/^[a-z0-9-]{2,40}$/.test(slug)) return json(res, { error: 'bad_slug' }, 400)
        let hotel = hotelById(body.id)
        if (!hotel) {
          if (hotelBySlug(slug)) return json(res, { error: 'slug_taken' }, 409)
          hotel = { id: id(), slug, name: '', staffCode: token(4), langs: ['en', 'ru', 'zh'], whatsapp: '', telegram: '', hasRestaurant: true, rooms: [], catalog: [] }
          store.hotels.push(hotel)
        }
        hotel.slug = slug
        hotel.name = String(body.name || hotel.name).slice(0, 120)
        hotel.whatsapp = String(body.whatsapp ?? hotel.whatsapp).replace(/\D/g, '')
        hotel.telegram = String(body.telegram ?? hotel.telegram).replace('@', '').trim()
        hotel.hasRestaurant = body.hasRestaurant ?? hotel.hasRestaurant
        if (Array.isArray(body.langs) && body.langs.length) hotel.langs = body.langs
        if (body.newStaffCode) hotel.staffCode = token(4)
        save('hotels')
        return json(res, { ok: true, hotel })
      }

      if (method === 'POST' && parts[2] === 'rooms') {
        const body = await readJson(req)
        const hotel = hotelById(body.hotelId)
        if (!hotel) return json(res, { error: 'not_found' }, 404)
        if (body.remove) {
          hotel.rooms = hotel.rooms.filter(r => r.id !== body.remove)
        } else if (body.rotate) {
          const room = hotel.rooms.find(r => r.id === body.rotate)
          if (room) room.token = token()
        } else {
          const existing = new Set(hotel.rooms.map(r => r.label))
          for (const raw of String(body.labels || '').split('\n')) {
            const label = raw.trim()
            if (label && !existing.has(label)) hotel.rooms.push({ id: id(), label, token: token(), active: true })
          }
        }
        save('hotels')
        return json(res, { ok: true, rooms: hotel.rooms })
      }

      if (method === 'POST' && parts[2] === 'catalog') {
        const body = await readJson(req)
        const hotel = hotelById(body.hotelId)
        if (!hotel) return json(res, { error: 'not_found' }, 404)

        if (body.kind === 'category') {
          const cat = hotel.catalog.find(c => c.id === body.id)
          if (cat) Object.assign(cat, { section: body.section ?? cat.section, icon: body.icon ?? cat.icon, title: body.title ?? cat.title, caption: body.caption ?? cat.caption, active: body.active ?? cat.active })
          else hotel.catalog.push({ id: id(), code: String(body.code || '').trim(), section: body.section || 'bali', icon: body.icon || 'map', title: body.title || {}, caption: body.caption || {}, active: true, items: [] })
        } else if (body.kind === 'item') {
          const cat = hotel.catalog.find(c => c.id === body.categoryId)
          if (!cat) return json(res, { error: 'no_category' }, 400)
          const item = cat.items.find(i => i.id === body.id)
          if (item) Object.assign(item, { title: body.title ?? item.title, descr: body.descr ?? item.descr, price: body.price ?? item.price, unit: body.unit ?? item.unit, photo: body.photo ?? item.photo, active: body.active ?? item.active })
          else cat.items.push({ id: id(), code: String(body.code || '').trim(), title: body.title || {}, descr: body.descr || {}, price: Number(body.price) || 0, unit: body.unit || 'once', photo: body.photo || '', active: true })
        } else if (body.kind === 'remove-item') {
          const cat = hotel.catalog.find(c => c.id === body.categoryId)
          if (cat) cat.items = cat.items.filter(i => i.id !== body.id)
        } else if (body.kind === 'remove-category') {
          hotel.catalog = hotel.catalog.filter(c => c.id !== body.id)
        }
        save('hotels')
        return json(res, { ok: true, catalog: hotel.catalog })
      }

      if (method === 'GET' && parts[2] === 'events.csv') {
        const hotel = hotelById(url.searchParams.get('hotel'))
        const days = Math.min(365, Math.max(1, Number(url.searchParams.get('days')) || 30))
        const since = Date.now() - days * 864e5
        const cell = v => (/[",;\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))
        const rows = [['time', 'type', 'room', 'lang', 'context']]
        for (const e of store.events) {
          if (e.at < since || (hotel && e.hotelId !== hotel.id)) continue
          rows.push([new Date(e.at).toISOString(), e.type, e.room, e.lang,
            Object.entries(e.ctx || {}).map(([k, v]) => `${k}=${v}`).join(' ')])
        }
        // BOM — иначе Excel открывает кириллицу кракозябрами.
        res.writeHead(200, {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="smartroom-events.csv"',
        })
        return res.end('﻿' + rows.map(r => r.map(cell).join(',')).join('\n'))
      }

      if (method === 'GET' && parts[2] === 'stats') {
        const hotel = hotelById(url.searchParams.get('hotel'))
        const orders = hotel
          ? hotel.rooms.flatMap(r => thread(r.id).orders)
          : Object.values(store.threads).flatMap(t => t.orders)
        const count = type => store.events.filter(e => e.type === type && (!hotel || e.hotelId === hotel.id)).length
        return json(res, {
          orders: orders.length,
          gmv: orders.reduce((a, o) => a + (o.price || 0), 0),
          screens: count('screen_open'),
          categories: count('category_tap'),
          items: count('item_tap'),
          chats: count('chat_message'),
          messengers: count('messenger_open'),
        })
      }
    }

    send(res, 404, 'not found', 'text/plain')
  } catch (e) {
    console.error('[smartroom]', e)
    json(res, { error: 'server_error' }, 500)
  }
})

/* ─────────────────────────── лист QR на печать ─────────────────────────── */

async function qrSheet(req, res, slug) {
  if (!isAdmin(req)) return send(res, 401, 'Нужен вход в админку', 'text/plain; charset=utf-8')
  const hotel = hotelBySlug(slug)
  if (!hotel) return send(res, 404, 'not found', 'text/plain')

  const cards = await Promise.all(hotel.rooms.filter(r => r.active).map(async room => {
    const url = `${PUBLIC_URL}/stay/${room.token}`
    // Коррекция M: наклейку затирают руками и заливают кофе.
    const svg = await QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'M', margin: 1, width: 320 })
    return `<div class="card"><b>${esc(hotel.name)}</b><span>${esc(room.label)}</span>${svg}<i>${esc(url)}</i></div>`
  }))

  send(res, 200, `<!doctype html><meta charset="utf-8"><title>QR — ${esc(hotel.name)}</title>
<style>
body{font:15px system-ui;margin:24px;color:#173430}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.card{border:1px solid #C4D0CC;border-radius:14px;padding:14px;text-align:center;break-inside:avoid}
.card b{display:block;font-size:15px}
.card span{display:block;color:#3F5954;margin-bottom:8px}
.card svg{width:100%;max-width:220px}
.card i{display:block;font-size:11px;color:#3F5954;font-style:normal;word-break:break-all;margin-top:6px}
@media print{.no-print{display:none}body{margin:0}}
</style>
<div class="no-print" style="margin-bottom:16px">
  <b>${esc(hotel.name)}</b> — ${cards.length} карточек. Печатайте из браузера (Ctrl/Cmd+P).
  <a href="/admin" style="margin-left:12px">← В админку</a>
</div>
<div class="grid">${cards.join('')}</div>`, 'text/html; charset=utf-8')
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

/* ─────────────────────────── старт ─────────────────────────── */

await load()
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[smartroom] сервер: ${PUBLIC_URL}`)
  console.log(`[smartroom] админка: ${PUBLIC_URL}/admin  (пароль: ${ADMIN_PASSWORD === 'admin123' ? 'admin123 — смените ADMIN_PASSWORD' : 'из ADMIN_PASSWORD'})`)
  console.log(`[smartroom] стойка:  ${PUBLIC_URL}/desk`)
  for (const hotel of store.hotels) {
    for (const room of hotel.rooms) console.log(`[smartroom] ${hotel.name} · ${room.label}: ${PUBLIC_URL}/stay/${room.token}`)
  }
})
