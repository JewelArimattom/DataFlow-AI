import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Public (non-underscore) health check for Prisma connectivity
// Returns minimal, non-sensitive info. Use for production diagnostics.
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const checks: Record<string, any> = {
    timestamp: new Date().toISOString(),
    databaseUrl: process.env.DATABASE_URL ? 'set' : 'MISSING',
    nodeEnv: process.env.NODE_ENV,
  }

  try {
    // Basic connectivity: raw query
    const result = await prisma.$queryRaw`SELECT 1 as ok`
    checks.raw = result

    // Simple table check (optional table may be empty)
    const invoiceCount = await prisma.invoice.count().catch(() => null)
    checks.invoiceCount = invoiceCount

    return NextResponse.json({ status: 'ok', checks })
  } catch (error: any) {
    const payload: any = { status: 'error', message: 'Prisma connectivity failed', checks }
    // allow ad-hoc verbose via query param: /api/db-check?verbose=1
    let verbose = process.env.NODE_ENV !== 'production' || process.env.DEBUG_VERBOSE_ERRORS === '1'
    try {
      const url = new URL(request.url)
      if (url.searchParams.get('verbose') === '1') verbose = true
    } catch {}

    if (verbose) {
      payload.error = {
        name: error?.name,
        message: String(error?.message ?? error),
        code: error?.code,
        stack: error?.stack,
      }
    }
    return NextResponse.json(payload, { status: 500 })
  }
}
 
