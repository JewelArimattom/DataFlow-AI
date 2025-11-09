import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const limit = Math.max(1, Math.min(100, parseInt(limitParam || '10')))

    const topVendors = await prisma.vendor.findMany({
      include: {
        invoices: {
          select: {
            total: true,
          },
        },
      },
    })

    // Calculate total spend per vendor
    const vendorSpend = topVendors
      .map((vendor) => ({
        id: vendor.id,
        name: vendor.name,
        totalSpend: vendor.invoices.reduce(
          (sum, inv) => sum + Number(inv.total),
          0
        ),
      }))
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, limit)

    return NextResponse.json(vendorSpend)
  } catch (error) {
    console.error('Error fetching top vendors:', error)
    return NextResponse.json(
      { error: 'Failed to fetch top vendors' },
      { status: 500 }
    )
  }
}

