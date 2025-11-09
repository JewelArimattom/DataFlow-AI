'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'

interface OutflowData {
  range: string
  amount: number
}

export function CashOutflowChart() {
  const [data, setData] = useState<OutflowData[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/cash-outflow')
      .then((res) => res.json())
      .then((response) => {
        if (Array.isArray(response)) {
          setData(response)
        } else {
          console.error('Cash outflow API returned unexpected format:', response)
          setData([])
        }
        setLoading(false)
      })
      .catch((error) => {
        console.error('Error fetching cash outflow:', error)
        setData([])
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <Card className="bg-white border border-gray-200">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Cash Outflow Forecast</CardTitle>
          <p className="text-sm text-gray-500 mt-1">Expected payment obligations grouped by due date ranges.</p>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[240px] w-full" />
        </CardContent>
      </Card>
    )
  }

  const formatEuro = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const chartData = data.map((item) => ({
    range: item.range,
    amount: Number(item.amount),
  }))

  // Add a background value (slightly above max) so we can render a pale full-height "paper" bar behind each column
  const maxAmount = chartData.length ? Math.max(...chartData.map((d) => d.amount)) : 0
  const bgMax = maxAmount ? Math.ceil(maxAmount * 1.05) : 0
  const chartDataWithBg = chartData.map((d) => ({ ...d, bg: bgMax }))

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null
    // find the payload entry for the main amount series
    const amountEntry = payload.find((p: any) => p.dataKey === 'amount')
    const value = amountEntry ? amountEntry.value : null
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow p-3 text-sm text-gray-900">
        <div className="font-medium mb-1">{label}</div>
        <div className="text-base font-semibold">{value !== null ? formatEuro(value) : '-'}</div>
      </div>
    )
  }

  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Cash Outflow Forecast</CardTitle>
        <p className="text-xs text-gray-500 mt-1">Expected payment obligations grouped by due date ranges.</p>
      </CardHeader>
      <CardContent>
        <div className="h-[360px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartDataWithBg}
              margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
              barCategoryGap="4%"
              barGap={2}
              onMouseMove={(state: any) => {
                if (state && typeof state.activeTooltipIndex === 'number') {
                  setHoveredIndex(state.activeTooltipIndex)
                } else {
                  setHoveredIndex(null)
                }
              }}
              onMouseLeave={() => setHoveredIndex(null)}
            >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} horizontal={true} />
            <XAxis 
              dataKey="range" 
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
              domain={[0, bgMax || 'dataMax']}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />

            {/* defs for bar shadow */}
            <defs>
              <filter id="barShadow" x="-50%" y="-50%" width="220%" height="220%">
                <feDropShadow dx="0" dy="8" stdDeviation="18" floodColor="#0f172a" floodOpacity="0.06" />
              </filter>
            </defs>

            {/* background pale bars (visual only) with large rounded pill and shadow */}
            {/* background pale bars (visual only) rendered first so they sit behind the main bars */}
            <Bar
              dataKey="bg"
              fill="#eef2f6"
              barSize={260}
              radius={[999, 999, 999, 999]}
              isAnimationActive={false}
              legendType="none"
              // make background bars non-interactive so tooltip targets the foreground bar
              style={{ pointerEvents: 'none' }}
            >
              {chartDataWithBg.map((_, idx) => (
                <Cell key={`bg-cell-${idx}`} filter="url(#barShadow)" />
              ))}
            </Bar>

            {/* foreground bars (actual amounts) rendered after the bg bars so they appear on top */}
            <Bar
              dataKey="amount"
              fill="#0b1550"
              radius={[36, 36, 18, 18]}
              barSize={220}
            >
              {chartDataWithBg.map((_, idx) => (
                <Cell key={`amt-cell-${idx}`} fill={hoveredIndex === idx ? '#091d57' : '#0b1550'} />
              ))}
            </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export default CashOutflowChart

