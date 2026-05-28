/**
 * Unit tests for Stripe webhook handlers.
 *
 * Each exported handler function is tested in isolation with mocked DB,
 * Stripe, Resend, and Downloads dependencies. No HTTP layer involved.
 */

// ─── DB mocks ─────────────────────────────────────────────────────────────────

const mockCoursePurchaseUpdate    = jest.fn()
const mockProductPurchaseUpdate   = jest.fn()
const mockEnrollmentUpsert        = jest.fn()
const mockEnrollmentDeleteMany    = jest.fn()
const mockUserFindUnique          = jest.fn()
const mockUserUpdateMany          = jest.fn()
const mockSubscriptionUpsert      = jest.fn()
const mockSubscriptionUpdateMany  = jest.fn()
const mockCourseFindMany          = jest.fn()
const mockCourseFindUnique        = jest.fn()
const mockMembershipPlanFindFirst = jest.fn()
const mockProductFindUnique       = jest.fn()
const mockTransaction             = jest.fn()

jest.mock('@/lib/db', () => ({
  db: {
    coursePurchase:  { update: mockCoursePurchaseUpdate },
    productPurchase: { update: mockProductPurchaseUpdate },
    enrollment:      {
      upsert:     mockEnrollmentUpsert,
      deleteMany: mockEnrollmentDeleteMany,
    },
    user: {
      findUnique:  mockUserFindUnique,
      updateMany:  mockUserUpdateMany,
    },
    subscription: {
      upsert:      mockSubscriptionUpsert,
      updateMany:  mockSubscriptionUpdateMany,
    },
    course:         { findMany: mockCourseFindMany, findUnique: mockCourseFindUnique },
    membershipPlan: { findFirst: mockMembershipPlanFindFirst },
    product:        { findUnique: mockProductFindUnique },
    $transaction:   mockTransaction,
  },
}))

// ─── Downloads mock ───────────────────────────────────────────────────────────

const mockCreateDownloadToken = jest.fn()
const mockBuildDownloadLink   = jest.fn()

jest.mock('@/lib/downloads', () => ({
  createDownloadToken: mockCreateDownloadToken,
  buildDownloadLink:   mockBuildDownloadLink,
}))

// ─── Stripe mock ──────────────────────────────────────────────────────────────

jest.mock('@/lib/stripe', () => ({
  getStripe:                 jest.fn(),
  getOrCreateStripeCustomer: jest.fn(),
  toCents:                   (n: number) => Math.round(n * 100),
  BILLING_CURRENCY:          'usd',
}))

// ─── Resend mock ──────────────────────────────────────────────────────────────

const mockSendEmail       = jest.fn()
const mockAddToMailingList = jest.fn()

jest.mock('@/lib/resend', () => ({
  sendEmail:        mockSendEmail,
  addToMailingList: mockAddToMailingList,
  EMAIL_FROM:       'ALMANAR <noreply@almanar.com>',
}))

// ─── Email template mocks (avoid React rendering in unit tests) ───────────────

jest.mock('@/emails/EnrollmentEmail',          () => ({ EnrollmentEmail:          jest.fn() }))
jest.mock('@/emails/DownloadEmail',            () => ({ DownloadEmail:            jest.fn() }))
jest.mock('@/emails/SubscriptionEmail',        () => ({ SubscriptionEmail:        jest.fn() }))
jest.mock('@/emails/SubscriptionCanceledEmail',() => ({ SubscriptionCanceledEmail:jest.fn() }))

// ─── Import handlers (after mocks are registered) ────────────────────────────

import {
  handleCheckoutCompleted,
  handleSubscriptionUpserted,
  handleSubscriptionDeleted,
  handlePaymentFailed,
} from '@/app/api/stripe/webhook/handlers'
import type Stripe from 'stripe'

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const USER_ID       = 'user-123'
const COURSE_ID     = 'course-456'
const PURCHASE_ID   = 'purchase-789'
const PLAN_ID       = 'plan-abc'
const SUB_ID        = 'sub_stripe_001'
const CUSTOMER_ID   = 'cus_stripe_001'
const PRICE_MONTHLY = 'price_monthly_001'
const PRICE_ANNUAL  = 'price_annual_001'
const PRODUCT_ID    = 'prod-123'

