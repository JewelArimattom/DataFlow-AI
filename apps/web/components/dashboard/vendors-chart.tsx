'use client'

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface VendorData {
  id: string
  name: string
  totalSpend: number
  percentage?: number
}

export function VendorsChart() {
  const [data, setData] = useState<VendorData[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredVendor, setHoveredVendor] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ left: number; top: number } | null>(null)

  useEffect(() => {
    fetch('/api/vendors/top10')
      .then((res) => res.json())
      .then((response) => {
        if (Array.isArray(response)) {
          // Calculate percentages
          const totalSpend = response.reduce((sum, vendor) => sum + vendor.totalSpend, 0)
          const dataWithPercentages = response.map(vendor => ({
            ...vendor,
            percentage: (vendor.totalSpend / totalSpend) * 100
          }))
          setData(dataWithPercentages)
        } else {
          console.error('Vendors API returned unexpected format:', response)
          setData([])
        }
        setLoading(false)
      })
      .catch((error) => {
        console.error('Error fetching vendors:', error)
        setData([])
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

  if (loading) {
    return (
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-gray-900"> </CardTitle>
          <p className="text-sm text-gray-600 mt-1">Vendor spend with cumulative percentage distribution.</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Sort by percentage descending
  const sortedData = [...data].sort((a, b) => (b.percentage || 0) - (a.percentage || 0))

  // Helper to calculate a gray tone based on percentage
  const grayForPercentage = (pct?: number) => {
    const p = Math.max(0, Math.min(100, pct || 0)) / 100
    const baseRgb = '176, 171, 237' // #9ca5be
    const alpha = 0.15 + p * 0.6
    return `rgba(${baseRgb}, ${alpha})`
  }

  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-gray-900">Spend by Vendor (Top 10)</CardTitle>
        <p className="text-sm text-gray-600 mt-1">Vendor spend with cumulative percentage distribution.</p>
      </CardHeader>
      <CardContent>
  <div ref={(el) => { containerRef.current = el }} className="space-y-3 relative">
          {sortedData.map((vendor, index) => {
            // Use total sum of all vendors so bar length represents percentage of total spend
            const totalSum = sortedData.reduce((s, v) => s + v.totalSpend, 0) || 1
            const barWidth = (vendor.totalSpend / totalSum) * 100
            const isHovered = hoveredVendor === vendor.id

            return (
              <div
                key={vendor.id}
                className="flex items-center space-x-4"
                onMouseEnter={(e) => {
                  setHoveredVendor(vendor.id)
                  const container = containerRef.current
                  if (container) {
                    const cr = container.getBoundingClientRect()
                    const left = Math.min(cr.width - 200, Math.max(8, e.clientX - cr.left))
                    const top = e.clientY - cr.top + 10
                    setTooltipPos({ left, top })
                  }
                }}
                onMouseLeave={() => {
                  setHoveredVendor(null)
                  setTooltipPos(null)
                }}
              >
                <div className="text-sm font-medium text-gray-700 w-40 truncate">
                  {vendor.name}
                </div>
                <div className="relative h-9 bg-gray-100 rounded-sm overflow-hidden flex-1">
                  <div
                    className="absolute inset-y-0 left-0 rounded-sm transition-all duration-300"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: isHovered ? '#091d57' : grayForPercentage(vendor.percentage),
                    }}
                  />
                </div>
              </div>
            )
          })}

          {/* Floating tooltip positioned relative to container */}
          {tooltipPos && hoveredVendor && (
            (() => {
              const vendor = sortedData.find(v => v.id === hoveredVendor)
              if (!vendor) return null
              return (
                <div
                  className="absolute bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 min-w-[200px] z-20 pointer-events-none"
                  style={{ left: tooltipPos.left, top: tooltipPos.top }}
                >
                  <div className="text-sm font-semibold text-gray-900 mb-0.5">{vendor.name}</div>
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-xs text-gray-500">{vendor.percentage?.toFixed(1)}% of total</div>
                    <div className="text-base font-bold text-blue-600">{formatEuro(vendor.totalSpend)}</div>
                  </div>
                </div>
              )
            })()
          )}
        </div>

        {/* X-axis labels */}
        <div className="flex justify-between mt-2 px-1">
          <span className="text-xs text-gray-500">€0k</span>
          <span className="text-xs text-gray-500">€10k</span>
          <span className="text-xs text-gray-500">€20k</span>
          <span className="text-xs text-gray-500">€30k</span>
          <span className="text-xs text-gray-500">€40k</span>
        </div>

        
      </CardContent>
    </Card>
  )
}

// Color function to match the design
function getVendorColor(vendorName: string, index: number): string {
  const colorMap: Record<string, string> = {
    'AvenCore': '#C4CADB',
    'Test Solutions': '#B0B8CF', 
    'PrinterVendor': '#9CA5BE',
    'DataServices': '#D4D9E6',
    'Omegaku': '#1E3A8A',
  }

  return colorMap[vendorName] || [
    '#C4CADB', // light purple-gray
    '#B0B8CF', // medium purple-gray
    '#9CA5BE', // medium purple-gray 2
    '#D4D9E6', // very light purple-gray
    '#1E3A8A', // dark blue
    '#E0E4ED', // very light
    '#EAEDF4', // lightest
  ][index % 7]
}