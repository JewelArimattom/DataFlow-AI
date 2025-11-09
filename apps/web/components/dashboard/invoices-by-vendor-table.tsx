'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'

interface InvoiceData {
  id: string
  vendor: string
  date: string
  total: number
}

export function InvoicesByVendorTable() {
  const [data, setData] = useState<InvoiceData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch invoices directly
    fetch('/api/invoices?limit=100&page=1&sortBy=date&sortOrder=desc')
      .then((res) => res.json())
      .then((response) => {
        // Use the invoices data directly
        const invoices = response.data || []
        setData(invoices)
        setLoading(false)
      })
      .catch((error) => {
        console.error('Error fetching invoices:', error)
        setLoading(false)
      })
  }, [])

  const formatEuro = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date)
  }

  if (loading) {
    return (
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Invoices by Vendor</CardTitle>
          <p className="text-sm text-gray-600 mt-1">Top vendors by invoice count and net value.</p>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[220px] w-full" />
        </CardContent>
      </Card>
    )
  }

  // Enable vertical scroll only when there are more than 5 rows
  const scrollNeeded = data.length > 5

  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-gray-900">Invoices by Vendor</CardTitle>
        <p className="text-xs text-gray-500 mt-0.5">Top vendors by invoice count and net value.</p>
      </CardHeader>
      <CardContent className="px-6">
        <div
          className={`w-full min-w-0 ${scrollNeeded ? 'max-h-[375px] overflow-y-auto' : ''} overflow-x-hidden no-scrollbar`}
          style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
        >
          <Table className="w-full table-fixed">
          <TableHeader>
            <TableRow className="border-b border-gray-200 h-11">
              <TableHead className="font-medium text-xs text-gray-700 py-2.5 px-2 w-[35%]">Vendor</TableHead>
              <TableHead className="font-medium text-xs text-gray-700 py-2.5 px-2 text-center w-[30%]"># Invoices</TableHead>
              <TableHead className="font-medium text-xs text-gray-700 py-2.5 px-2 text-right w-[35%]">Net Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-gray-500 text-xs py-8">
                  No data available
                </TableCell>
              </TableRow>
            ) : (
              data.map((item, index) => (
                <TableRow key={index} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors h-11">
                  <TableCell className="text-xs text-gray-900 py-3 px-2 font-normal truncate">{item.vendor}</TableCell>
                  <TableCell className="text-xs text-gray-600 py-3 px-2 text-center">{formatDate(item.date)}</TableCell>
                  <TableCell className="text-xs text-gray-900 py-3 px-2 text-right">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-50 text-xs font-medium">
                      {formatEuro(item.total)}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          </Table>
        </div>
        <style jsx>{`
          .no-scrollbar::-webkit-scrollbar { display: none; }
        `}</style>
      </CardContent>
    </Card>
  )
}

export default InvoicesByVendorTable

