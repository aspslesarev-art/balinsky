import 'server-only'
import nodemailer from 'nodemailer'

// Transactional mail over plain SMTP — works with a Google Workspace mailbox
// (smtp.gmail.com:465 + app password) or any provider's SMTP relay (Resend:
// smtp.resend.com, user «resend», password = API key). Configured entirely by
// env, so switching provider is a Vercel env change, not a deploy of code.
//
//   SMTP_HOST, SMTP_PORT (465 → TLS), SMTP_USER, SMTP_PASS, MAIL_FROM

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

export async function sendMail(msg: { to: string; subject: string; text: string; html: string }): Promise<boolean> {
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
