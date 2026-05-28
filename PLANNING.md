# ALMANAR — Platform Planning Document

> **Tagline:** المنار — The Lighthouse. A premium, bilingual (Arabic + English) parenting education platform.
>
> This document is the single source of truth before any code is written.
> It must be approved before Module 1 begins.

---

## Table of Contents

1. [MVP Scope](#1-mvp-scope)
2. [Prisma Data Model](#2-prisma-data-model)
3. [Page Map](#3-page-map)
4. [API Routes](#4-api-routes)
5. [Build Sequence](#5-build-sequence)
6. [Design System](#6-design-system)
7. [i18n Architecture](#7-i18n-architecture)
8. [Infrastructure Notes](#8-infrastructure-notes)

---

## 1. MVP Scope

### ✅ In Scope

| Area | Deliverables |
|------|-------------|
| **Marketing** | Homepage, course catalog, course detail, pricing/membership page, store homepage |
| **Auth** | Email/password sign-up & sign-in, forgot password + reset (NextAuth.js + Credentials adapter) |
| **Course purchases** | Stripe one-time checkout per course; auto-enrollment on `checkout.session.completed` |
| **Membership** | Single tier — monthly & annual Stripe subscriptions; cancel via Stripe Billing Portal |
| **Content gating** | Lessons gated by: active enrollment OR active membership (for member-only courses) |
| **Lesson player** | Signed S3 video URL (15-min TTL), progress marking per lesson |
| **Digital store** | Browse by category, single-product + bundle Stripe checkout (one-time) |
| **Secure downloads** | 48-hour signed S3 URL, max 5 regenerations per purchase, sent via Resend + re-accessible from dashboard |
| **Free product claim** | Requires auth; auto-adds to mailing list (Resend contact); appears in dashboard like paid purchase |
| **Student dashboard** | My courses, downloads (paid + claimed), membership status, re-download trigger |
| **Email** | Welcome (signup), enrollment confirmation, purchase receipt + download link, password reset |
| **Admin — content** | Course CRUD, lesson CRUD + drag-reorder, S3 video/file upload, digital product CRUD |
| **Admin — store** | Product upload, pricing, category, publish/unpublish, bundle management |
| **Admin — users** | User list with search, role management, manual enrollment grant |
| **Admin analytics** | Total enrollments, revenue to date, active members, per-product sales + download counts, student list |
| **i18n** | Full English + Arabic, locale routing `/en/` and `/ar/`, RTL layout baked into Tailwind |

### ❌ Explicitly Out of Scope

- Live video / webinars
- Community forums or comments
- Affiliate / referral program
- Mobile native app
- Third-party analytics (Mixpanel, GA, Segment)
- Payment plans / installments
- Multiple membership tiers
- Physical product fulfillment / inventory / shipping
- Coupon / promo codes
- Course certificates
- Multi-instructor
- Quizzes / assessments
- Drip course scheduling
- Course ratings / reviews
- Waitlists

---

## 2. Prisma Data Model

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ────────────────────────────────────────────────────────────────────

enum Role {
  STUDENT
  ADMIN
}

enum Level {
  BEGINNER
  INTERMEDIATE
  ADVANCED
}

enum SubscriptionStatus {
  ACTIVE
  CANCELED
  PAST_DUE
  TRIALING
  UNPAID
  INCOMPLETE
}

enum BillingInterval {
  MONTHLY
  ANNUAL
}

enum PurchaseStatus {
  PENDING
  COMPLETED
  REFUNDED
  FAILED
}

enum AccessType {
  PURCHASE    // paid à la carte for the course
  MEMBERSHIP  // granted via active member subscription
  FREE        // zero-price course, auto-enrolled on claim
  ADMIN       // admin override grant
}

enum ProductCategory {
  EBOOK
  PRINTABLE
  MONTESSORI_MATERIAL
  TOY_AFFILIATE        // no file; only affiliate link, no download flow
}

enum ProductLanguage {
  EN
  AR
  BILINGUAL
}

// ─── Auth (NextAuth PrismaAdapter tables) ─────────────────────────────────────

model User {
  id               String    @id @default(cuid())
  name             String?
  email            String    @unique
  emailVerified    DateTime?
  image            String?
  password         String?            // bcrypt; null for OAuth users
  role             Role               @default(STUDENT)
  stripeCustomerId String?            @unique
  preferredLocale  String             @default("ar") // "en" | "ar"
  mailingListAdded Boolean            @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  accounts         Account[]
  sessions         Session[]
  enrollments      Enrollment[]
  subscription     Subscription?
  coursePurchases  CoursePurchase[]
  productPurchases ProductPurchase[]
  downloads        Download[]
  passwordResets   PasswordResetToken[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model PasswordResetToken {
  id        String   @id @default(cuid())
  email     String
  token     String   @unique
  expires   DateTime
  used      Boolean  @default(false)
  userId    String

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
}

// ─── Courses ──────────────────────────────────────────────────────────────────

model Course {
  id               String  @id @default(cuid())
  slug             String  @unique
  // Bilingual fields
  titleEn          String
  titleAr          String
  descriptionEn    String  @db.Text
  descriptionAr    String  @db.Text
  shortDescEn      String
  shortDescAr      String
  // Media
  thumbnail        String?
  previewVideoUrl  String?
  // Commerce
  price            Decimal @db.Decimal(10, 2) // 0.00 = free
  isMemberOnly     Boolean @default(false)    // member-tier access
  // Metadata
  isPublished      Boolean @default(false)
  categoryEn       String?
  categoryAr       String?
  level            Level   @default(BEGINNER)
  totalDuration    Int?    // computed seconds

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  lessons     Lesson[]
  enrollments Enrollment[]
  purchases   CoursePurchase[]
}

model Lesson {
  id          String  @id @default(cuid())
  courseId    String
  slug        String
  // Bilingual
  titleEn     String
  titleAr     String
  descriptionEn String? @db.Text
  descriptionAr String? @db.Text
  // Video
  videoUrl    String? // CloudFront/signed URL base — NEVER raw S3
  s3Key       String? // raw S3 object key (admin use only)
  duration    Int?    // seconds
  // Config
  position    Int
  isPreview   Boolean @default(false)
  isPublished Boolean @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  course   Course           @relation(fields: [courseId], references: [id], onDelete: Cascade)
  progress LessonProgress[]

  @@unique([courseId, slug])
  @@index([courseId, position])
}

model LessonProgress {
  id          String   @id @default(cuid())
  userId      String
  lessonId    String
  completedAt DateTime @default(now())

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  lesson Lesson @relation(fields: [lessonId], references: [id], onDelete: Cascade)

  @@unique([userId, lessonId])
}

// ─── Membership ───────────────────────────────────────────────────────────────

model MembershipPlan {
  id                   String  @id @default(cuid())
  // Bilingual
  nameEn               String
  nameAr               String
  descriptionEn        String?
  descriptionAr        String?
  featuresEn           String[]
  featuresAr           String[]
  // Pricing
  monthlyPrice         Decimal @db.Decimal(10, 2)
  annualPrice          Decimal @db.Decimal(10, 2)
  // Stripe price IDs (created in Stripe dashboard)
  stripePriceIdMonthly String  @unique
  stripePriceIdAnnual  String  @unique
  isActive             Boolean @default(true)

  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  subscriptions Subscription[]
}

model Subscription {
  id                   String             @id @default(cuid())
  userId               String             @unique
  planId               String
  stripeSubscriptionId String             @unique
  stripeCustomerId     String
  status               SubscriptionStatus
  interval             BillingInterval
  currentPeriodStart   DateTime
  currentPeriodEnd     DateTime
  cancelAtPeriodEnd    Boolean            @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  plan MembershipPlan @relation(fields: [planId], references: [id])
}

// ─── Course Purchases & Enrollments ───────────────────────────────────────────

model CoursePurchase {
  id                    String        @id @default(cuid())
  userId                String
  courseId              String
  stripeSessionId       String?       @unique
  stripePaymentIntentId String?       @unique
  amount                Decimal       @db.Decimal(10, 2)
  currency              String        @default("usd")
  status                PurchaseStatus @default(PENDING)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user       User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  course     Course      @relation(fields: [courseId], references: [id])
  enrollment Enrollment?
}

model Enrollment {
  id         String     @id @default(cuid())
  userId     String
  courseId   String
  purchaseId String?    @unique // null for membership/free/admin
  accessType AccessType @default(PURCHASE)
  completedAt DateTime?

  createdAt DateTime @default(now())

  user     User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  course   Course          @relation(fields: [courseId], references: [id])
  purchase CoursePurchase? @relation(fields: [purchaseId], references: [id])

  @@unique([userId, courseId])
}

// ─── Digital Product Store ────────────────────────────────────────────────────

model Product {
  id           String          @id @default(cuid())
  slug         String          @unique
  // Bilingual
  titleEn      String
  titleAr      String
  descriptionEn String         @db.Text
  descriptionAr String         @db.Text
  // Commerce
  price        Decimal         @db.Decimal(10, 2) // 0.00 = free
  category     ProductCategory
  language     ProductLanguage @default(BILINGUAL)
  isFree       Boolean         @default(false)   // computed: price == 0
  // Media / delivery
  coverImage   String?
  s3Key        String?         // file key; null for TOY_AFFILIATE
  affiliateUrl String?         // TOY_AFFILIATE only
  // Config
  isPublished  Boolean         @default(false)
  sortOrder    Int             @default(0)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  purchases ProductPurchase[]
  bundleItems BundleItem[]
}

model Bundle {
  id           String  @id @default(cuid())
  slug         String  @unique
  titleEn      String
  titleAr      String
  descriptionEn String  @db.Text
  descriptionAr String  @db.Text
  price        Decimal  @db.Decimal(10, 2)
  coverImage   String?
  isPublished  Boolean  @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  items     BundleItem[]
  purchases ProductPurchase[]
}

model BundleItem {
  id        String @id @default(cuid())
  bundleId  String
  productId String

  bundle  Bundle  @relation(fields: [bundleId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([bundleId, productId])
}

// ─── Product Purchases & Downloads ────────────────────────────────────────────

// Covers: single product, bundle, free claim
model ProductPurchase {
  id                    String        @id @default(cuid())
  userId                String
  // Exactly one of productId / bundleId is set
  productId             String?
  bundleId              String?
  stripeSessionId       String?       @unique // null for free claims
  stripePaymentIntentId String?       @unique
  amount                Decimal       @db.Decimal(10, 2)
  currency              String        @default("usd")
  status                PurchaseStatus @default(PENDING)
  isFree                Boolean       @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  product   Product?  @relation(fields: [productId], references: [id])
  bundle    Bundle?   @relation(fields: [bundleId], references: [id])
  downloads Download[]
}

// One Download row = one secure link for one (user, product) pair.
// Bundle purchases create one Download row per product inside the bundle.
model Download {
  id             String   @id @default(cuid())
  userId         String
  purchaseId     String
  productId      String   // always a single Product (even inside a bundle)
  token          String   @unique @default(cuid()) // used in the URL
  expiresAt      DateTime
  downloadCount  Int      @default(0)
  maxDownloads   Int      @default(5)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user     User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  purchase ProductPurchase @relation(fields: [purchaseId], references: [id], onDelete: Cascade)
}
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Separate `CoursePurchase` and `ProductPurchase` tables | Different commerce flows, different relations; easier admin analytics query |
| `Download` is per-product, not per-purchase | Bundles contain multiple products; each needs its own download link |
| `videoUrl` stores base key, signed URL generated at request time | Never expose raw S3 URLs to the client |
| Bilingual fields on the model (`titleEn`/`titleAr`) | Simpler than a translation table for MVP; avoids N+1 joins |
| `TOY_AFFILIATE` products have no `s3Key` | No delivery flow; just an outbound link — but still tracked as a Product for catalog consistency |
| `isFree` computed field + `mailingListAdded` on User | Single-pass claim logic: enroll → add to Resend contact list → grant download |

---

## 3. Page Map

All routes live under `[locale]` prefix. API routes are outside the locale segment.

```
Route (locale-prefixed)                        Access        Description
────────────────────────────────────────────────────────────────────────────────────
# ── Public ──────────────────────────────────────────────────────────────────────
/[locale]                                       Public        Homepage
/[locale]/courses                               Public        Course catalog
/[locale]/courses/[slug]                        Public        Course detail + buy CTA
/[locale]/pricing                               Public        Membership plans & pricing
/[locale]/store                                 Public        Digital product store home
/[locale]/store/[slug]                          Public        Product detail + buy/claim

# ── Auth (unauthenticated only, redirects if logged in) ──────────────────────
/[locale]/auth/signin                           Unauthed      Sign in
/[locale]/auth/signup                           Unauthed      Register
/[locale]/auth/forgot-password                  Unauthed      Request reset link
/[locale]/auth/reset-password                   Unauthed      Set new password (token)

# ── Student (authenticated) ──────────────────────────────────────────────────
/[locale]/dashboard                             Authed        My courses + downloads hub
/[locale]/dashboard/downloads                   Authed        All purchased/claimed files
/[locale]/account                               Authed        Profile + membership manage
/[locale]/courses/[slug]/learn                  Enrolled∨Mem  Redirect → first lesson
/[locale]/courses/[slug]/learn/[lessonSlug]     Enrolled∨Mem  Lesson player

# ── Admin (role = ADMIN) ──────────────────────────────────────────────────────
/[locale]/admin                                 Admin         Overview dashboard
/[locale]/admin/courses                         Admin         Course list
/[locale]/admin/courses/new                     Admin         Create course
/[locale]/admin/courses/[id]                    Admin         Edit course metadata
/[locale]/admin/courses/[id]/lessons            Admin         Lesson CRUD + reorder + upload
/[locale]/admin/products                        Admin         Digital product list
/[locale]/admin/products/new                    Admin         Create product
/[locale]/admin/products/[id]                   Admin         Edit product + upload file
/[locale]/admin/bundles                         Admin         Bundle management
/[locale]/admin/users                           Admin         User list + search
/[locale]/admin/analytics                       Admin         Full analytics view

# ── API (no locale prefix) ───────────────────────────────────────────────────
/api/auth/[...nextauth]                         —             NextAuth handler
/api/auth/register                              Public        Create account
/api/auth/forgot-password                       Public        Send reset email
/api/auth/reset-password                        Public        Confirm + set new password
/api/courses                                    Public∨Admin  List / create courses
/api/courses/[slug]                             Public∨Admin  Read / update / delete
/api/courses/[courseId]/lessons                 Enr∨Admin     List / create lessons
/api/lessons/[id]                               Enr∨Admin     Update / delete lesson
/api/lessons/[id]/reorder                       Admin         Bulk position update
/api/lessons/[id]/progress                      Enrolled      Mark complete
/api/enrollments                                Authed∨Admin  List / grant enrollment
/api/stripe/checkout                            Authed        Course purchase session
/api/stripe/subscribe                           Authed        Membership checkout
/api/stripe/portal                              Authed        Billing portal redirect
/api/stripe/webhook                             Stripe sig    Handle Stripe events
/api/products                                   Public∨Admin  List / create products
/api/products/[slug]                            Public∨Admin  Read / update / delete
/api/products/claim                             Authed        Claim a free product
/api/bundles                                    Public∨Admin  List / create bundles
/api/store/checkout                             Authed        Product/bundle purchase
/api/downloads/[token]                          Public+token  Stream signed S3 URL
/api/downloads/regenerate                       Authed        Issue new download token
/api/upload/presigned                           Admin         Generate S3 presigned PUT URL
/api/admin/users                                Admin         Paginated users + search
/api/admin/analytics                            Admin         Aggregated metrics
/api/admin/revenue                              Admin         Revenue breakdown
```

---

## 4. API Routes — Full Specification

### Authentication

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `ANY` | `/api/auth/[...nextauth]` | — | NextAuth.js handler (signin, session, etc.) |
| `POST` | `/api/auth/register` | None | Create user → hash password → send welcome email |
| `POST` | `/api/auth/forgot-password` | None | Validate email → generate token → send reset email |
| `POST` | `/api/auth/reset-password` | None | Validate token (expiry + used flag) → update password |

### Courses

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/courses` | None | Published courses (filter: category, level, isMemberOnly) |
| `POST` | `/api/courses` | ADMIN | Create course |
| `GET` | `/api/courses/[slug]` | None | Course + lesson preview list (preview lessons only for guests) |
| `PUT` | `/api/courses/[id]` | ADMIN | Update course metadata |
| `DELETE` | `/api/courses/[id]` | ADMIN | Unpublish + soft-archive course |
| `GET` | `/api/courses/[courseId]/lessons` | Enrolled∨Mem | Full lesson list including video URLs (signed) |
| `POST` | `/api/courses/[courseId]/lessons` | ADMIN | Create lesson |
| `PUT` | `/api/lessons/[id]` | ADMIN | Update lesson (title, video, position, etc.) |
| `DELETE` | `/api/lessons/[id]` | ADMIN | Delete lesson + remove S3 object |
| `PATCH` | `/api/lessons/[id]/reorder` | ADMIN | Bulk position swap (drag-and-drop result) |
| `POST` | `/api/lessons/[id]/progress` | Enrolled∨Mem | Mark lesson complete / incomplete |

### Stripe & Payments

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/stripe/checkout` | Authed | Create Stripe Checkout session for course purchase |
| `POST` | `/api/stripe/subscribe` | Authed | Create Stripe Checkout session for membership (monthly/annual) |
| `POST` | `/api/stripe/portal` | Authed | Create Stripe Billing Portal session (manage/cancel) |
| `POST` | `/api/stripe/webhook` | Stripe-sig | Handle: `checkout.session.completed`, `subscription.*`, `invoice.*` |
| `POST` | `/api/store/checkout` | Authed | Create Stripe Checkout for product or bundle |

**Webhook events handled:**

| Event | Action |
|-------|--------|
| `checkout.session.completed` (mode=payment, type=course) | Create `CoursePurchase` (COMPLETED) + `Enrollment` + send confirmation email |
| `checkout.session.completed` (mode=payment, type=product) | Create `ProductPurchase` (COMPLETED) + `Download` rows + send receipt + download link email |
| `checkout.session.completed` (mode=subscription) | Upsert `Subscription` (ACTIVE) |
| `customer.subscription.updated` | Sync status, `cancelAtPeriodEnd`, `currentPeriodEnd` |
| `customer.subscription.deleted` | Set status → CANCELED |
| `invoice.payment_failed` | Set subscription status → PAST_DUE |

### Enrollments

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/enrollments` | Authed | My enrolled courses with progress |
| `POST` | `/api/enrollments` | ADMIN | Manually grant enrollment (bypass payment) |

### Digital Store & Downloads

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/products` | None | Published products (filter: category, language, price) |
| `POST` | `/api/products` | ADMIN | Create product |
| `GET` | `/api/products/[slug]` | None | Product detail |
| `PUT` | `/api/products/[id]` | ADMIN | Update product (price, file, metadata) |
| `DELETE` | `/api/products/[id]` | ADMIN | Unpublish product |
| `POST` | `/api/products/claim` | Authed | Claim free product → create `ProductPurchase` + `Download` + add to mailing list |
| `GET` | `/api/bundles` | None | Published bundles with items |
| `POST` | `/api/bundles` | ADMIN | Create bundle |
| `GET` | `/api/downloads/[token]` | None (token-gated) | Validate token, check expiry + count → redirect to signed S3 URL |
| `POST` | `/api/downloads/regenerate` | Authed | Validate ownership + count < 5 → create new `Download` row with fresh token + expiry |

### Admin Analytics

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/admin/users` | ADMIN | Paginated users, search by name/email, filter by role |
| `GET` | `/api/admin/analytics` | ADMIN | Totals: enrollments, revenue, active members |
| `GET` | `/api/admin/revenue` | ADMIN | Revenue breakdown by course + by product |
| `GET` | `/api/admin/products/stats` | ADMIN | Per-product: sales count, download count, revenue |

### Upload

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/upload/presigned` | ADMIN | Return signed S3 PUT URL + final object key |

---

## 5. Build Sequence

Modules are built strictly in order. Each module is self-contained and deployable.

```
╔══════════════════════════════════════════════════════════════════╗
║  MODULE 1 — Project Scaffold                                     ║
╟──────────────────────────────────────────────────────────────────╢
║  • pnpm + Next.js 14 App Router + TypeScript strict              ║
║  • Tailwind CSS v3 with RTL variant + ALMANAR design tokens      ║
║  • shadcn/ui init (New York style, CSS variables)                ║
║  • next-intl: locale routing middleware, [locale] segment,       ║
║    en.json + ar.json translation files, RTL dir switching        ║
║  • Prisma schema (full) + .env.example                           ║
║  • AWS S3 client (presigned URL helper)                          ║
║  • Resend email client stub                                      ║
║  • Stripe client stub                                            ║
║  • ESLint + Prettier + TypeScript strict config                  ║
║  • Absolute imports (@/...) + path aliases                       ║
║  • Global fonts: DM Sans (EN) + IBM Plex Arabic (AR)            ║
╚══════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════╗
║  MODULE 2 — Database & Authentication                            ║
╟──────────────────────────────────────────────────────────────────╢
║  • Prisma migrate + PrismaAdapter                                ║
║  • NextAuth.js config (Credentials + PrismaAdapter)              ║
║  • register API route (bcrypt, send welcome email)               ║
║  • forgot-password + reset-password API + email flow             ║
║  • middleware.ts: protect /dashboard, /admin, /courses/.../learn ║
║  • Auth pages: signin, signup, forgot-password, reset-password   ║
║    (bilingual, RTL-aware, ALMANAR design)                        ║
║  • Prisma seed: admin user + demo course + membership plan       ║
║  TESTS: register, login, password reset flow                     ║
╚══════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════╗
║  MODULE 3 — Shared Layout + Public Marketing Pages               ║
╟──────────────────────────────────────────────────────────────────╢
║  • Locale-aware Navbar (language switcher, auth state, RTL)      ║
║  • Footer (bilingual)                                            ║
║  • Homepage: hero, features, course teaser, store teaser, CTA    ║
║  • Course catalog: grid, filter bar, category pills              ║
║  • Course detail: description, lesson list preview, buy CTA      ║
║  • Pricing page: membership cards (monthly/annual toggle)        ║
║  • Store homepage: product grid + category filter                ║
║  • Product detail page: cover, description, buy/claim CTA        ║
╚══════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════╗
║  MODULE 4 — Stripe: Course Purchase + Membership                 ║
╟──────────────────────────────────────────────────────────────────╢
║  • /api/stripe/checkout — course one-time payment                ║
║  • /api/stripe/subscribe — membership monthly/annual             ║
║  • /api/stripe/portal — billing portal                           ║
║  • /api/stripe/webhook — all events (see spec above)             ║
║  • Success + cancel redirect pages                               ║
║  TESTS: webhook handler (mocked Stripe events)                   ║
╚══════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════╗
║  MODULE 5 — Protected Lesson Player                              ║
╟──────────────────────────────────────────────────────────────────╢
║  • Enrollment gate: check enrollment OR active membership        ║
║  • Course player layout (sidebar lesson list + video area)       ║
║  • Lesson page: signed S3 video URL (15-min TTL)                 ║
║  • Progress marking (POST /api/lessons/[id]/progress)            ║
║  • Lesson sidebar: RTL-aware, bilingual titles                   ║
║  TESTS: enrollment gating (enrolled / member / neither)          ║
╚══════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════╗
║  MODULE 6 — Digital Product Store + Secure Downloads             ║
╟──────────────────────────────────────────────────────────────────╢
║  • /api/store/checkout — product + bundle Stripe sessions        ║
║  • /api/products/claim — free product claim flow                 ║
║  • /api/downloads/[token] — validate + redirect to signed URL    ║
║  • /api/downloads/regenerate — new token (count < 5 check)       ║
║  • TOY_AFFILIATE: outbound link (no download), tracked in DB     ║
║  TESTS: free claim flow, download token expiry, max-downloads    ║
╚══════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════╗
║  MODULE 7 — Student Dashboard & Account                          ║
╟──────────────────────────────────────────────────────────────────╢
║  • /dashboard: my courses (progress bars), download shortcuts    ║
║  • /dashboard/downloads: all purchases; re-download trigger      ║
║  • /account: profile edit, membership status, cancel link        ║
║  • Membership cancel → Stripe Billing Portal redirect            ║
╚══════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════╗
║  MODULE 8 — Email Automation (Resend + React Email)              ║
╟──────────────────────────────────────────────────────────────────╢
║  • React Email templates (bilingual: locale-aware subject+body)  ║
║    - Welcome (signup)                                            ║
║    - Enrollment confirmation                                     ║
║    - Course purchase receipt                                     ║
║    - Product purchase receipt + download link                    ║
║    - Free product claim confirmation                             ║
║    - Password reset                                              ║
║  • Resend contact-list upsert on free product claim              ║
╚══════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════╗
║  MODULE 9 — Admin: Content & Store Management                    ║
╟──────────────────────────────────────────────────────────────────╢
║  • Admin layout (bilingual sidebar, RTL-safe)                    ║
║  • Course CRUD: bilingual fields, publish toggle                 ║
║  • Lesson CRUD: drag-to-reorder, S3 video upload (presigned)     ║
║  • Product CRUD: file upload, affiliate URL, category, language  ║
║  • Bundle management: multi-product builder, pricing             ║
╚══════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════╗
║  MODULE 10 — Admin: Users & Analytics                            ║
╟──────────────────────────────────────────────────────────────────╢
║  • User list: search, role, enrollment count, subscription badge ║
║  • Manual enrollment grant                                       ║
║  • Analytics page (server-rendered):                             ║
║    - Total enrollments (all-time + last 30 days)                 ║
║    - Total revenue (courses + products, breakdown)               ║
║    - Active members count                                        ║
║    - Per-product: sales count, download count, revenue           ║
║    - Student list (paginated)                                    ║
╚══════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════╗
║  MODULE 11 — Tests                                               ║
╟──────────────────────────────────────────────────────────────────╢
║  • Jest + React Testing Library setup                            ║
║  • Auth: register, login, password reset                         ║
║  • Enrollment gating (3 paths: enrolled, member, blocked)        ║
║  • Stripe webhook handler (mocked events)                        ║
║  • Download: token validation, expiry, max-download enforcement  ║
║  • Free product claim flow end-to-end                            ║
║  • Locale switching: dir attribute, translation presence         ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## 6. Design System

### Brand Identity

**ALMANAR** = *المنار* = The Lighthouse. Design language: **Luxury Montessori**.
Warm, calm, intentional — premium editorial feel, not generic SaaS.

### Color Palette

```
Token               Hex         Usage
────────────────────────────────────────────────────────────
--sand              #F5EFE0     Primary background
--sand-light        #FAF7F2     Card surfaces, inputs
--sand-dark         #E8DCC8     Dividers, subtle borders
--terracotta        #C4622D     Primary action (CTA buttons)
--terracotta-dark   #A84F23     Hover / active states
--terracotta-light  #F0D4C4     Tinted backgrounds
--sage              #7A9E7E     Secondary accents, badges
--sage-light        #C5D9C6     Tinted backgrounds
--warm-brown        #3D2B1F     Primary text (headings)
--warm-charcoal     #5C4033     Body text
--muted             #9A8778     Captions, placeholders
--border            #DDD4C5     Component borders
--surface           #FFFFFF     Pure white for contrast zones
```

### Typography

```
English:  DM Sans — Google Fonts (weights: 300, 400, 500, 600)
Arabic:   IBM Plex Arabic — Google Fonts (weights: 300, 400, 500, 600)

Scale:
  heading-xl    2.5rem / 3rem    (hero)
  heading-lg    1.875rem         (section)
  heading-md    1.375rem         (card, modal)
  heading-sm    1.125rem         (label groups)
  body-lg       1.0625rem / 1.75 line-height
  body-md       1rem / 1.625
  body-sm       0.875rem
  caption       0.75rem
```

### Spacing & Shape

```
Border radius:  4px (inputs), 8px (cards), 12px (modals), 999px (pills)
Shadows:        0 1px 3px rgba(61,43,31,0.08), 0 4px 16px rgba(61,43,31,0.06)
Max-width:      1200px (content), 760px (prose), 440px (auth modals)
```

---

## 7. i18n Architecture

### Routing

- **Middleware** intercepts all requests; detects locale from URL prefix
- `/` → redirect to `/ar` (Arabic is default; configurable)
- `/en/...` → English LTR
- `/ar/...` → Arabic RTL

### `<html dir>` Switching

Root layout `app/[locale]/layout.tsx` sets:
```tsx
<html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
```

### Tailwind RTL Strategy

```js
// tailwind.config.ts
plugins: [require('tailwindcss-rtl')]   // adds rtl: / ltr: variants
```

All flex layouts use logical properties:
```css
ms-* (margin-inline-start)  instead of ml-*
me-* (margin-inline-end)    instead of mr-*
ps-* / pe-*                 instead of pl-* / pr-*
```
`rtl:` variant used for directional icons (arrows, chevrons).

### Translation Files

```
messages/
  en.json     # English strings (namespaced)
  ar.json     # Arabic strings (matching structure)

Namespaces:
  common      Navigation, buttons, status labels
  auth        Sign in / sign up / reset forms
  home        Homepage content
  courses     Catalog, detail, player UI
  store       Product listings, checkout
  dashboard   Student hub labels
  admin       Admin panel strings
  emails      Email subject lines + body copy
```

### No Hardcoded Strings Policy

- Every user-visible string goes through `useTranslations()` (client) or `getTranslations()` (server)
- Prisma model bilingual fields (`titleEn` / `titleAr`) are selected based on `locale` at query level
- A utility `t_model(locale, { titleEn, titleAr })` returns the correct field

---

## 8. Infrastructure Notes

### Environment Variables

```bash
# Deployment
NEXTAUTH_URL=
NEXTAUTH_SECRET=

# Database (Railway PostgreSQL)
DATABASE_URL=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_MEMBERSHIP_PRICE_MONTHLY=
STRIPE_MEMBERSHIP_PRICE_ANNUAL=

# AWS S3
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
AWS_CLOUDFRONT_URL=           # optional CDN prefix for video delivery

# Resend Email
RESEND_API_KEY=
RESEND_FROM_EMAIL=            # e.g. noreply@almanar.com
RESEND_AUDIENCE_ID=           # Resend contact list ID for free-claim signups

# App
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
DEFAULT_LOCALE=ar                 # Arabic is the default locale; /  redirects to /ar
BILLING_CURRENCY=usd             # All Stripe charges are in USD
```

### S3 Bucket Layout

```
almanar-bucket/
  courses/
    [courseId]/
      lessons/
        [lessonId]/video.mp4
  products/
    [productId]/[filename]
  uploads/
    temp/                     # presigned upload staging
```

### Vercel Deployment Notes

- `NEXTAUTH_URL` must match production domain
- Edge middleware handles locale detection (no server function needed)
- API routes run as Serverless Functions (Node.js 20 runtime)

### Railway PostgreSQL

- Connection pooling via `?connection_limit=5` in `DATABASE_URL`
- Run `prisma migrate deploy` in Railway build step

---

*PLANNING.md v1.0 — awaiting approval before Module 1 begins.*
