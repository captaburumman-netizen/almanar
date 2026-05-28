/**
 * Unit tests — Stripe webhook handlers (handlers.ts)
 *
 * Tests the exported handler functions directly with all DB/email
 * dependencies mocked. Route-level dispatch is covered in webhook-route.test.ts.
 *
 * Covers:
 *   mapStripeStatus               — pure status mapping utility
 *   handleCheckoutCompleted       — course / product / bundle purchase flows
 *   handleSubscriptionUpserted    — subscription create / update + member enrollments
 *   handleSubscriptionDeleted     — subscription cancel + enrollment cleanup
 *   handlePaymentFailed           — mark subscription PAST_DUE
 */

import type Stripe from 'stripe'
import {
  mapStripeStatus,
  handleCheckoutCompleted,
  handleSubscriptionUpserted,
  handleSubscriptionDeleted,
  handlePaymentFailed,
} from '@/app/api/stripe/webhook/handlers'

// ─── Mock: Prisma ─────────────────────────────────────────────────────────────

const mockTransaction            = jest.fn()
const mockCoursePurchaseUpdate   = jest.fn()
const mockEnrollmentUpsert       = jest.fn()
const mockEnrollmentDeleteMany   = jest.fn()
const mockProductPurchaseUpdate  = jest.fn()
const mockUserFindUnique         = jest.fn()
const mockUserUpdateMany         = jest.fn()
const mockCourseFindUnique       = jest.fn()
const mockCourseFindMany         = jest.fn()
const mockProductFindUnique      = jest.fn()
const mockBundleFindUnique       = jest.fn()
const mockSubscriptionUpsert     = jest.fn()
const mockSubscriptionUpdateMany = jest.fn()
const mockMembershipPlanFindFirst = jest.fn()

jest.mock('@/lib/db', () => ({
  db: {
    $transaction:    (...a: unknown[]) => mockTransaction(...a),
    coursePurchase:  { update:     (...a: unknown[]) => mockCoursePurchaseUpdate(...a)    },
    enrollment:      {
      upsert:     (...a: unknown[]) => mockEnrollmentUpsert(...a),
      deleteMany: (...a: unknown[]) => mockEnrollmentDeleteMany(...a),
    },
    productPurchase: { update:     (...a: unknown[]) => mockProductPurchaseUpdate(...a)   },
    user:            {
      findUnique: (...a: unknown[]) => mockUserFindUnique(...a),
      updateMany: (...a: unknown[]) => mockUserUpdateMany(...a),
    },
    course: {
      findUnique: (...a: unknown[]) => mockCourseFindUnique(...a),
      findMany:   (...a: unknown[]) => mockCourseFindMany(...a),
    },
    product:         { findUnique: (...a: unknown[]) => mockProductFindUnique(...a)       },
    bundle:          { findUnique: (...a: unknown[]) => mockBundleFindUnique(...a)        },
    subscription:    {
      upsert:     (...a: unknown[]) => mockSubscriptionUpsert(...a),
      updateMany: (...a: unknown[]) => mockSubscriptionUpdateMany(...a),
    },
    membershipPlan:  { findFirst:  (...a: unknown[]) => mockMembershipPlanFindFirst(...a) },
  },
}))

// ─── Mock: Resend ─────────────────────────────────────────────────────────────

const mockSendEmail = jest.fn()
jest.mock('@/lib/resend', () => ({
  sendEmail: (...a: unknown[]) => mockSendEmail(...a),
}))

// ─── Mock: downloads ─────────────────────────────────────────────────────────

const mockCreateDownloadToken = jest.fn()
const mockBuildDownloadLink   = jest.fn()
jest.mock('@/lib/downloads', () => ({
  createDownloadToken: (...a: unknown[]) => mockCreateDownloadToken(...a),
  buildDownloadLink:   (...a: unknown[]) => mockBuildDownloadLink(...a),
}))

// ─── Mock: coupons ───────────────────────────────────────────────────────────

const mockRedeemCoupon = jest.fn()
jest.mock('@/lib/coupons', () => ({
  redeemCoupon: (...a: unknown[]) => mockRedeemCoupon(...a),
}))

// ─── Mock: email components ───────────────────────────────────────────────────

