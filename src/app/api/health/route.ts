import { NextResponse } from 'next/server'

/**
 * GET /api/health
 *
 * Deployment health check — used by Railway, Vercel, and uptime monitors.
 * Returns 200 + JSON payload with environment check.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV ?? 'unknown',
    },
    { status: 200 }
  )
}
