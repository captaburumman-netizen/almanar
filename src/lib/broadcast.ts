/**
 * Broadcast utilities
 *
 * getAudienceRecipients — query the right users for a given audience segment
 * sendBroadcast         — batch-send an email to a list of recipients
 */
import * as React                        from 'react'
import { db }                            from '@/lib/db'
import { EMAIL_FROM }                    from '@/lib/resend'
import { BroadcastEmail }                from '@/emails/BroadcastEmail'
import type { BroadcastEmailProps }      from '@/emails/BroadcastEmail'
import { Resend }                        from 'resend'

const APP_URL       = process.env.NEXT_PUBLIC_APP_URL ?? 'https://almanar.co'
const MAX_RECIPIENTS = 1_000

// ─── Audience types ───────────────────────────────────────────────────────────

export const AUDIENCE_OPTIONS = [
  { value: 'ALL',           labelEn: 'All Users',             labelAr: 'جميع المستخدمين'      },
  { value: 'SUBSCRIBERS',   labelEn: 'Active Subscribers',    labelAr: 'المشتركون النشطون'     },
  { value: 'ENROLLEES',     labelEn: 'Course Students',       labelAr: 'طلاب الدورات'          },
  { value: 'PURCHASERS',    labelEn: 'Product Purchasers',    labelAr: 'مشترو المنتجات'        },
] as const

export type AudienceType = typeof AUDIENCE_OPTIONS[number]['value']

export interface Recipient {
  email: string
  name:  string | null
}

// ─── Audience queries ─────────────────────────────────────────────────────────

export async function getAudienceRecipients(
  audience: AudienceType,
): Promise<Recipient[]> {
  const select = { email: true, name: true }

  switch (audience) {
    case 'ALL':
      return db.user.findMany({
        where:   { email: { not: '' } },
        select,
        take:    MAX_RECIPIENTS,
        orderBy: { createdAt: 'asc' },
      })

    case 'SUBSCRIBERS':
      return db.user.findMany({
        where: { subscription: { status: 'ACTIVE' } },
        select,
        take:  MAX_RECIPIENTS,
      })

    case 'ENROLLEES':
      return db.user.findMany({
        where: { enrollments: { some: {} } },
        select,
        take:  MAX_RECIPIENTS,
      })

    case 'PURCHASERS':
      return db.user.findMany({
        where: { productPurchases: { some: { status: 'COMPLETED' } } },
        select,
        take:  MAX_RECIPIENTS,
      })

    default:
      return []
  }
}

// ─── Batch sender ─────────────────────────────────────────────────────────────

export interface BroadcastResult {
  sent:   number
  failed: number
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

export async function sendBroadcast(opts: {
  recipients: Recipient[]
  subject:    string
  body:       string
}): Promise<BroadcastResult> {
  const { recipients, subject, body } = opts
  const resend = new Resend(process.env.RESEND_API_KEY ?? 're_test_dummy_key')

  let sent   = 0
  let failed = 0

  // Resend batch.send accepts up to 100 emails per call
  const batches = chunkArray(recipients, 100)

  for (const batch of batches) {
    const emails = batch.map((r) => ({
      from:    EMAIL_FROM,
      to:      r.email,
      subject,
      react:   React.createElement(BroadcastEmail, {
        name:   r.name?.split(' ')[0] ?? '',
        body,
        appUrl: APP_URL,
      } satisfies BroadcastEmailProps),
    }))

    try {
      const { error } = await (resend.batch as any).send(emails)
      if (error) {
        failed += batch.length
        console.error('[broadcast] batch error:', error)
      } else {
        sent += batch.length
      }
    } catch (err) {
      failed += batch.length
      console.error('[broadcast] batch exception:', err)
    }
  }

  return { sent, failed }
}
