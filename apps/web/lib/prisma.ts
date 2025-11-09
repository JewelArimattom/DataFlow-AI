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

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

