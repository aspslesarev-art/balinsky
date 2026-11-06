'use client'
import { useEffect } from 'react'

// Метки html[data-auth] и html[data-pro] ставит инлайн-скрипт в
// app/_root/shell.tsx до первой отрисовки; после клиентской перерисовки
// React их теряет — ставим снова. Статус Pro может смениться после входа
// (владелец открыл доступ в /admin/pro), поэтому сверяемся с сервером.
//
// Раньше сверка шла раз в 5 минут и только при полной загрузке страницы —
// человек, которому открыли Pro, видел его лишь после выхода и нового входа
// (владелец 06.11.2026). Теперь тот, кто ждёт Pro, проверяется при каждом
// открытии страницы и при возврате во вкладку (не чаще раза в 20 секунд);
// у кого Pro уже есть — по-прежнему раз в 5 минут (на случай, если закрыли).

const CHECK_KEY = 'bx_pro_checked'
const PRO_CHECK_MS = 5 * 60 * 1000
const WAITING_CHECK_MS = 20 * 1000

function apply() {
  const c = document.cookie
  const h = document.documentElement
  if (c.indexOf('bx_auth=1') > -1) h.setAttribute('data-auth', '1')
  if (c.indexOf('bx_pro=1') > -1) h.setAttribute('data-pro', '1')
  else h.removeAttribute('data-pro')
}

function check() {
  try {
    apply()
    if (document.cookie.indexOf('bx_auth=1') === -1) return
    const gap = document.cookie.indexOf('bx_pro=1') > -1 ? PRO_CHECK_MS : WAITING_CHECK_MS
    const last = Number(sessionStorage.getItem(CHECK_KEY) ?? 0)
    if (Date.now() - last < gap) return
    sessionStorage.setItem(CHECK_KEY, String(Date.now()))
    fetch('/api/account/pro', { cache: 'no-store' }).then(() => apply()).catch(() => {})
  } catch {}
}

export function AuthFlag() {
  useEffect(() => {
    check()
    const onBack = () => { if (document.visibilityState === 'visible') check() }
    document.addEventListener('visibilitychange', onBack)
    window.addEventListener('focus', onBack)
    return () => {
      document.removeEventListener('visibilitychange', onBack)
      window.removeEventListener('focus', onBack)
    }
  }, [])
  return null
}
