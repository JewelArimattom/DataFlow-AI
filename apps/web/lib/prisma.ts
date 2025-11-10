import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

if (!process.env.DATABASE_URL) {
  // Helpful log to surface missing DB connection on deployed environments
  // (Vercel/other hosts must set DATABASE_URL in project env settings)
  // eslint-disable-next-line no-console
  console.warn('Warning: DATABASE_URL is not set. Prisma queries will fail until DATABASE_URL is configured.')
}

// For serverless deployments (Vercel), ensure Prisma connects via PgBouncer Transaction pooler
// to avoid exhausting database connections. We append recommended parameters when using Postgres.
function withPgBouncerParams(url: string | undefined) {
  if (!url) return url
  if (!url.startsWith('postgresql')) return url

  // Use URL parsing to manipulate query params safely
  try {
    const u = new URL(url)
    const params = u.searchParams

    // Ensure SSL for Supabase
    if (!params.has('sslmode')) params.set('sslmode', 'require')

    // Hint Prisma to work well with PgBouncer + avoid many connections in serverless
    if (!params.has('pgbouncer')) params.set('pgbouncer', 'true')
    if (!params.has('connection_limit')) params.set('connection_limit', '1')

    u.search = params.toString()
    return u.toString()
  } catch {
    // Fallback to string append
    const hasQuery = url.includes('?')
    const suffix = 'sslmode=require&pgbouncer=true&connection_limit=1'
    return url + (hasQuery ? '&' : '?') + suffix
  }
}

const datasourceUrl = withPgBouncerParams(process.env.DATABASE_URL)

// Optional one-time logging & early connectivity probe for diagnostics.
if (process.env.DEBUG_PRISMA_INIT === '1') {
  // eslint-disable-next-line no-console
  console.log('[prisma:init] datasourceUrl:', datasourceUrl)
}

let prismaClient: PrismaClient
if (globalForPrisma.prisma) {
  prismaClient = globalForPrisma.prisma
} else {
  try {
    prismaClient = new PrismaClient(
      datasourceUrl ? { datasources: { db: { url: datasourceUrl } } } : undefined
    )
    // Optional lightweight probe when verbose debug enabled
    if (process.env.DEBUG_PRISMA_INIT === '1') {
      prismaClient.$queryRaw`SELECT 1`.then(() => {
        // eslint-disable-next-line no-console
        console.log('[prisma:init] connectivity probe succeeded')
      }).catch((e) => {
        // eslint-disable-next-line no-console
        console.error('[prisma:init] connectivity probe failed', e)
      })
    }
    if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prismaClient
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[prisma:init] failed to create client', e)
    throw e
  }
}

export const prisma = prismaClient

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

