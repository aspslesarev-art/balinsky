// Проверки расчёта слотов записи на встречи (lib/meetings/slots.ts).
// Запуск: node scripts/test-meeting-slots.mjs

import assert from 'node:assert/strict'
import { daySlots, isFeasible, hhmmToMin as m, minToHhmm } from '../lib/meetings/slots.ts'
import { DEFAULT_SETTINGS as settings } from '../lib/meetings/types.ts'

const base = { settings, isWorkDay: true, busy: [], bookings: [], dayDistrict: null, earliestMin: 0 }
const hh = arr => arr.map(minToHhmm)
let passed = 0
function test(name, fn) {
  fn()
  passed++
  console.log(`✓ ${name}`)
}

test('пустой день: онлайн с 10:00, живая в Убуде не раньше 12:00 из-за дороги', () => {
  const s = daySlots(base)
  assert.equal(hh(s.online)[0], '10:00')
  assert.equal(hh(s.online).at(-1), '17:30')
  assert.equal(hh(s.offline.ubud)[0], '12:00')
  assert.equal(hh(s.offline.ubud).at(-1), '17:00')
  assert.equal(hh(s.offline.canggu)[0], '11:00')
})

test('живая в Убуде в 12:00 держит 10:00–13:00 и закрепляет район', () => {
  const input = { ...base, bookings: [{ start: m('12:00'), end: m('13:00'), format: 'offline', district: 'ubud' }] }
  const s = daySlots(input)
  assert.deepEqual(Object.keys(s.offline), ['ubud'])
  // следующая живая в Убуде — через 30 минут после окончания
  assert.equal(hh(s.offline.ubud)[0], '13:30')
  // онлайн нельзя во время дороги, после встречи — с зазором 15 мин
  assert.ok(!s.online.includes(m('10:00')))
  assert.ok(!s.online.includes(m('11:00')))
  assert.equal(hh(s.online)[0], '13:30')
})

test('ранняя встреча в том же районе становится первой и берёт дорогу на себя', () => {
  const input = { ...base, bookings: [{ start: m('16:00'), end: m('17:00'), format: 'offline', district: 'ubud' }] }
  // 12:00–13:00 в Убуде: дорога 10–12, до встречи в 16:00 зазор больше 30 мин
  assert.ok(isFeasible({ start: m('12:00'), end: m('13:00'), format: 'offline', district: 'ubud' }, input))
  // 15:00–16:00 — нет зазора 30 минут до встречи в 16:00
  assert.ok(!isFeasible({ start: m('15:00'), end: m('16:00'), format: 'offline', district: 'ubud' }, input))
  // 14:30–15:30 — ровно 30 минут зазора
  assert.ok(isFeasible({ start: m('14:30'), end: m('15:30'), format: 'offline', district: 'ubud' }, input))
})

test('онлайн-встреча утром не даёт выехать в Убуд до её окончания', () => {
  const input = { ...base, bookings: [{ start: m('10:30'), end: m('11:00'), format: 'online', district: null }] }
  const s = daySlots(input)
  // выезд после 11:00 + 15 мин зазора → встреча не раньше 13:15 → по сетке 13:30
  assert.equal(hh(s.offline.ubud)[0], '13:30')
})

test('событие календаря блокирует встречу с зазором, а дорогу — без зазора', () => {
  const input = { ...base, busy: [{ start: m('14:00'), end: m('15:00') }] }
  assert.ok(!isFeasible({ start: m('16:00'), end: m('17:00'), format: 'offline', district: 'ubud' }, input))
  assert.ok(isFeasible({ start: m('17:00'), end: m('18:00'), format: 'offline', district: 'ubud' }, input))
  assert.ok(!isFeasible({ start: m('15:00'), end: m('15:30'), format: 'online', district: null }, input))
  assert.ok(isFeasible({ start: m('15:30'), end: m('16:00'), format: 'online', district: null }, input))
})

test('день, закреплённый вручную, открывает живые встречи только в своём районе', () => {
  const s = daySlots({ ...base, dayDistrict: 'canggu' })
  assert.deepEqual(Object.keys(s.offline), ['canggu'])
  assert.ok(!isFeasible({ start: m('14:00'), end: m('15:00'), format: 'offline', district: 'ubud' }, { ...base, dayDistrict: 'canggu' }))
})

test('выходной — слотов нет', () => {
  const s = daySlots({ ...base, isWorkDay: false })
  assert.equal(s.online.length, 0)
  assert.equal(Object.keys(s.offline).length, 0)
})

test('сегодня: минимальный запас сдвигает и выезд', () => {
  const s = daySlots({ ...base, earliestMin: m('13:00') })
  assert.equal(hh(s.online)[0], '13:00')
  assert.equal(hh(s.offline.canggu)[0], '14:00')
  assert.equal(hh(s.offline.ubud)[0], '15:00')
})

test('встреча не выходит за конец рабочего дня', () => {
  assert.ok(!isFeasible({ start: m('17:30'), end: m('18:30'), format: 'offline', district: 'canggu' }, base))
})

console.log(`\n${passed} проверок пройдено`)
