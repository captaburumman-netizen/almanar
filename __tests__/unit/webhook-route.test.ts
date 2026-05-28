/**
 * Unit tests — POST /api/stripe/webhook (route dispatch layer only)
 *
 * Handlers are mocked here so this file stays focused on:
 *   - Stripe signature verification
 *   - Event-type → handler dispatch
 *   - Error propagation (handler throws → 500)
 *   - Unknown event type → 200 no-op
 *
 * Handler business-logic tests live in webhook-handlers.test.ts.
 */

import { NextRequest } from 'next/server'

// ─── Mock: next/headers ───────────────────────────────────────────────────────

const mockGetHeaders = jest.fn()
jest.mock('next/headers', () => ({
  headers: (...a: unknown[]) => mockGetHeaders(...a),
}))

// ─── Mock: Stripe (signature verification only) ───────────────────────────────

const mockConstructEvent = jest.fn()
jest.mock('@/lib/stripe', () => ({
  getStripe: () => ({
    webhooks: { constructEvent: (...a: unknown[]) => mockConstructEvent(...a) },
  }),
}))

// ─── Mock: handlers (tested separately in webhook-handlers.test.ts) ───────────

const mockHandleCheckoutCompleted    = jest.fn()
const mockHandleSubscriptionUpserted = jest.fn()
const mockHandleSubscriptionDeleted  = jest.fn()
const mockHandlePaymentFailed        = jest.fn()

jest.mock('@/app/api/stripe/webhook/handlers', () => ({
  handleCheckoutCompleted:    (...a: unknown[]) => mockHandleCheckoutCompleted(...a),
  handleSubscriptionUpserted: (...a: unknown[]) => mockHandleSubscriptionUpserted(...a),
  handleSubscriptionDeleted:  (...a: unknown[]) => mockHandleSubscriptionDeleted(...a),
  handlePaymentFailed:        (...a: unknown[]) => mockHandlePaymentFailed(...a),
}))

// ─── Helper ───────────────────────────────────────────────────────────────────

function makeWebhookReq(body: string = '{}'): NextRequest {
  return new NextRequest('http://localhost/api/stripe/webhook', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
}

// ─── Dynamic import ───────────────────────────────────────────────────────────

let webhookPOST: (req: NextRequest) => Promise<Response>

beforeAll(async () => {
  const route = await import('@/app/api/stripe/webhook/route')
  webhookPOST = route.POST
})

beforeEach(() => {
  jest.clearAllMocks()

  // Default: valid signature → returns a no-op event
  mockGetHeaders.mockResolvedValue({
    get: (key: string) => key === 'stripe-signature' ? 'valid-sig' : null,
  })
  mockConstructEvent.mockReturnValue({
    type: 'checkout.session.completed',
    data: { object: {} },
  })

  // Default: all handlers resolve cleanly
  mockHandleCheckoutCompleted.mockResolvedValue(undefined)
  mockHandleSubscriptionUpserted.mockResolvedValue(undefined)
  mockHandleSubscriptionDeleted.mockResolvedValue(undefined)
  mockHandlePaymentFailed.mockResolvedValue(undefined)
})

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/stripe/webhook
// ═══════════════════════════════════════════════════════════════════════════════

describe('POST /api/stripe/webhook', () => {
  it('returns 400 when Stripe signature is invalid', async () => {
    mockConstructEvent.mockImplementation(() => { throw new Error('No signatures found') })
    const res  = await webhookPOST(makeWebhookReq())
    const json = await res.json() as { error: string }
    expect(res.status).toBe(400)
    expect(json.error).toMatch(/signature/i)
  })

  it('returns 200 with received:true on success', async () => {
    const res  = await webhookPOST(makeWebhookReq())
    const json = await res.json() as { received: boolean }
    expect(res.status).toBe(200)
    expect(json.received).toBe(true)
  })

  it('returns 200 and is a no-op for unrecognised event types', async () => {
    mockConstructEvent.mockReturnValue({ type: 'charge.succeeded', data: { object: {} } })
    const res = await webhookPOST(makeWebhookReq())
    expect(res.status).toBe(200)
    expect(mockHandleCheckoutCompleted).not.toHaveBeenCalled()
    expect(mockHandleSubscriptionUpserted).not.toHaveBeenCalled()
    expect(mockHandleSubscriptionDeleted).not.toHaveBeenCalled()
    expect(mockHandlePaymentFailed).not.toHaveBeenCalled()
  })

  it('returns 500 when a handler throws', async () => {
    mockHandleCheckoutCompleted.mockRejectedValue(new Error('DB exploded'))
    const res  = await webhookPOST(makeWebhookReq())
    const json = await res.json() as { error: string }
    expect(res.status).toBe(500)
    expect(json.error).toMatch(/handler/i)
  })

  it('dispatches checkout.session.completed → handleCheckoutCompleted', async () => {
    const session = { id: 'cs_test', metadata: { type: 'course_purchase' } }
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: session },
    })
    await webhookPOST(makeWebhookReq())
    expect(mockHandleCheckoutCompleted).toHaveBeenCalledWith(session)
  })

  it('dispatches customer.subscription.created → handleSubscriptionUpserted(sub, true)', async () => {
    const sub = { id: 'sub_test', status: 'active' }
    mockConstructEvent.mockReturnValue({
      type: 'customer.subscription.created',
      data: { object: sub },
    })
    await webhookPOST(makeWebhookReq())
    expect(mockHandleSubscriptionUpserted).toHaveBeenCalledWith(sub, true)
  })

  it('dispatches customer.subscription.updated → handleSubscriptionUpserted(sub, false)', async () => {
    const sub = { id: 'sub_test', status: 'active' }
    mockConstructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      data: { object: sub },
    })
    await webhookPOST(makeWebhookReq())
    expect(mockHandleSubscriptionUpserted).toHaveBeenCalledWith(sub, false)
  })

  it('dispatches customer.subscription.deleted → handleSubscriptionDeleted', async () => {
    const sub = { id: 'sub_test', status: 'canceled' }
    mockConstructEvent.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: { object: sub },
    })
    await webhookPOST(makeWebhookReq())
    expect(mockHandleSubscriptionDeleted).toHaveBeenCalledWith(sub)
  })

  it('dispatches invoice.payment_failed → handlePaymentFailed', async () => {
    const invoice = { id: 'in_test', subscription: 'sub_test' }
    mockConstructEvent.mockReturnValue({
      type: 'invoice.payment_failed',
      data: { object: invoice },
    })
    await webhookPOST(makeWebhookReq())
    expect(mockHandlePaymentFailed).toHaveBeenCalledWith(invoice)
  })
})