jest.mock('@/emails/EnrollmentEmail',           () => ({ EnrollmentEmail:           () => null }))
jest.mock('@/emails/DownloadEmail',             () => ({ DownloadEmail:             () => null }))
jest.mock('@/emails/BundleDownloadEmail',       () => ({ BundleDownloadEmail:       () => null }))
jest.mock('@/emails/SubscriptionEmail',         () => ({ SubscriptionEmail:         () => null }))
jest.mock('@/emails/SubscriptionCanceledEmail', () => ({ SubscriptionCanceledEmail: () => null }))

// ─── Fixture factories ────────────────────────────────────────────────────────

function makeSession(overrides: Record<string, unknown> = {}): Stripe.Checkout.Session {
  return {
    id:             'cs_test',
    payment_intent: 'pi_test',
    customer:       'cus_test',
    metadata: {
      type:      'course_purchase',
      userId:    'user-1',
      purchaseId: 'cp-1',
      courseId:  'course-1',
      locale:    'ar',
    },
    ...overrides,
  } as unknown as Stripe.Checkout.Session
}

function makeSubscription(
  overrides: Record<string, unknown> = {},
): Stripe.Subscription {
  return {
    id:                   'sub_test',
    customer:             'cus_test',
    status:               'active' as Stripe.Subscription.Status,
    current_period_start: 1_700_000_000,
    current_period_end:   1_702_600_000,
    cancel_at_period_end: false,
    items:                { data: [{ price: { id: 'price_monthly_123' } }] },
    metadata:             { almanarUserId: 'user-1' },
    ...overrides,
  } as unknown as Stripe.Subscription
}

// ─── Default mocks applied before every test ─────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()

  // $transaction: execute all ops in parallel (mirrors Prisma's interactive behaviour)
  mockTransaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops))
  mockCoursePurchaseUpdate.mockResolvedValue({})
  mockEnrollmentUpsert.mockResolvedValue({})
  mockEnrollmentDeleteMany.mockResolvedValue({ count: 0 })
  mockProductPurchaseUpdate.mockResolvedValue({})
  mockUserFindUnique.mockResolvedValue({
    id:              'user-1',
    email:           'user@test.com',
    name:            'Alice',
    preferredLocale: 'ar',
  })
  mockUserUpdateMany.mockResolvedValue({ count: 0 })
  mockCourseFindUnique.mockResolvedValue({
    titleEn: 'Arabic 101', titleAr: 'عربي 101', slug: 'arabic-101',
  })
  mockCourseFindMany.mockResolvedValue([])
  mockProductFindUnique.mockResolvedValue({ titleEn: 'Free Book', titleAr: 'كتاب مجاني' })
  mockBundleFindUnique.mockResolvedValue(null)
  mockSubscriptionUpsert.mockResolvedValue({})
  mockSubscriptionUpdateMany.mockResolvedValue({ count: 1 })
  mockMembershipPlanFindFirst.mockResolvedValue({
    id:                   'plan-1',
    nameEn:               'Pro',
    nameAr:               'احترافي',
    stripePriceIdMonthly: 'price_monthly_123',
    stripePriceIdAnnual:  'price_annual_123',
  })
  mockCreateDownloadToken.mockResolvedValue({ token: 'dl-token-abc' })
  mockBuildDownloadLink.mockImplementation((t: string) => `https://app.almanar.co/dl/${t}`)
  mockSendEmail.mockResolvedValue(undefined)
  mockRedeemCoupon.mockResolvedValue(undefined)
})

// ═══════════════════════════════════════════════════════════════════════════════
// mapStripeStatus
// ═══════════════════════════════════════════════════════════════════════════════

