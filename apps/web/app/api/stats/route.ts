import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Stats API endpoint - returns dashboard statistics
export async function GET(request: Request) {
  // Quick debug-only response: avoid DB access and only reveal whether DATABASE_URL exists.
  // Use: /api/stats?debug=1
  try {
    const url = new URL(request.url)
    if (url.searchParams.get('debug') === '1') {
      return NextResponse.json({
        debug: true,
        databaseUrl: process.env.DATABASE_URL ? 'set' : 'MISSING',
        nodeEnv: process.env.NODE_ENV,
      })
    }
  } catch (e) {
    // ignore URL parsing errors and continue to normal handler
  }

  try {
    const currentYear = new Date().getFullYear()
    const yearStart = new Date(currentYear, 0, 1)

    // Parallel query execution for better performance
    const [totalSpendResult, totalInvoices, avgInvoice] = await Promise.all([
      // Total Spend (YTD)
      prisma.invoice.aggregate({
        where: { date: { gte: yearStart } },
        _sum: { total: true },
      }),
      // Total Invoices Processed
      prisma.invoice.count(),
      // Average Invoice Value
      prisma.invoice.aggregate({
        _avg: { total: true },
      }),
    ])

    // Documents Uploaded (same as invoices for now)
    const documentsUploaded = totalInvoices

    // Build monthly history for the last 6 months (oldest -> newest)
    const monthsBack = 6
    const now = new Date()
    const historyStart = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1)

    // Pre-calculate all month boundaries
    const monthBoundaries = Array.from({ length: monthsBack }, (_, i) => {
      const m = new Date(historyStart.getFullYear(), historyStart.getMonth() + i, 1)
      return {
        start: new Date(m.getFullYear(), m.getMonth(), 1),
        end: new Date(m.getFullYear(), m.getMonth() + 1, 1),
      }
    })

    // Fetch all invoices in the 6-month range at once
    const allInvoicesInRange = await prisma.invoice.findMany({
      where: {
        date: {
          gte: monthBoundaries[0].start,
          lt: monthBoundaries[monthsBack - 1].end,
        },
      },
      select: {
        date: true,
        total: true,
      },
    })

    // Group invoices by month in memory (faster than multiple DB queries)
    const totalSpendHistory: number[] = []
    const totalInvoicesHistory: number[] = []
    const documentsUploadedHistory: number[] = []
    const averageInvoiceValueHistory: number[] = []

    for (const { start, end } of monthBoundaries) {
      const monthInvoices = allInvoicesInRange.filter(
        (inv) => inv.date >= start && inv.date < end
      )

      const monthSpend = monthInvoices.reduce((sum, inv) => sum + Number(inv.total ?? 0), 0)
      const monthCount = monthInvoices.length
      const monthAvg = monthCount > 0 ? monthSpend / monthCount : 0

      totalSpendHistory.push(Number(monthSpend.toFixed(2)))
      totalInvoicesHistory.push(monthCount)
      documentsUploadedHistory.push(monthCount)
      averageInvoiceValueHistory.push(Number(monthAvg.toFixed(2)))
    }

    return NextResponse.json({
      totalSpend: Number(totalSpendResult._sum.total ?? 0),
      totalInvoices,
      documentsUploaded,
      averageInvoiceValue: Number(avgInvoice._avg.total ?? 0),
      totalSpendHistory,
      totalInvoicesHistory,
      documentsUploadedHistory,
      averageInvoiceValueHistory,
    })
  } catch (error) {
    // Enhanced temporary diagnostics
    console.error('Error fetching stats:', error)
    const payload: any = { error: 'Failed to fetch stats' }
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

