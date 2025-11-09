'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface Stats {
  totalSpend: number
  totalInvoices: number
  documentsUploaded: number
  averageInvoiceValue: number
  // optional historical values for sparklines and dynamic percent
  totalSpendHistory?: number[]
  totalInvoicesHistory?: number[]
  documentsUploadedHistory?: number[]
  averageInvoiceValueHistory?: number[]
}

export function OverviewCards() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/stats')
      .then((res) => res.json())
      .then((data) => {
        // If API doesn't provide history, generate a small deterministic fallback
        const generateMockHistory = (final: number, points = 6) => {
          const base = final / points
          return Array.from({ length: points }).map((_, i) => {
            const factor = 0.6 + (i / (points - 1)) * 0.4 // 0.6 -> 1.0 trend
            return Number((base * factor).toFixed(2))
          })
        }

        if (!data.totalSpendHistory) data.totalSpendHistory = generateMockHistory(Number(data.totalSpend ?? 0))
        if (!data.totalInvoicesHistory) data.totalInvoicesHistory = generateMockHistory(Number(data.totalInvoices ?? 0)).map((v) => Math.round(v))
        if (!data.documentsUploadedHistory) data.documentsUploadedHistory = generateMockHistory(Number(data.documentsUploaded ?? 0)).map((v) => Math.round(v))
        if (!data.averageInvoiceValueHistory) data.averageInvoiceValueHistory = generateMockHistory(Number(data.averageInvoiceValue ?? 0))

        setStats(data)
        setLoading(false)
      })
      .catch((error) => {
        console.error('Error fetching stats:', error)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-white">
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) {
    return <div>Failed to load stats</div>
  }

  // Compute percentage change dynamically when previous value is available
  const computeChange = (history?: number[]) => {
    if (!history || history.length < 2) return { value: 0, isPositive: true }
    const prev = history[history.length - 2]
    const curr = history[history.length - 1]
    if (prev === 0) return { value: 0, isPositive: curr >= prev }
    const value = ((curr - prev) / Math.abs(prev)) * 100
    return { value: Number(value.toFixed(1)), isPositive: value >= 0 }
  }

  const changes = {
    totalSpend: computeChange(stats.totalSpendHistory),
    totalInvoices: computeChange(stats.totalInvoicesHistory),
    documentsUploaded: computeChange(stats.documentsUploadedHistory),
    averageInvoiceValue: computeChange(stats.averageInvoiceValueHistory),
  }

  const computeAbsChange = (history?: number[]) => {
    if (!history || history.length < 2) return 0
    const prev = history[history.length - 2]
    const curr = history[history.length - 1]
    return Number((curr - prev).toFixed(0))
  }

  const formatEuro = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  // Enhanced sparkline renderer: smooth cubic-bezier path, subtle area
  // and a thin line-only variant when `isFlat` is true.
  const Sparkline = ({
    values,
    colorStart = '#34D399',
    colorEnd = '#10B981',
    areaOpacityStart = 0.16,
    areaOpacityEnd = 0.02,
    isFlat = false,
  }: {
    values?: number[]
    colorStart?: string
    colorEnd?: string
    areaOpacityStart?: number
    areaOpacityEnd?: number
    isFlat?: boolean
  }) => {
    if (!values || values.length === 0) return null
    const w = 92
    const h = 30
    const max = Math.max(...values)
    const min = Math.min(...values)
    const len = values.length

    // compute points
    const pts = values.map((v, i) => {
      const x = len === 1 ? w / 2 : (i / (len - 1)) * (w - 4) + 2
      const y = max === min ? h / 2 : 4 + (1 - (v - min) / (max - min)) * (h - 8)
      return { x, y }
    })

    // helper: build a smooth cubic-bezier path from pts
    const buildSmoothPath = (points: { x: number; y: number }[]) => {
      if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
      if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`

      const smooth = 0.2 // tension
      let d = `M ${points[0].x} ${points[0].y}`
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i === 0 ? i : i - 1]
        const p1 = points[i]
        const p2 = points[i + 1]
        const p3 = points[i + 2 < points.length ? i + 2 : i + 1]

        // control point calculations
        const cp1x = p1.x + (p2.x - p0.x) * smooth
        const cp1y = p1.y + (p2.y - p0.y) * smooth
        const cp2x = p2.x - (p3.x - p1.x) * smooth
        const cp2y = p2.y - (p3.y - p1.y) * smooth

        d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
      }
      return d
    }

    const pathD = buildSmoothPath(pts)
    const last = pts[pts.length - 1]

    // area path mirrors the stroke and closes to baseline
    const areaD = `${pathD} L ${w - 2} ${h - 2} L 2 ${h - 2} Z`

    const uid = `s_${Math.random().toString(36).slice(2, 9)}`
    const gradId = `sparkGrad_${uid}`
    const areaId = `areaGrad_${uid}`
    const animName = `draw_${uid}`

    // Flat variant: thin muted line without area or endpoint highlight
    if (isFlat) {
      return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="ml-4 align-middle">
          <style>{`
            @keyframes ${animName} {
              from { stroke-dashoffset: 200; }
              to { stroke-dashoffset: 0; }
            }
          `}</style>
          <defs>
            <linearGradient id={gradId} x1="0" x2="1">
              <stop offset="0%" stopColor="#9CA3AF" />
              <stop offset="100%" stopColor="#6B7280" />
            </linearGradient>
          </defs>
          {/* baseline */}
          <line x1={2} y1={h - 4} x2={w - 2} y2={h - 4} stroke="#F3F4F6" strokeWidth={1} />
          <path d={pathD} fill="none" stroke={`url(#${gradId})`} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: 200, strokeDashoffset: 200, animation: `${animName} 700ms ease-out forwards` }} opacity={0.95} />
        </svg>
      )
    }

    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="ml-4 align-middle">
        <style>{`
          @keyframes ${animName} {
            from { stroke-dashoffset: 1000; }
            to { stroke-dashoffset: 0; }
          }
        `}</style>
        <defs>
          <linearGradient id={gradId} x1="0" x2="1">
            <stop offset="0%" stopColor={colorStart} />
            <stop offset="100%" stopColor={colorEnd} />
          </linearGradient>
          <linearGradient id={areaId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={colorEnd} stopOpacity={areaOpacityStart} />
            <stop offset="100%" stopColor={colorEnd} stopOpacity={areaOpacityEnd} />
          </linearGradient>
        </defs>

        {/* subtle baseline */}
        <line x1={2} y1={h - 4} x2={w - 2} y2={h - 4} stroke="#F3F4F6" strokeWidth={1} />

        {/* filled area */}
        <path d={areaD} fill={`url(#${areaId})`} opacity={0.95} />

        {/* main stroke */}
        <path d={pathD} fill="none" stroke={`url(#${gradId})`} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: 1000, strokeDashoffset: 1000, animation: `${animName} 900ms ease-out forwards` }} />

        {/* last point highlight */}
        <g>
          <circle cx={last.x} cy={last.y} r={5} fill={colorEnd} opacity={0.95} />
        </g>
        <circle cx={last.x} cy={last.y} r={3} fill="#fff" />
      </svg>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="bg-white border border-gray-200 shadow-sm rounded-lg">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-xs font-medium text-gray-600 uppercase">Total Spend</div>
            </div>
            <div className="text-xs text-gray-400 font-medium">(YTD)</div>
          </div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-3xl font-extrabold leading-tight">{formatEuro(stats.totalSpend)}</div>
            <Sparkline values={stats.totalSpendHistory} isFlat={changes.totalSpend.value === 0} />
          </div>
          <div className="flex items-center gap-3">
            {changes.totalSpend.value === 0 ? (
              <span className="inline-flex items-center gap-2 text-gray-600 font-medium bg-[#F3F4F6] border border-[#E5E7EB] px-2 py-0.5 rounded-md text-sm">0%</span>
            ) : changes.totalSpend.isPositive ? (
              <span className="inline-flex items-center gap-2 text-green-600 font-medium bg-[#E6F9F0] border border-[#D1F3DF] px-2 py-0.5 rounded-md text-sm">
                <TrendingUp size={14} />
                +{changes.totalSpend.value}%
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 text-red-600 font-medium bg-[#FEEAEA] border border-[#F6D6D6] px-2 py-0.5 rounded-md text-sm">
                <TrendingDown size={14} />
                {changes.totalSpend.value}%
              </span>
            )}
            <div className="text-xs text-gray-500">from last month</div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border border-gray-200 shadow-sm rounded-lg">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-xs font-medium text-gray-600 uppercase">Total Invoices Processed</div>
            </div>
            <div className="text-xs text-transparent">.</div>
          </div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-3xl font-extrabold leading-tight">{stats.totalInvoices}</div>
            <Sparkline values={stats.totalInvoicesHistory} isFlat={changes.totalInvoices.value === 0} />
          </div>
          <div className="flex items-center gap-3">
            {changes.totalInvoices.value === 0 ? (
              <span className="inline-flex items-center gap-2 text-gray-600 font-medium bg-[#F3F4F6] border border-[#E5E7EB] px-2 py-0.5 rounded-md text-sm">0%</span>
            ) : changes.totalInvoices.isPositive ? (
              <span className="inline-flex items-center gap-2 text-green-600 font-medium bg-[#E6F9F0] border border-[#D1F3DF] px-2 py-0.5 rounded-md text-sm">
                <TrendingUp size={14} />
                +{changes.totalInvoices.value}%
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 text-red-600 font-medium bg-[#FEEAEA] border border-[#F6D6D6] px-2 py-0.5 rounded-md text-sm">
                <TrendingDown size={14} />
                {changes.totalInvoices.value}%
              </span>
            )}
            <div className="text-xs text-gray-500">from last month</div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border border-gray-200 shadow-sm rounded-lg">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-3 gap-3">
            <div>
              <div className="text-xs font-medium text-gray-600 uppercase">Documents Uploaded</div>
            </div>
            <div className="text-xs text-gray-400 font-medium">This Month</div>
          </div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-3xl font-extrabold leading-tight">{stats.documentsUploaded}</div>
            <Sparkline
              values={stats.documentsUploadedHistory}
              colorStart={changes.documentsUploaded.isPositive ? '#34D399' : '#FCA5A5'}
              colorEnd={changes.documentsUploaded.isPositive ? '#10B981' : '#EF4444'}
              isFlat={changes.documentsUploaded.value === 0}
            />
          </div>
          <div className="flex items-center gap-3">
            {changes.documentsUploaded.value === 0 ? (
              <span className="inline-flex items-center gap-2 text-gray-600 font-medium bg-[#F3F4F6] border border-[#E5E7EB] px-2 py-0.5 rounded-md text-sm">0%</span>
            ) : changes.documentsUploaded.isPositive ? (
              <span className="inline-flex items-center gap-2 text-green-600 font-medium bg-[#E6F9F0] border border-[#D1F3DF] px-2 py-0.5 rounded-md text-sm">
                <TrendingUp size={14} />
                +{changes.documentsUploaded.value}%
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 text-red-600 font-medium bg-[#FEEAEA] border border-[#F6D6D6] px-2 py-0.5 rounded-md text-sm">
                <TrendingDown size={14} />
                {changes.documentsUploaded.value}%
              </span>
            )}
            <div className="text-xs text-gray-500">from last month</div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border border-gray-200 shadow-sm rounded-lg">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-xs font-medium text-gray-600 uppercase">Average Invoice Value</div>
            </div>
            <div className="text-xs text-transparent">.</div>
          </div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-3xl font-extrabold leading-tight">{formatEuro(stats.averageInvoiceValue)}</div>
            <Sparkline values={stats.averageInvoiceValueHistory} isFlat={changes.averageInvoiceValue.value === 0} />
          </div>
          <div className="flex items-center gap-3">
            {changes.averageInvoiceValue.value === 0 ? (
              <span className="inline-flex items-center gap-2 text-gray-600 font-medium bg-[#F3F4F6] border border-[#E5E7EB] px-2 py-0.5 rounded-md text-sm">0%</span>
            ) : changes.averageInvoiceValue.isPositive ? (
              <span className="inline-flex items-center gap-2 text-green-600 font-medium bg-[#E6F9F0] border border-[#D1F3DF] px-2 py-0.5 rounded-md text-sm">
                <TrendingUp size={14} />
                +{changes.averageInvoiceValue.value}%
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 text-red-600 font-medium bg-[#FEEAEA] border border-[#F6D6D6] px-2 py-0.5 rounded-md text-sm">
                <TrendingDown size={14} />
                {changes.averageInvoiceValue.value}%
              </span>
            )}
            <div className="text-xs text-gray-500">from last month</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

