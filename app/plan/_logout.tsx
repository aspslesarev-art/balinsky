'use client'

import { useState } from 'react'
import styles from './plan.module.css'

/** Выход из админской сессии: эндпоинт принимает только POST, ссылкой не обойтись. */
export function LogoutButton() {
  const [busy, setBusy] = useState(false)
  return (
    <button
      type="button"
      className={styles.reset}
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        try {
          await fetch('/api/admin/logout', { method: 'POST' })
          window.location.href = '/admin?next=/plan'
        } catch {
          setBusy(false)
        }
      }}
    >
      {busy ? 'Выходим…' : 'Выйти и войти заново'}
    </button>
  )
}
