import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Temporary debug endpoint to test Prisma/DB connectivity
// Safe to delete once DB connection is verified
export const dynamic = 'force-dynamic'

export async function GET() {
  const checks: any = {
    timestamp: new Date().toISOString(),
    databaseUrl: process.env.DATABASE_URL ? 'set' : 'MISSING',
    nodeEnv: process.env.NODE_ENV,
  }

  try {
    // Test 1: Can we import and instantiate Prisma?
    checks.prismaClientLoaded = 'yes'

    // Test 2: Can we execute a raw query?
    const result = await prisma.$queryRaw`SELECT 1 as test`
    checks.rawQuerySuccess = 'yes'
    checks.rawQueryResult = result

    // Test 3: Can we query a table?
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
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
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