const MOCK_USER = {
  email:           'test@example.com',
  name:            'Test User',
  preferredLocale: 'en',
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.resetAllMocks()

  // Default: $transaction executes the array of operations in parallel
  mockTransaction.mockImplementation(
    (ops: Array<Promise<unknown>>) => Promise.all(ops)
  )

  // Default: downloads mock succeeds
  mockCreateDownloadToken.mockResolvedValue({ token: 'mock-token', id: 'dl-1' })
  mockBuildDownloadLink.mockReturnValue('http://localhost:3000/api/downloads/mock-token')

  // Default: all DB writes succeed
  mockProductPurchaseUpdate.mockResolvedValue({})
  mockCoursePurchaseUpdate.mockResolvedValue({})
  mockEnrollmentUpsert.mockResolvedValue({})
  mockEnrollmentDeleteMany.mockResolvedValue({ count: 0 })
  mockUserUpdateMany.mockResolvedValue({ count: 1 })
  mockSubscriptionUpsert.mockResolvedValue({})
  mockSubscriptionUpdateMany.mockResolvedValue({ count: 1 })
  mockCourseFindMany.mockResolvedValue([])
  mockCourseFindUnique.mockResolvedValue({ titleEn: 'Test Course', titleAr: 'دورة تجريبية', slug: 'test-course' })
  mockProductFindUnique.mockResolvedValue({ titleEn: 'Test Product', titleAr: 'منتج تجريبي' })
  mockMembershipPlanFindFirst.mockResolvedValue(null)
  mockUserFindUnique.mockResolvedValue(null)

  // Default: sendEmail returns true (success)
  mockSendEmail.mockResolvedValue(true)
  mockAddToMailingList.mockResolvedValue(undefined)
})

// ─── handleCheckoutCompleted ──────────────────────────────────────────────────

describe('handleCheckoutCompleted', () => {
  function makeSession(
    overrides: Partial<Stripe.Checkout.Session> = {}
  ): Stripe.Checkout.Session {
    return {
      id:             'cs_test_001',
      object:         'checkout.session',
      mode:           'payment',
      payment_intent: 'pi_test_001',
      customer:       CUSTOMER_ID,
      metadata: {
        type:       'course_purchase',
        purchaseId: PURCHASE_ID,
        userId:     USER_ID,
        courseId:   COURSE_ID,
        locale:     'en',
      },
      ...overrides,
    } as unknown as Stripe.Checkout.Session
  }

  it('updates purchase to COMPLETED and creates enrollment', async () => {
    await handleCheckoutCompleted(makeSession())

    expect(mockTransaction).toHaveBeenCalledTimes(1)

    expect(mockCoursePurchaseUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: PURCHASE_ID },
        data:  expect.objectContaining({
          status:                'COMPLETED',
          stripeSessionId:       'cs_test_001',
          stripePaymentIntentId: 'pi_test_001',
        }),
      })
    )

    expect(mockEnrollmentUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where:  { userId_courseId: { userId: USER_ID, courseId: COURSE_ID } },
        create: expect.objectContaining({
          userId:     USER_ID,
          courseId:   COURSE_ID,
          purchaseId: PURCHASE_ID,
          accessType: 'PURCHASE',
        }),
      })
    )
  })

  it('persists stripeCustomerId on the user (best-effort)', async () => {
    await handleCheckoutCompleted(makeSession())

    expect(mockUserUpdateMany).toHaveBeenCalledWith({
      where: { id: USER_ID, stripeCustomerId: null },
      data:  { stripeCustomerId: CUSTOMER_ID },
    })
  })

  it('does nothing when metadata type is not course_purchase', async () => {
    await handleCheckoutCompleted(
      makeSession({ metadata: { type: 'subscription', planId: PLAN_ID } })
    )

    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('does nothing when required metadata fields are missing', async () => {
    await handleCheckoutCompleted(
      makeSession({ metadata: { type: 'course_purchase' } }) // missing ids
    )

    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('handles null payment_intent gracefully', async () => {
    await handleCheckoutCompleted(makeSession({ payment_intent: null }))

    expect(mockCoursePurchaseUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ stripePaymentIntentId: null }),
      })
    )
  })

  it('marks product purchase COMPLETED and creates download token', async () => {
    const session = makeSession({
      metadata: {
        type:       'product_purchase',
        productId:  PRODUCT_ID,
        purchaseId: PURCHASE_ID,
        userId:     USER_ID,
        locale:     'en',
      },
    })

    await handleCheckoutCompleted(session)

    expect(mockProductPurchaseUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: PURCHASE_ID },
        data:  expect.objectContaining({ status: 'COMPLETED' }),
      })
    )
    expect(mockCreateDownloadToken).toHaveBeenCalledWith(
      USER_ID, PURCHASE_ID, PRODUCT_ID
    )
    // transaction not used for product purchases
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('sends enrollment email after course purchase when user is found', async () => {
    mockUserFindUnique.mockResolvedValue(MOCK_USER)

    await handleCheckoutCompleted(makeSession())

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to:      MOCK_USER.email,
        subject: expect.stringContaining('Test Course'),
      })
    )
  })

  it('skips enrollment email when user lookup returns null', async () => {
    mockUserFindUnique.mockResolvedValue(null)

    await handleCheckoutCompleted(makeSession())

    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('sends Arabic enrollment email when user preferredLocale is ar', async () => {
    mockUserFindUnique.mockResolvedValue({ ...MOCK_USER, preferredLocale: 'ar' })

    await handleCheckoutCompleted(makeSession())

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringMatching(/تم تسجيلك/),
      })
    )
  })

  it('sends download email after product purchase when user is found', async () => {
    mockUserFindUnique.mockResolvedValue(MOCK_USER)

    await handleCheckoutCompleted(
      makeSession({
        metadata: {
          type:       'product_purchase',
          productId:  PRODUCT_ID,
          purchaseId: PURCHASE_ID,
          userId:     USER_ID,
          locale:     'en',
        },
      })
    )

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to:      MOCK_USER.email,
        subject: 'Your download is ready',
      })
    )
  })
})

