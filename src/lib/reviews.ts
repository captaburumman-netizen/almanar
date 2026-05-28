/**
 * Reviews library
 *
 * getUserReviews   — fetch all reviews a user has submitted (any status)
 * deleteUserReview — user removes their own review (any status)
 */
import { db } from '@/lib/db'

export async function getUserReviews(userId: string) {
  return db.review.findMany({
    where:   { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id:        true,
      rating:    true,
      comment:   true,
      status:    true,
      createdAt: true,
      course: {
        select: { slug: true, titleEn: true, titleAr: true, thumbnail: true },
      },
      product: {
        select: { slug: true, titleEn: true, titleAr: true },
      },
    },
  })
}

export async function deleteUserReview(reviewId: string, userId: string) {
  return db.review.deleteMany({ where: { id: reviewId, userId } })
}
