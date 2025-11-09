import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    
    // Calculate date ranges
    const days7 = new Date(now)
    days7.setDate(days7.getDate() + 7)
    
    const days30 = new Date(now)
    days30.setDate(days30.getDate() + 30)
    
    const days60 = new Date(now)
    days60.setDate(days60.getDate() + 60)

    // Get all unpaid invoices
    const invoices = await prisma.invoice.findMany({
      where: {
        status: {
          not: 'paid',
        },
        OR: [
          { dueDate: { not: null } },
          { dueDate: null }, // Include invoices without due dates
        ],
      },
      select: {
        dueDate: true,
        total: true,
      },
    })

    // Group by date ranges
    const ranges = {
      '0-7 days': 0,
      '8-30 days': 0,
      '31-60 days': 0,
      '60+ days': 0,
    }

    invoices.forEach((invoice) => {
      const total = Number(invoice.total)
      
      if (!invoice.dueDate) {
        // If no due date, put in 60+ days
        ranges['60+ days'] += total
        return
      }

      const dueDate = new Date(invoice.dueDate)
      dueDate.setHours(0, 0, 0, 0)
      const daysDiff = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      if (daysDiff <= 7) {
        ranges['0-7 days'] += total
      } else if (daysDiff <= 30) {
        ranges['8-30 days'] += total
      } else if (daysDiff <= 60) {
        ranges['31-60 days'] += total
      } else {
        ranges['60+ days'] += total
      }
    })

    // Convert to array format
    const result = Object.entries(ranges).map(([range, amount]) => ({
      range,
      amount: Number(amount),
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching cash outflow:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cash outflow' },
      { status: 500 }
    )
  }
}

