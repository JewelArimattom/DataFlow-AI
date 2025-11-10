import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Decimal } from '@prisma/client/runtime/library'

// This route reads request.url query params; force dynamic to avoid static render errors
export const dynamic = 'force-dynamic'

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
    type VendorSpend = { id: string; name: string; totalSpend: number }

    const vendorSpend: VendorSpend[] = topVendors
      .map((vendor: { id: string; name: string; invoices: { total: Decimal }[] }): VendorSpend => ({
        id: vendor.id,
        name: vendor.name,
        totalSpend: vendor.invoices.reduce(
          (sum: number, inv: { total: Decimal }) => sum + Number(inv.total),
          0
        ),
      }))
      .sort((a: VendorSpend, b: VendorSpend) => b.totalSpend - a.totalSpend)
      .slice(0, limit)

    return NextResponse.json(vendorSpend)
  } catch (error) {
    console.error('Error fetching top vendors:', error)
    const payload: any = { error: 'Failed to fetch top vendors' }
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

