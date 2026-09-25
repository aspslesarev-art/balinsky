import 'server-only'
import nodemailer from 'nodemailer'

// Transactional mail over plain SMTP — works with a Google Workspace mailbox
// (smtp.gmail.com:465 + app password) or any provider's SMTP relay (Resend:
// smtp.resend.com, user «resend», password = API key). Configured entirely by
// env, so switching provider is a Vercel env change, not a deploy of code.
//
//   SMTP_HOST, SMTP_PORT (465 → TLS), SMTP_USER, SMTP_PASS, MAIL_FROM
//
// With SMTP_HOST=smtp.resend.com and a Resend key in SMTP_PASS the message
// goes through Resend's HTTPS API instead (see sendViaResendApi).

let _transport: nodemailer.Transporter | null = null

function transport(): nodemailer.Transporter | null {
  if (_transport) return _transport
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!host || !user || !pass) return null
  const port = Number(process.env.SMTP_PORT ?? 465)
  _transport = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } })
  return _transport
}

export function mailConfigured(): boolean {
  return transport() !== null
}

/**
 * Resend over HTTPS instead of SMTP: outbound SMTP ports are blocked on some
 * networks (the local test hung on 465 while the HTTPS API went through), and
 * one fetch is faster than an SMTP handshake inside a serverless function.
 */
async function sendViaResendApi(msg: { to: string; subject: string; text: string; html: string }): Promise<boolean> {
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.SMTP_PASS}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.MAIL_FROM ?? 'Balinsky <noreply@balinsky.info>', to: [msg.to], subject: msg.subject, text: msg.text, html: msg.html }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })
    if (!r.ok) console.error('[mailer] resend api', r.status, (await r.text()).slice(0, 300))
    return r.ok
  } catch (e) {
    console.error('[mailer] resend api failed:', e instanceof Error ? e.message : e)
    return false
  }
}

export async function sendMail(msg: { to: string; subject: string; text: string; html: string }): Promise<boolean> {
  if (process.env.SMTP_HOST === 'smtp.resend.com' && process.env.SMTP_PASS?.startsWith('re_')) return sendViaResendApi(msg)
  const t = transport()
  if (!t) {
    // Local development without a mailbox: print the message instead, so the
    // sign-in flow can be exercised end to end. Never in production.
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[mailer:dev] to=${msg.to} subject=${msg.subject}\n${msg.text}`)
      return true
    }
    console.error('[mailer] SMTP is not configured (SMTP_HOST / SMTP_USER / SMTP_PASS)')
    return false
  }
  try {
    await t.sendMail({ from: process.env.MAIL_FROM ?? process.env.SMTP_USER, ...msg })
    return true
  } catch (e) {
    console.error('[mailer] send failed:', e instanceof Error ? e.message : e)
    return false
  }
}
