'use client'

import { useEffect } from 'react'

// Страховка для метки data-auth на <html>. Её ставит инлайн-скрипт в
// app/_root/shell.tsx до первой отрисовки, но если React перерисовывает
// документ на клиенте (например, после ошибки гидратации в dev), атрибут
// пропадает, а скрипт повторно не выполняется — вошедший видел гостевую
// кнопку Pro и скрытую аналитику (22.10.2026). Ставим метку ещё раз после
// монтирования.
export function AuthFlag() {
  useEffect(() => {
    try {
      if (document.cookie.indexOf('bx_auth=1') > -1) document.documentElement.setAttribute('data-auth', '1')
    } catch {}
  }, [])
  return null
}
