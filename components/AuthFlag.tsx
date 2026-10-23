'use client'
import { useEffect } from 'react'

// Метки html[data-auth] и html[data-pro] ставит инлайн-скрипт в
// app/_root/shell.tsx до первой отрисовки; после клиентской перерисовки
// React их теряет — ставим снова. Статус Pro может смениться после входа
// (владелец открыл доступ в /admin/pro) — раз в 5 минут сверяемся с сервером.

const CHECK_KEY = 'bx_pro_checked'
const CHECK_MS = 5 * 60 * 1000

function apply() {
  const c = document.cookie
  const h = document.documentElement
  if (c.indexOf('bx_auth=1') > -1) h.setAttribute('data-auth', '1')
  if (c.indexOf('bx_pro=1') > -1) h.setAttribute('data-pro', '1')
  else h.removeAttribute('data-pro')
}

export function AuthFlag() {
  useEffect(() => {
    try {
      apply()
      if (document.cookie.indexOf('bx_auth=1') === -1) return
      const last = Number(sessionStorage.getItem(CHECK_KEY) ?? 0)
      if (Date.now() - last < CHECK_MS) return
      sessionStorage.setItem(CHECK_KEY, String(Date.now()))
      fetch('/api/account/pro', { cache: 'no-store' }).then(() => apply()).catch(() => {})
    } catch {}
  }, [])
  return null
}
