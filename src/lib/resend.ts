/**
 * Resend email client + send helpers.
 *
 * All outbound email goes through this module.
 * React Email templates are rendered server-side and passed as `react` prop.
 *
 * Module 8 adds the actual email template components.
 * Module 2 uses `sendEmail` directly for welcome and password-reset emails.
 */
import { Resend } from 'resend'

/**
 * Lazy singleton — the Resend client is created on first use, not at
 * module-load time.  This prevents build failures when RESEND_API_KEY
 * isn't available in the build environment.
 */
let _resend: Resend | null = null

function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY
    if (!key && process.env.NODE_ENV === 'production') {
      throw new Error('Missing env: RESEND_API_KEY')
    }
    _resend = new Resend(key ?? 're_test_dummy_key')
  }
  return _resend
}

/** @deprecated Use sendEmail() or addToMailingList() instead of direct access */
export const resend = { get instance() { return getResend() } }

export const EMAIL_FROM = `${process.env.RESEND_FROM_NAME ?? 'ALMANAR'} <${
  process.env.RESEND_FROM_EMAIL ?? 'noreply@almanar.com'
}>`

export const RESEND_AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID ?? ''

// ─── Send helper ──────────────────────────────────────────────────────────────

interface SendEmailOptions {
  to: string | string[]
  subject: string
  react: React.ReactElement
  replyTo?: string
}

/**
 * Wrapper around resend.emails.send with consistent from address and
 * error handling that never throws (to avoid crashing webhook handlers).
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  try {
    const { error } = await getResend().emails.send({
      from:     EMAIL_FROM,
      to:       options.to,
      subject:  options.subject,
      react:    options.react,
      replyTo:  options.replyTo,
    })

    if (error) {
      console.error('[Resend] send error:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('[Resend] unexpected error:', err)
    return false
  }
}

// ─── Mailing list ─────────────────────────────────────────────────────────────

/**
 * Add an email address to the Resend Audience contact list.
 * Called when a user claims a free product.
 * Safe to call multiple times — Resend handles deduplication.
 */
export async function addToMailingList(
  email: string,
  name?: string | null
): Promise<void> {
  if (!RESEND_AUDIENCE_ID) return

  try {
    await getResend().contacts.create({
      audienceId: RESEND_AUDIENCE_ID,
      email,
      firstName:  name?.split(' ')[0] ?? undefined,
      lastName:   name?.split(' ').slice(1).join(' ') || undefined,
      unsubscribed: false,
    })
  } catch (err) {
    // Non-fatal — log and continue
    console.warn('[Resend] addToMailingList failed:', err)
  }
}
