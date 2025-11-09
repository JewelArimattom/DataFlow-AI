import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    lineItems.forEach((item) => {
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
    return NextResponse.json(
      { error: 'Failed to fetch category spend' },
      { status: 500 }
    )
  }
}

