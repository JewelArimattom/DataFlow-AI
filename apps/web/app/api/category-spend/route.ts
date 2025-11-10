import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Decimal } from '@prisma/client/runtime/library'

export async function GET() {
  try {
    const lineItems = await prisma.lineItem.findMany({
      where: {
        category: {
          not: null,
        },
      },
      select: {
        category: true,
        amount: true,
      },
    })

    // Group by category
    const categorySpend = new Map<string, number>()

    lineItems.forEach((item: { category: string | null; amount: Decimal }) => {
      const category = item.category || 'Uncategorized'
      const existing = categorySpend.get(category) || 0
      categorySpend.set(category, existing + Number(item.amount))
    })

    // Convert to array format
    const result = Array.from(categorySpend.entries())
      .map(([category, total]) => ({
        category,
        total: Number(total),
      }))
      .sort((a, b) => b.total - a.total)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching category spend:', error)
    const payload: any = { error: 'Failed to fetch category spend' }
    if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_VERBOSE_ERRORS === '1') {
      payload.details = String(error)
      if (error && typeof error === 'object') {
        // @ts-ignore
        payload.name = error.name
        // @ts-ignore
        payload.code = error.code
        // @ts-ignore
        payload.stack = error.stack
      }
    }
    return NextResponse.json(payload, { status: 500 })
  }
}

