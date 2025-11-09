import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Decimal } from '@prisma/client/runtime/library'

export async function GET() {
  try {
    // Get invoices grouped by month
    const invoices = await prisma.invoice.findMany({
      select: {
        date: true,
        total: true,
      },
      orderBy: {
        date: 'asc',
      },
    })

    // Group by month
    const monthlyData = new Map<string, { count: number; total: number }>()

    invoices.forEach((invoice: { date: Date; total: Decimal }) => {
      const monthKey = invoice.date.toISOString().substring(0, 7) // YYYY-MM
      const existing = monthlyData.get(monthKey) || { count: 0, total: 0 }
      monthlyData.set(monthKey, {
        count: existing.count + 1,
        total: existing.total + Number(invoice.total),
      })
    })

    // Convert to array format
    const trends = Array.from(monthlyData.entries())
      .map(([month, data]) => ({
        month,
        count: data.count,
        total: Number(data.total),
      }))
      .sort((a, b) => a.month.localeCompare(b.month))

    return NextResponse.json(trends)
  } catch (error) {
    console.error('Error fetching invoice trends:', error)
    const payload: any = { error: 'Failed to fetch invoice trends' }
    if (process.env.NODE_ENV !== 'production') payload.details = String(error)
    return NextResponse.json(payload, { status: 500 })
  }
}

