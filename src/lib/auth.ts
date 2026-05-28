/**
 * NextAuth v4 configuration — Credentials provider + JWT strategy.
 *
 * Why no PrismaAdapter?
 *   - MVP only uses email/password (Credentials provider)
 *   - Credentials requires JWT strategy; adapter is mainly for OAuth + DB sessions
 *   - Avoids @auth/prisma-adapter v2 ↔ next-auth v4 API mismatch
 *   - We look up users directly in the authorize() callback via Prisma
 *
 * The JWT carries { id, role } so every Server Component can call
 * getServerSession(authOptions) without a DB round-trip.
 */
import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import type { Role } from '@prisma/client'

export const authOptions: NextAuthOptions = {
  // ── Session ────────────────────────────────────────────────────────────────
  session: {
    strategy: 'jwt',
    maxAge:   30 * 24 * 60 * 60, // 30 days
  },

  // ── Custom pages (locale-unaware redirect; shim at /auth/signin handles locale) ──
  pages: {
    signIn: '/auth/signin',
    error:  '/auth/signin',  // surface errors on the sign-in page
  },

  // ── Providers ──────────────────────────────────────────────────────────────
  providers: [
    CredentialsProvider({
      id:   'credentials',
      name: 'Email & Password',
      credentials: {
        email:    { label: 'Email',    type: 'email'    },
        password: { label: 'Password', type: 'password' },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null

        const user = await db.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
          select: {
            id:       true,
            email:    true,
            name:     true,
            password: true,
            role:     true,
            image:    true,
          },
        })

        // No user or OAuth-only account (no password)
        if (!user || !user.password) return null

        const isValid = await bcrypt.compare(credentials.password, user.password)
        if (!isValid) return null

        return {
          id:    user.id,
          email: user.email,
          name:  user.name  ?? undefined,
          image: user.image ?? undefined,
          role:  user.role,
        }
      },
    }),
  ],

  // ── Callbacks ─────────────────────────────────────────────────────────────
  callbacks: {
    /**
     * jwt(): Called when a JWT is created (sign-in) or read (request).
     * We embed `id` and `role` so getServerSession() returns them
     * without a DB lookup.
     */
    async jwt({ token, user }) {
      if (user) {
        token.id   = user.id
        token.role = (user as { role: Role }).role
      }
      return token
    },

    /**
     * session(): Maps JWT fields → session object.
     * This is what Server Components receive from getServerSession().
     */
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id   = token.id   as string
        session.user.role = token.role as Role
      }
      return session
    },
  },

  // ── Secret ────────────────────────────────────────────────────────────────
  secret: process.env.NEXTAUTH_SECRET,

  debug: process.env.NODE_ENV === 'development',
}