// ─── handleSubscriptionUpserted ───────────────────────────────────────────────

describe('handleSubscriptionUpserted', () => {
  function makeSub(
    status: Stripe.Subscription.Status = 'active',
    priceId = PRICE_MONTHLY,
    overrides: Partial<Stripe.Subscription> = {}
  ): Stripe.Subscription {
    return {
      id:       SUB_ID,
      object:   'subscription',
      customer: CUSTOMER_ID,
      status,
      cancel_at_period_end:  false,
      current_period_start:  1_700_000_000,
      current_period_end:    1_702_678_400,
      items: {
        object: 'list',
        data: [
          {
            price: { id: priceId, object: 'price' },
          },
        ],
      },
      metadata: { almanarUserId: USER_ID, planId: PLAN_ID, interval: 'monthly' },
      ...overrides,
    } as unknown as Stripe.Subscription
  }

  beforeEach(() => {
    mockMembershipPlanFindFirst.mockResolvedValue({
      id:                   PLAN_ID,
      nameEn:               'Family Plan',
      nameAr:               'الخطة العائلية',
      stripePriceIdMonthly: PRICE_MONTHLY,
      stripePriceIdAnnual:  PRICE_ANNUAL,
    })
  })

  it('upserts subscription record with ACTIVE status', async () => {
    await handleSubscriptionUpserted(makeSub('active'))

    expect(mockSubscriptionUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stripeSubscriptionId: SUB_ID },
        create: expect.objectContaining({
          userId:   USER_ID,
          planId:   PLAN_ID,
          status:   'ACTIVE',
          interval: 'MONTHLY',
        }),
        update: expect.objectContaining({ status: 'ACTIVE' }),
      })
    )
  })

  it('sets interval to ANNUAL when the annual price ID is used', async () => {
    await handleSubscriptionUpserted(makeSub('active', PRICE_ANNUAL))

    expect(mockSubscriptionUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ interval: 'ANNUAL' }),
      })
    )
  })

  it('grants membership enrollments for all member-only courses when ACTIVE', async () => {
    const memberCourses = [
      { id: 'course-m1' },
      { id: 'course-m2' },
    ]
    mockCourseFindMany.mockResolvedValue(memberCourses)

    await handleSubscriptionUpserted(makeSub('active'))

    expect(mockEnrollmentUpsert).toHaveBeenCalledTimes(memberCourses.length)
    expect(mockEnrollmentUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ accessType: 'MEMBERSHIP', userId: USER_ID }),
      })
    )
  })

  it('does not grant enrollments when status is CANCELED', async () => {
    await handleSubscriptionUpserted(makeSub('canceled'))

    expect(mockEnrollmentUpsert).not.toHaveBeenCalled()
  })

  it('maps past_due status correctly', async () => {
    await handleSubscriptionUpserted(makeSub('past_due'))

    expect(mockSubscriptionUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ status: 'PAST_DUE' }),
      })
    )
  })

  it('does nothing when no matching plan is found', async () => {
    mockMembershipPlanFindFirst.mockResolvedValue(null)

    await handleSubscriptionUpserted(makeSub('active'))

    expect(mockSubscriptionUpsert).not.toHaveBeenCalled()
  })

  it('does nothing when price ID is missing from subscription items', async () => {
    await handleSubscriptionUpserted(
      makeSub('active', PRICE_MONTHLY, { items: { data: [] } as unknown as Stripe.ApiList<Stripe.SubscriptionItem> })
    )

    expect(mockSubscriptionUpsert).not.toHaveBeenCalled()
  })

  it('sends activation email when isNew=true and status is ACTIVE', async () => {
    mockUserFindUnique.mockResolvedValue(MOCK_USER)

    await handleSubscriptionUpserted(makeSub('active'), true)

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to:      MOCK_USER.email,
        subject: 'Your ALMANAR membership is active',
      })
    )
  })

  it('does NOT send activation email when isNew=false', async () => {
    mockUserFindUnique.mockResolvedValue(MOCK_USER)

    await handleSubscriptionUpserted(makeSub('active'), false)

    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('does NOT send activation email when isNew=true but status is CANCELED', async () => {
    mockUserFindUnique.mockResolvedValue(MOCK_USER)

    await handleSubscriptionUpserted(makeSub('canceled'), true)

    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('sends Arabic activation email when user preferredLocale is ar', async () => {
    mockUserFindUnique.mockResolvedValue({ ...MOCK_USER, preferredLocale: 'ar' })

    await handleSubscriptionUpserted(makeSub('active'), true)

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'تم تفعيل اشتراكك في المنار',
      })
    )
  })
})

