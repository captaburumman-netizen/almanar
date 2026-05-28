/**
 * Prisma client singleton.
 *
 * In development, Next.js HMR recreates modules on every change, which
 * would create a new PrismaClient connection each time and exhaust the
 * connection pool. The singleton pattern on `globalThis` prevents that.
 *
 * In production (Vercel Serverless), each function invocation gets a fresh
 * module scope, so no global is needed — but it doesn't hurt either.
 */
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}