describe('mapStripeStatus', () => {
  const cases: [Stripe.Subscription.Status, string][] = [
    ['active',             'ACTIVE'],
    ['canceled',           'CANCELED'],
    ['past_due',           'PAST_DUE'],
    ['trialing',           'TRIALING'],
    ['unpaid',             'UNPAID'],
    ['incomplete',         'INCOMPLETE'],
    ['incomplete_expired', 'CANCELED'],
    ['paused',             'CANCELED'],
  ]

  it.each(cases)('maps "%s" → "%s"', (input, expected) => {
    expect(mapStripeStatus(input)).toBe(expected)
  })

  it('falls back to INCOMPLETE for unknown statuses', () => {
    expect(mapStripeStatus('unknown_status' as Stripe.Subscription.Status)).toBe('INCOMPLETE')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// handleCheckoutCompleted
// ═══════════════════════════════════════════════════════════════════════════════

describe('handleCheckoutCompleted', () => {
  // ── missing / no-op cases ───────────────────────────────────────────────────

  it('returns early and touches no DB when metadata.type is absent', async () => {
    await handleCheckoutCompleted(makeSession({ metadata: {} }))
    expect(mockTransaction).not.toHaveBeenCalled()
    expect(mockProductPurchaseUpdate).not.toHaveBeenCalled()
  })

  it('returns early when course_purchase metadata is incomplete', async () => {
    await handleCheckoutCompleted(
      makeSession({ metadata: { type: 'course_purchase', userId: 'user-1' } }),  // missing purchaseId + courseId
    )
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  // ── course_purchase ─────────────────────────────────────────────────────────

  it('course_purchase: runs $transaction with coursePurchase.update + enrollment.upsert', async () => {
    await handleCheckoutCompleted(makeSession())
    expect(mockTransaction).toHaveBeenCalledTimes(1)
    // The transaction array contains promises returned by update + upsert
    expect(mockCoursePurchaseUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cp-1' },
        data:  expect.objectContaining({ status: 'COMPLETED' }),
      }),
    )
    expect(mockEnrollmentUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where:  { userId_courseId: { userId: 'user-1', courseId: 'course-1' } },
        create: expect.objectContaining({ accessType: 'PURCHASE' }),
      }),
    )
  })

  it('course_purchase: sends enrollment email when user and course are found', async () => {
    await handleCheckoutCompleted(makeSession())
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@test.com',
      }),
    )
  })

  it('course_purchase: does not send email when user lookup returns null', async () => {
    mockUserFindUnique.mockResolvedValue(null)
    await handleCheckoutCompleted(makeSession())
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('course_purchase: calls redeemCoupon when couponId is in metadata', async () => {
    await handleCheckoutCompleted(
      makeSession({
        metadata: {
          type:       'course_purchase',
          userId:     'user-1',
          purchaseId: 'cp-1',
          courseId:   'course-1',
          couponId:   'cpn-1',
          couponSavings: '15',
        },
      }),
    )
    expect(mockRedeemCoupon).toHaveBeenCalledWith(
      'cpn-1', 'user-1', 'cp-1', 'course', 15,
    )
  })

  it('course_purchase: does not call redeemCoupon when couponId is absent', async () => {
    await handleCheckoutCompleted(makeSession())
    expect(mockRedeemCoupon).not.toHaveBeenCalled()
  })

  it('course_purchase: persists stripeCustomerId on user (best-effort)', async () => {
    await handleCheckoutCompleted(makeSession())
    expect(mockUserUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1', stripeCustomerId: null },
        data:  { stripeCustomerId: 'cus_test' },
      }),
    )
  })

  // ── product_purchase ────────────────────────────────────────────────────────

  it('product_purchase: updates purchase status and creates download token', async () => {
    await handleCheckoutCompleted(
      makeSession({
        metadata: {
          type:      'product_purchase',
          userId:    'user-1',
          purchaseId: 'pp-1',
          productId: 'prod-1',
          locale:    'en',
        },
      }),
    )
    expect(mockProductPurchaseUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pp-1' },
        data:  expect.objectContaining({ status: 'COMPLETED' }),
      }),
    )
    expect(mockCreateDownloadToken).toHaveBeenCalledWith('user-1', 'pp-1', 'prod-1')
  })

  it('product_purchase: sends download email when user and product found', async () => {
    await handleCheckoutCompleted(
      makeSession({
        metadata: {
          type:      'product_purchase',
          userId:    'user-1',
          purchaseId: 'pp-1',
          productId: 'prod-1',
        },
      }),
    )
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'user@test.com' }),
    )
  })

  it('product_purchase: calls redeemCoupon when couponId is in metadata', async () => {
    await handleCheckoutCompleted(
      makeSession({
        metadata: {
          type:          'product_purchase',
          userId:        'user-1',
          purchaseId:    'pp-1',
          productId:     'prod-1',
          couponId:      'cpn-2',
          couponSavings: '10',
        },
      }),
    )
    expect(mockRedeemCoupon).toHaveBeenCalledWith('cpn-2', 'user-1', 'pp-1', 'product', 10)
  })

  // ── bundle_purchase ─────────────────────────────────────────────────────────

  it('bundle_purchase: updates purchase status', async () => {
    mockBundleFindUnique.mockResolvedValue({
      titleEn: 'Bundle A', titleAr: 'حزمة أ',
      items: [],
    })
    await handleCheckoutCompleted(
      makeSession({
        metadata: {
          type:      'bundle_purchase',
          userId:    'user-1',
          purchaseId: 'bp-1',
          bundleId:  'bundle-1',
        },
      }),
    )
    expect(mockProductPurchaseUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'bp-1' },
        data:  expect.objectContaining({ status: 'COMPLETED' }),
      }),
    )
  })

  it('bundle_purchase: creates one download token per downloadable product', async () => {
    mockBundleFindUnique.mockResolvedValue({
      titleEn: 'Bundle A', titleAr: 'حزمة أ',
      items: [
        { product: { id: 'p1', titleEn: 'P1', titleAr: 'ف1', s3Key: 'key/p1.pdf' } },
        { product: { id: 'p2', titleEn: 'P2', titleAr: 'ف2', s3Key: null } },         // no s3Key → skip
        { product: { id: 'p3', titleEn: 'P3', titleAr: 'ف3', s3Key: 'key/p3.zip' } },
      ],
    })
    await handleCheckoutCompleted(
      makeSession({
        metadata: {
          type:      'bundle_purchase',
          userId:    'user-1',
          purchaseId: 'bp-1',
          bundleId:  'bundle-1',
        },
      }),
    )
    expect(mockCreateDownloadToken).toHaveBeenCalledTimes(2)
    expect(mockCreateDownloadToken).toHaveBeenCalledWith('user-1', 'bp-1', 'p1')
    expect(mockCreateDownloadToken).toHaveBeenCalledWith('user-1', 'bp-1', 'p3')
  })

  it('bundle_purchase: returns early when bundle is not found', async () => {
    mockBundleFindUnique.mockResolvedValue(null)
    await handleCheckoutCompleted(
      makeSession({
        metadata: {
          type:      'bundle_purchase',
          userId:    'user-1',
          purchaseId: 'bp-1',
          bundleId:  'bundle-1',
        },
      }),
    )
    expect(mockCreateDownloadToken).not.toHaveBeenCalled()
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('bundle_purchase: calls redeemCoupon when couponId is in metadata', async () => {
    mockBundleFindUnique.mockResolvedValue({
      titleEn: 'B', titleAr: 'ب',
      items: [],
    })
    await handleCheckoutCompleted(
      makeSession({
        metadata: {
          type:          'bundle_purchase',
          userId:        'user-1',
          purchaseId:    'bp-1',
          bundleId:      'bundle-1',
          couponId:      'cpn-3',
          couponSavings: '25',
        },
      }),
    )
    expect(mockRedeemCoupon).toHaveBeenCalledWith('cpn-3', 'user-1', 'bp-1', 'bundle', 25)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// handleSubscriptionUpserted
// ═══════════════════════════════════════════════════════════════════════════════

describe('handleSubscriptionUpserted', () => {
  it('upserts the subscription row in the DB', async () => {
    await handleSubscriptionUpserted(makeSubscription(), false)
    expect(mockSubscriptionUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stripeSubscriptionId: 'sub_test' },
      }),
    )
  })

  it('grants member-only course enrollments when status is ACTIVE', async () => {
    mockCourseFindMany.mockResolvedValue([{ id: 'mc-1' }, { id: 'mc-2' }])
    await handleSubscriptionUpserted(makeSubscription({ status: 'active' }), false)
    expect(mockEnrollmentUpsert).toHaveBeenCalledTimes(2)
    expect(mockEnrollmentUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where:  { userId_courseId: { userId: 'user-1', courseId: 'mc-1' } },
        create: expect.objectContaining({ accessType: 'MEMBERSHIP' }),
      }),
    )
  })

  it('grants member-only course enrollments when status is TRIALING', async () => {
    mockCourseFindMany.mockResolvedValue([{ id: 'mc-1' }])
    await handleSubscriptionUpserted(makeSubscription({ status: 'trialing' }), false)
    expect(mockEnrollmentUpsert).toHaveBeenCalledTimes(1)
  })

  it('does not grant enrollments when status is PAST_DUE', async () => {
    await handleSubscriptionUpserted(makeSubscription({ status: 'past_due' }), false)
    expect(mockEnrollmentUpsert).not.toHaveBeenCalled()
  })

  it('sends activation email on first creation (isNew=true)', async () => {
    mockCourseFindMany.mockResolvedValue([])
    await handleSubscriptionUpserted(makeSubscription({ status: 'active' }), true)
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'user@test.com' }),
    )
  })

  it('does not send activation email on update (isNew=false)', async () => {
    await handleSubscriptionUpserted(makeSubscription({ status: 'active' }), false)
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('falls back to stripeCustomerId lookup when almanarUserId is absent', async () => {
    const sub = makeSubscription({ metadata: {} }) // no almanarUserId
    // First call: resolve userId by customerId
    // Subsequent calls: return full user record for email
    mockUserFindUnique
      .mockResolvedValueOnce({ id: 'user-1' })
      .mockResolvedValueOnce({ email: 'user@test.com', name: 'Alice', preferredLocale: 'ar' })

    await handleSubscriptionUpserted(sub, true)

    expect(mockSubscriptionUpsert).toHaveBeenCalled()
  })

  it('returns early when user cannot be resolved (no metadata + customer not in DB)', async () => {
    const sub = makeSubscription({ metadata: {} })
    mockUserFindUnique.mockResolvedValue(null)
    await handleSubscriptionUpserted(sub, false)
    expect(mockSubscriptionUpsert).not.toHaveBeenCalled()
  })

  it('returns early when no priceId is found on the subscription', async () => {
    const sub = makeSubscription({ items: { data: [] } })
    await handleSubscriptionUpserted(sub, false)
    expect(mockSubscriptionUpsert).not.toHaveBeenCalled()
  })

  it('returns early when plan is not found in DB', async () => {
    mockMembershipPlanFindFirst.mockResolvedValue(null)
    await handleSubscriptionUpserted(makeSubscription(), false)
    expect(mockSubscriptionUpsert).not.toHaveBeenCalled()
  })

  it('uses ANNUAL interval when priceId matches stripePriceIdAnnual', async () => {
    const sub = makeSubscription({
      items: { data: [{ price: { id: 'price_annual_123' } }] },
    })
    await handleSubscriptionUpserted(sub, false)
    expect(mockSubscriptionUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ interval: 'ANNUAL' }),
        update: expect.objectContaining({ interval: 'ANNUAL' }),
      }),
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// handleSubscriptionDeleted
// ═══════════════════════════════════════════════════════════════════════════════

describe('handleSubscriptionDeleted', () => {
  const DELETED_SUB = {
    id:       'sub_test',
    metadata: { almanarUserId: 'user-1' },
  } as unknown as Stripe.Subscription

  it('marks subscription as CANCELED in the DB', async () => {
    await handleSubscriptionDeleted(DELETED_SUB)
    expect(mockSubscriptionUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stripeSubscriptionId: 'sub_test' },
        data:  { status: 'CANCELED', cancelAtPeriodEnd: false },
      }),
    )
  })

  it('removes MEMBERSHIP enrollments for the user', async () => {
    await handleSubscriptionDeleted(DELETED_SUB)
    expect(mockEnrollmentDeleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', accessType: 'MEMBERSHIP' },
      }),
    )
  })

  it('sends cancellation email to the user', async () => {
    await handleSubscriptionDeleted(DELETED_SUB)
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'user@test.com' }),
    )
  })

  it('skips enrollment deletion when almanarUserId is absent in metadata', async () => {
    const sub = { id: 'sub_test', metadata: {} } as unknown as Stripe.Subscription
    await handleSubscriptionDeleted(sub)
    expect(mockEnrollmentDeleteMany).not.toHaveBeenCalled()
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('does not send email when user is not found', async () => {
    mockUserFindUnique.mockResolvedValue(null)
    await handleSubscriptionDeleted(DELETED_SUB)
    expect(mockSendEmail).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// handlePaymentFailed
// ═══════════════════════════════════════════════════════════════════════════════

describe('handlePaymentFailed', () => {
  it('marks subscription as PAST_DUE when subscription ID is a string', async () => {
    const invoice = { id: 'in_test', subscription: 'sub_test' } as unknown as Stripe.Invoice
    await handlePaymentFailed(invoice)
    expect(mockSubscriptionUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stripeSubscriptionId: 'sub_test' },
        data:  { status: 'PAST_DUE' },
      }),
    )
  })

  it('marks subscription as PAST_DUE when subscription is an object with .id', async () => {
    const invoice = {
      id:           'in_test',
      subscription: { id: 'sub_from_obj' },
    } as unknown as Stripe.Invoice
    await handlePaymentFailed(invoice)
    expect(mockSubscriptionUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stripeSubscriptionId: 'sub_from_obj' },
      }),
    )
  })

  it('returns early without a DB call when subscription is null', async () => {
    const invoice = { id: 'in_test', subscription: null } as unknown as Stripe.Invoice
    await handlePaymentFailed(invoice)
    expect(mockSubscriptionUpdateMany).not.toHaveBeenCalled()
  })
})