// ─── handleSubscriptionDeleted ────────────────────────────────────────────────

describe('handleSubscriptionDeleted', () => {
  function makeDeletedSub(): Stripe.Subscription {
    return {
      id:       SUB_ID,
      object:   'subscription',
      customer: CUSTOMER_ID,
      status:   'canceled',
      metadata: { almanarUserId: USER_ID },
      items:    { data: [] },
    } as unknown as Stripe.Subscription
  }

  it('marks subscription as CANCELED', async () => {
    await handleSubscriptionDeleted(makeDeletedSub())

    expect(mockSubscriptionUpdateMany).toHaveBeenCalledWith({
      where: { stripeSubscriptionId: SUB_ID },
      data:  { status: 'CANCELED', cancelAtPeriodEnd: false },
    })
  })

  it('removes membership enrollments for the user', async () => {
    await handleSubscriptionDeleted(makeDeletedSub())

    expect(mockEnrollmentDeleteMany).toHaveBeenCalledWith({
      where: { userId: USER_ID, accessType: 'MEMBERSHIP' },
    })
  })

  it('skips enrollment deletion when userId is missing from metadata', async () => {
    const sub = makeDeletedSub()
    sub.metadata = {}

    await handleSubscriptionDeleted(sub)

    expect(mockEnrollmentDeleteMany).not.toHaveBeenCalled()
    // But subscription update should still run
    expect(mockSubscriptionUpdateMany).toHaveBeenCalled()
  })

  it('sends cancellation email when user is found', async () => {
    mockUserFindUnique.mockResolvedValue(MOCK_USER)

    await handleSubscriptionDeleted(makeDeletedSub())

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to:      MOCK_USER.email,
        subject: 'Your ALMANAR membership has ended',
      })
    )
  })

  it('sends Arabic cancellation email when user preferredLocale is ar', async () => {
    mockUserFindUnique.mockResolvedValue({ ...MOCK_USER, preferredLocale: 'ar' })

    await handleSubscriptionDeleted(makeDeletedSub())

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'انتهى اشتراكك في المنار',
      })
    )
  })

  it('skips cancellation email when userId is absent', async () => {
    const sub = makeDeletedSub()
    sub.metadata = {}

    await handleSubscriptionDeleted(sub)

    expect(mockSendEmail).not.toHaveBeenCalled()
  })
})

// ─── handlePaymentFailed ──────────────────────────────────────────────────────

describe('handlePaymentFailed', () => {
  it('marks subscription as PAST_DUE when invoice has a subscription string', async () => {
    const invoice = {
      object:       'invoice',
      subscription: SUB_ID,
    } as unknown as Stripe.Invoice

    await handlePaymentFailed(invoice)

    expect(mockSubscriptionUpdateMany).toHaveBeenCalledWith({
      where: { stripeSubscriptionId: SUB_ID },
      data:  { status: 'PAST_DUE' },
    })
  })

  it('marks subscription as PAST_DUE when invoice has a subscription object', async () => {
    const invoice = {
      object:       'invoice',
      subscription: { id: SUB_ID, object: 'subscription' },
    } as unknown as Stripe.Invoice

    await handlePaymentFailed(invoice)

    expect(mockSubscriptionUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stripeSubscriptionId: SUB_ID },
        data:  { status: 'PAST_DUE' },
      })
    )
  })

  it('does nothing when invoice has no subscription', async () => {
    const invoice = {
      object:       'invoice',
      subscription: null,
    } as unknown as Stripe.Invoice

    await handlePaymentFailed(invoice)

    expect(mockSubscriptionUpdateMany).not.toHaveBeenCalled()
  })
})
