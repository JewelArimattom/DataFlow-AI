import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const currentYear = new Date().getFullYear()
    const yearStart = new Date(currentYear, 0, 1)

    // Total Spend (YTD)
    const totalSpend = await prisma.invoice.aggregate({
      where: {
        date: {
          gte: yearStart,
        },
      },
      _sum: {
        total: true,
      },
    })

    // Total Invoices Processed
    const totalInvoices = await prisma.invoice.count()

    // Documents Uploaded (same as invoices for now)
    const documentsUploaded = totalInvoices

    // Average Invoice Value
    const avgInvoice = await prisma.invoice.aggregate({
      _avg: {
        total: true,
      },
    })

    // Build simple monthly history for the last 6 months (oldest -> newest)
    const monthsBack = 6
    const now = new Date()
    const historyStart = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1)

    const totalSpendHistory: number[] = []
    const totalInvoicesHistory: number[] = []
    const documentsUploadedHistory: number[] = []
    const averageInvoiceValueHistory: number[] = []

    for (let i = 0; i < monthsBack; i++) {
      const m = new Date(historyStart.getFullYear(), historyStart.getMonth() + i, 1)
      const monthStart = new Date(m.getFullYear(), m.getMonth(), 1)
      const monthEnd = new Date(m.getFullYear(), m.getMonth() + 1, 1)

      const spendAgg = await prisma.invoice.aggregate({
        where: { date: { gte: monthStart, lt: monthEnd } },
        _sum: { total: true },
      })

      const invoicesCount = await prisma.invoice.count({
        where: { date: { gte: monthStart, lt: monthEnd } },
      })

      const avgAgg = await prisma.invoice.aggregate({
        where: { date: { gte: monthStart, lt: monthEnd } },
        _avg: { total: true },
      })

  const spendVal = Number(spendAgg._sum.total ?? 0)
  const avgVal = Number(avgAgg._avg.total ?? 0)

      totalSpendHistory.push(spendVal)
      totalInvoicesHistory.push(invoicesCount)
      documentsUploadedHistory.push(invoicesCount)
      averageInvoiceValueHistory.push(avgVal)
    }

    return NextResponse.json({
      totalSpend: Number(totalSpend._sum.total ?? 0),
      totalInvoices,
      documentsUploaded,
      averageInvoiceValue: Number(avgInvoice._avg.total ?? 0),
      totalSpendHistory,
      totalInvoicesHistory,
      documentsUploadedHistory,
      averageInvoiceValueHistory,
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    const payload: any = { error: 'Failed to fetch stats' }
    if (process.env.NODE_ENV !== 'production') payload.details = String(error)
    return NextResponse.json(payload, { status: 500 })
  }
}

