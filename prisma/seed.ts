/**
 * prisma/seed.ts
 *
 * Seeds the database with:
 *  - One ADMIN user (admin@almanar.com / admin123456)
 *  - One MembershipPlan (placeholder Stripe price IDs)
 *  - Two demo Courses (one free, one member-only)
 *  - Sample Lessons for the free course
 *
 * Run: pnpm db:seed
 */
import { PrismaClient, Level } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function main() {
  console.log('🌱 Seeding ALMANAR database...')

  // ── Admin user ───────────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('admin123456', 12)

  const admin = await db.user.upsert({
    where: { email: 'admin@almanar.com' },
    update: {},
    create: {
      email:    'admin@almanar.com',
      name:     'ALMANAR Admin',
      role:     'ADMIN',
      password: adminPassword,
      preferredLocale: 'ar',
    },
  })

  console.log(`✓ Admin user: ${admin.email}`)

  // ── Demo student ──────────────────────────────────────────────────────────────
  const studentPassword = await bcrypt.hash('student123456', 12)

  const student = await db.user.upsert({
    where: { email: 'student@almanar.com' },
    update: {},
    create: {
      email:    'student@almanar.com',
      name:     'Demo Student',
      role:     'STUDENT',
      password: studentPassword,
      preferredLocale: 'ar',
    },
  })

  console.log(`✓ Demo student: ${student.email}`)

  // ── Membership plan ───────────────────────────────────────────────────────────
  const plan = await db.membershipPlan.upsert({
    where: { stripePriceIdMonthly: 'price_monthly_placeholder' },
    update: {},
    create: {
      nameEn:        'ALMANAR Member',
      nameAr:        'عضو المنار',
      descriptionEn: 'Full access to all member-only courses and content',
      descriptionAr: 'وصول كامل لجميع الدورات والمحتوى الحصري للأعضاء',
      featuresEn: [
        'Access to all member-only courses',
        'Early access to new content',
        'Exclusive digital resources',
        'Monthly live Q&A archive',
      ],
      featuresAr: [
        'الوصول لجميع الدورات الحصرية',
        'الوصول المبكر للمحتوى الجديد',
        'موارد رقمية حصرية',
        'أرشيف جلسات الأسئلة الشهرية',
      ],
      monthlyPrice: 29.00,
      annualPrice:  249.00,
      stripePriceIdMonthly: 'price_monthly_placeholder',
      stripePriceIdAnnual:  'price_annual_placeholder',
    },
  })

  console.log(`✓ Membership plan: ${plan.nameEn}`)

  // ── Free course ───────────────────────────────────────────────────────────────
  const freeCourse = await db.course.upsert({
    where: { slug: 'getting-started-montessori' },
    update: {},
    create: {
      slug:         'getting-started-montessori',
      titleEn:      'Getting Started with Montessori at Home',
      titleAr:      'البدء مع منهج منتسوري في المنزل',
      descriptionEn: 'A beginner-friendly introduction to the Montessori method for parents who want to create a nurturing home environment.',
      descriptionAr: 'مقدمة ودية للمبتدئين في منهج منتسوري للآباء الراغبين في تهيئة بيئة منزلية داعمة.',
      shortDescEn:  'Begin your Montessori journey with practical, home-based strategies.',
      shortDescAr:  'ابدأ رحلتك مع منتسوري بأساليب عملية يمكن تطبيقها في المنزل.',
      price:        0.00,
      isMemberOnly: false,
      isPublished:  true,
      level:        Level.BEGINNER,
      categoryEn:   'Montessori',
      categoryAr:   'منتسوري',
    },
  })

  // Lessons for the free course
  const lessonData = [
    {
      slug:         'what-is-montessori',
      titleEn:      'What is Montessori?',
      titleAr:      'ما هو منتسوري؟',
      descriptionEn: 'An overview of the Montessori philosophy and its core principles.',
      descriptionAr: 'نظرة عامة على فلسفة منتسوري ومبادئها الأساسية.',
      position:     1,
      isPreview:    true,  // free preview
      isPublished:  true,
      duration:     780,   // 13 minutes
    },
    {
      slug:         'prepared-environment',
      titleEn:      'The Prepared Environment',
      titleAr:      'البيئة المُعدَّة',
      descriptionEn: 'How to set up your home space to support independent learning.',
      descriptionAr: 'كيفية تهيئة مساحة منزلك لدعم التعلم المستقل.',
      position:     2,
      isPreview:    false,
      isPublished:  true,
      duration:     960,
    },
    {
      slug:         'following-the-child',
      titleEn:      'Following the Child',
      titleAr:      'اتّباع قيادة الطفل',
      descriptionEn: 'Learn to observe and respond to your child\'s natural curiosity.',
      descriptionAr: 'تعلّم مراقبة فضول طفلك الطبيعي والاستجابة له.',
      position:     3,
      isPreview:    false,
      isPublished:  true,
      duration:     840,
    },
  ]

  for (const lesson of lessonData) {
    await db.lesson.upsert({
      where: { courseId_slug: { courseId: freeCourse.id, slug: lesson.slug } },
      update: {},
      create: { courseId: freeCourse.id, ...lesson },
    })
  }

  // Update total duration
  const totalDuration = lessonData.reduce((sum, l) => sum + (l.duration ?? 0), 0)
  await db.course.update({
    where: { id: freeCourse.id },
    data: { totalDuration },
  })

  console.log(`✓ Free course: "${freeCourse.titleEn}" with ${lessonData.length} lessons`)

  // ── Member-only course ────────────────────────────────────────────────────────
  const memberCourse = await db.course.upsert({
    where: { slug: 'positive-discipline-deep-dive' },
    update: {},
    create: {
      slug:         'positive-discipline-deep-dive',
      titleEn:      'Positive Discipline: A Deep Dive',
      titleAr:      'الانضباط الإيجابي: دراسة معمّقة',
      descriptionEn: 'Master the principles of positive discipline to raise cooperative, respectful children without punishment or reward systems.',
      descriptionAr: 'أتقن مبادئ الانضباط الإيجابي لتربية أطفال متعاونين ومحترمين دون اللجوء للعقوبة أو أنظمة المكافآت.',
      shortDescEn:  'Evidence-based strategies for respectful, effective parenting.',
      shortDescAr:  'استراتيجيات قائمة على الأدلة للتربية الفعّالة والمحترمة.',
      price:        49.00,
      isMemberOnly: true,
      isPublished:  true,
      level:        Level.INTERMEDIATE,
      categoryEn:   'Discipline',
      categoryAr:   'الانضباط',
    },
  })

  console.log(`✓ Member course: "${memberCourse.titleEn}"`)

  // ── Demo product ──────────────────────────────────────────────────────────────
  await db.product.upsert({
    where: { slug: 'montessori-activity-bundle-ages-2-4' },
    update: {},
    create: {
      slug:         'montessori-activity-bundle-ages-2-4',
      titleEn:      'Montessori Activity Bundle: Ages 2–4',
      titleAr:      'حزمة أنشطة منتسوري: سن 2-4 سنوات',
      descriptionEn: '30 printable Montessori activity cards designed for toddlers. Print, laminate, and use at home.',
      descriptionAr: '30 بطاقة نشاط منتسوري قابلة للطباعة مصممة للأطفال الصغار. اطبعها ولمّنها واستخدمها في المنزل.',
      price:        0.00,
      isFree:       true,
      category:     'MONTESSORI_MATERIAL',
      language:     'BILINGUAL',
      isPublished:  true,
      sortOrder:    1,
    },
  })

  console.log('✓ Demo digital product created')

  console.log('\n✅ Seed complete!')
  console.log('   Admin:   admin@almanar.com  / admin123456')
  console.log('   Student: student@almanar.com / student123456')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
