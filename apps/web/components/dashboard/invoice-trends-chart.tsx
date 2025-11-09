'use client'

import { useEffect, useState, Fragment } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart, Bar, Cell } from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'

interface TrendData {
  month: string
  count: number
  total: number
}

export function InvoiceVolumeValueTrend() {
  const [data, setData] = useState<TrendData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/invoice-trends')
      .then((res) => res.json())
      .then((response) => {
        if (Array.isArray(response)) {
          setData(response)
        } else {
          setData([])
          console.error('API returned error or unexpected format:', response)
        }
        setLoading(false)
      })
      .catch((error) => {
        console.error('Error fetching trends:', error)
        setData([])
        setLoading(false)
      })
  }, [])

  const formatEuro = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const chartData = data.map((item) => {
    const date = new Date(item.month + '-01')
    return {
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      fullMonth: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      count: item.count,
      total: Number(item.total),
    }
  })

  // add a background value that fills to the chart max so bars span full height
  const maxTotal = chartData.length ? Math.max(...chartData.map((d) => d.total)) : 0
  const maxCount = chartData.length ? Math.max(...chartData.map((d) => d.count)) : 0
  // create a compare series (background lighter line) by scaling count to totals range
  // build a smoother comparison series derived from totals (3-point moving average), scaled down and slightly offset
  const chartDataWithBg = chartData.map((d, i, arr) => {
    const prev = arr[i - 1]?.total ?? d.total
    const next = arr[i + 3]?.total ?? d.total
    const avg = (prev + d.total + next) / 2
    const compareRaw = avg * 1.2 // smaller amplitude than totals
    const compare = Math.max(1, compareRaw - maxTotal * 0.1)
    return { ...d, bg: maxTotal, compare }
  })

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <div className="text-sm font-semibold text-gray-900 mb-2">
            {data.fullMonth}
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-gray-600">Total Spend:</span>
              <span className="text-sm font-semibold" style={{ color: '#1F2937' }}>{formatEuro(data.total)}</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Invoice Volume + Value Trend
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">Total spend over 12 months.</p>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
          <div className="flex items-center justify-center gap-6 mt-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-gray-900">
          Invoice Volume + Value Trend
        </CardTitle>
        <p className="text-sm text-gray-600 mt-1">Total spend over 12 months.</p>
      </CardHeader>
      <CardContent>
        <div className="h-[380px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartDataWithBg}
              onMouseMove={(state: any) => {
                if (state && typeof state.activeTooltipIndex === 'number') {
                  setHoveredIndex(state.activeTooltipIndex)
                } else {
                  setHoveredIndex(null)
                }
              }}
              onMouseLeave={() => setHoveredIndex(null)}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <XAxis 
                dataKey="month" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickFormatter={(value) => `€${(value / 1000).toFixed(0)}K`}
                domain={[0, Math.ceil(maxTotal * 1.05) || 'dataMax']}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'rgba(139, 92, 246, 0.10)', stroke: 'transparent' }}
              />
              <defs>
                {chartDataWithBg.map((_, idx) => (
                  <Fragment key={`defs-${idx}`}>
                    <linearGradient id={`bgGrad-${idx}`} x1="0" y1="1" x2="0" y2="0">
                      <stop offset="0%" stopColor="rgba(139,92,246)" stopOpacity={0.14} />
                      <stop offset="60%" stopColor="rgba(139,92,246)" stopOpacity={0.06} />
                      <stop offset="100%" stopColor="rgba(139,92,246)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id={`bgGradBright-${idx}`} x1="0" y1="1" x2="0" y2="0">
                      <stop offset="0%" stopColor="rgba(139,92,246)" stopOpacity={0.2} />
                      <stop offset="60%" stopColor="rgba(139,92,246)" stopOpacity={0.1} />
                      <stop offset="100%" stopColor="rgba(139,92,246)" stopOpacity={0} />
                    </linearGradient>
                  </Fragment>
                ))}
              </defs>
              {/* background vertical bars (visual only) */}
              <Bar
                yAxisId="right"
                dataKey="bg"
                barSize={36}
                radius={[6, 6, 0, 0]}
                isAnimationActive={false}
                // make background bars non-interactive
                label={false}
                legendType="none"
                // pointer events disabled so tooltip remains tied to the line
                style={{ pointerEvents: 'none' }}
              >
                {chartDataWithBg.map((_, idx) => (
                  <Cell
                    key={`bg-cell-${idx}`}
                    fill={`url(#${hoveredIndex === idx ? 'bgGradBright' : 'bgGrad'}-${idx})`}
                    style={{ pointerEvents: 'none' }}
                  />
                ))}
              </Bar>
              {/* subtle background comparison line (lighter color) */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="compare"
                stroke="#bab6f0"
                strokeWidth={2}
                strokeOpacity={0.6}
                dot={false}
                isAnimationActive={false}
                name="Comparison"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="total"
                stroke="#1F2937"
                strokeWidth={4}
                dot={false}
                activeDot={false}
                name="Total Spend"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div style={{ width: 12, height: 12, backgroundColor: '#1F2937', borderRadius: 4 }} />
            <span className="text-sm text-gray-600">Total Spend (€)</span>
          </div>
          <div className="flex items-center gap-2">
            <div style={{ width: 12, height: 12, backgroundColor: '#C9C6F1', borderRadius: 4 }} />
            <span className="text-sm text-gray-600">Comparison</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}