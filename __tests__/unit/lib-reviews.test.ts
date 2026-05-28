/**
 * Unit tests — src/lib/reviews.ts
 *
 * Covers: getUserReviews, deleteUserReview.
 * Prisma is mocked; no DB required.
 */

// ─── Mock: Prisma ─────────────────────────────────────────────────────────────

const mockReviewFindMany   = jest.fn()
const mockReviewDeleteMany = jest.fn()

jest.mock('@/lib/db', () => ({
  db: {
    review: {
      findMany:   (...a: unknown[]) => mockReviewFindMany(...a),
      deleteMany: (...a: unknown[]) => mockReviewDeleteMany(...a),
    },
  },
}))

// ─── Imports ──────────────────────────────────────────────────────────────────

import { getUserReviews, deleteUserReview } from '@/lib/reviews'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const COURSE_REVIEW = {
  id:        'rev-1',
  rating:    5,
  comment:   'Excellent course!',
  status:    'APPROVED',
  createdAt: new Date('2024-06-15T12:00:00Z'),
  course: {
    slug:      'arabic-101',
    titleEn:   'Arabic 101',
    titleAr:   'عربي 101',
    thumbnail: null,
  },
  product: null,
}

const PRODUCT_REVIEW = {
  id:        'rev-2',
  rating:    4,
  comment:   'Good ebook',
  status:    'PENDING',
  createdAt: new Date('2024-05-01T12:00:00Z'),
  course:    null,
  product: {
    slug:    'arabic-ebook',
    titleEn: 'Arabic Ebook',
    titleAr: 'كتاب عربي',
  },
}

beforeEach(() => {
  jest.clearAllMocks()
  mockReviewFindMany.mockResolvedValue([])
  mockReviewDeleteMany.mockResolvedValue({ count: 0 })
})

// ═══════════════════════════════════════════════════════════════════════════════
// getUserReviews
// ═══════════════════════════════════════════════════════════════════════════════

describe('getUserReviews', () => {
  it('queries reviews filtered by the given userId', async () => {
    await getUserReviews('user-1')
    expect(mockReviewFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' } }),
    )
  })

  it('orders results by createdAt descending (newest first)', async () => {
    await getUserReviews('user-1')
    expect(mockReviewFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
    )
  })

  it('returns the array of reviews from the DB', async () => {
    mockReviewFindMany.mockResolvedValue([COURSE_REVIEW, PRODUCT_REVIEW])
    const result = await getUserReviews('user-1')
    expect(result).toHaveLength(2)
    expect(result[0]).toBe(COURSE_REVIEW)
    expect(result[1]).toBe(PRODUCT_REVIEW)
  })

  it('returns an empty array when the user has no reviews', async () => {
    mockReviewFindMany.mockResolvedValue([])
    expect(await getUserReviews('user-no-reviews')).toEqual([])
  })

  it('selects the course relation', async () => {
    await getUserReviews('user-1')
    expect(mockReviewFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          course: expect.anything(),
        }),
      }),
    )
  })

  it('selects the product relation', async () => {
    await getUserReviews('user-1')
    expect(mockReviewFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          product: expect.anything(),
        }),
      }),
    )
  })

  it('selects rating, comment, and status fields', async () => {
    await getUserReviews('user-1')
    expect(mockReviewFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          rating:  true,
          comment: true,
          status:  true,
        }),
      }),
    )
  })

  it('calls findMany exactly once per invocation', async () => {
    await getUserReviews('user-1')
    expect(mockReviewFindMany).toHaveBeenCalledTimes(1)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// deleteUserReview
// ═══════════════════════════════════════════════════════════════════════════════

describe('deleteUserReview', () => {
  it('calls deleteMany with the reviewId and userId', async () => {
    mockReviewDeleteMany.mockResolvedValue({ count: 1 })
    await deleteUserReview('rev-1', 'user-1')
    expect(mockReviewDeleteMany).toHaveBeenCalledWith({
      where: { id: 'rev-1', userId: 'user-1' },
    })
  })

  it('scopes deletion by userId — prevents deleting another user\'s review', async () => {
    await deleteUserReview('rev-other', 'user-2')
    expect(mockReviewDeleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-2' }),
      }),
    )
  })

  it('returns the deleteMany result ({ count })', async () => {
    mockReviewDeleteMany.mockResolvedValue({ count: 1 })
    const result = await deleteUserReview('rev-1', 'user-1')
    expect(result).toEqual({ count: 1 })
  })

  it('returns { count: 0 } when the review does not exist', async () => {
    mockReviewDeleteMany.mockResolvedValue({ count: 0 })
    const result = await deleteUserReview('nonexistent', 'user-1')
    expect(result).toEqual({ count: 0 })
  })

  it('returns { count: 0 } when the review belongs to a different user', async () => {
    // Prisma WHERE includes userId, so a mis-matched userId yields count: 0
    mockReviewDeleteMany.mockResolvedValue({ count: 0 })
    const result = await deleteUserReview('rev-1', 'wrong-user')
    expect(result).toEqual({ count: 0 })
  })

  it('calls deleteMany exactly once per invocation', async () => {
    await deleteUserReview('rev-1', 'user-1')
    expect(mockReviewDeleteMany).toHaveBeenCalledTimes(1)
  })
})
