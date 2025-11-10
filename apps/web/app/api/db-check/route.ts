import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Production-safe DB connectivity check (no underscore path to avoid filtering)
export const dynamic = 'force-dynamic'

export async function GET() {
  const checks: any = {
    timestamp: new Date().toISOString(),
    databaseUrl: process.env.DATABASE_URL ? 'set' : 'MISSING',
    nodeEnv: process.env.NODE_ENV,
  }

  try {
    // Test 1: Prisma client loaded
    checks.prismaClientLoaded = 'yes'

    // Test 2: Raw query
    const result = await prisma.$queryRaw`SELECT 1 as test`
    checks.rawQuerySuccess = 'yes'
    checks.rawQueryResult = result

    // Test 3: Table count
    const count = await prisma.invoice.count()
    checks.invoiceCount = count
    checks.tableQuerySuccess = 'yes'

    return NextResponse.json({
      status: 'success',
      message: 'Database connection verified',
      checks,
    })
  } catch (error: any) {
    checks.error = {
      name: error.name,
      message: error.message,
      code: error.code,
      stack:
        process.env.NODE_ENV !== 'production' || process.env.DEBUG_VERBOSE_ERRORS === '1'
          ? error.stack
          : undefined,
    }

    return NextResponse.json(
      {
        status: 'error',
        message: 'Database connection failed',
        checks,
      },
      { status: 500 }
    )
  }
}
