import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Decimal } from '@prisma/client/runtime/library'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sortBy') || 'date'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const status = searchParams.get('status')
    const vendorId = searchParams.get('vendorId')

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { vendor: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    if (status) {
      where.status = status
    }

    if (vendorId) {
      where.vendorId = vendorId
    }

    // Build orderBy
    const orderBy: any = {}
    orderBy[sortBy] = sortOrder

    // Fetch invoices
    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          vendor: {
            select: {
              name: true,
            },
          },
          customer: {
            select: {
              name: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ])

    return NextResponse.json({
      data: invoices.map((invoice: {
        id: string
        invoiceNumber: string
        date: Date
        dueDate: Date | null
        amount: Decimal
        tax?: Decimal | null
        total: Decimal
        status: string
        vendor: { name: string }
        customer?: { name?: string } | null
        notes?: string | null
      }) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        date: invoice.date.toISOString(),
        dueDate: invoice.dueDate?.toISOString() || null,
        amount: Number(invoice.amount),
        tax: invoice.tax ? Number(invoice.tax) : null,
        total: Number(invoice.total),
        status: invoice.status,
        vendor: invoice.vendor.name,
        customer: invoice.customer?.name || null,
        notes: invoice.notes,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching invoices:', error)
    const payload: any = { error: 'Failed to fetch invoices' }
    if (process.env.NODE_ENV !== 'production') payload.details = String(error)
    return NextResponse.json(payload, { status: 500 })
  }
}

