'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'

interface CategoryData {
  category: string
  total: number
}

const COLORS = [
  '#2563eb', // blue
  '#f97316', // orange
  '#fbbf24', // yellow/peach
]

export function CategoryChart() {
  const [data, setData] = useState<CategoryData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/category-spend')
      .then((res) => res.json())
      .then((response) => {
        if (Array.isArray(response)) {
          setData(response)
        } else {
          console.error('Category API returned unexpected format:', response)
          setData([])
        }
        setLoading(false)
      })
      .catch((error) => {
        console.error('Error fetching categories:', error)
        setData([])
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spend by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[240px] w-full" />
        </CardContent>
      </Card>
    )
  }

  // Use shared USD formatter from utils for display in legend/tooltip
  // (formatCurrency already imported above)

  // Map category codes (if any) to friendly display names.
  // Example: some data sources use numeric category codes like '4400' and '3400'.
  const displayNameMap: Record<string, string> = {
    '4400': 'Operations',
    '3400': 'Marketing',
  }

  const chartData = data.map((item) => ({
    // use friendly name when available, otherwise fall back to raw category
    name: displayNameMap[item.category] ?? item.category,
    // use the actual total from the API
    value: Number(item.total),
  }))

  const total = chartData.reduce((sum, item) => sum + item.value, 0)

  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Spend by Category</CardTitle>
        <p className="text-xs text-gray-500 mt-1">Distribution of spending across different categories.</p>
      </CardHeader>
      <CardContent>
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
            {/* subtle outer gray ring behind the colored donut */}
            <Pie
              data={[{ name: 'bg', value: total }]}
              cx="50%"
              cy="50%"
              innerRadius={82}
              outerRadius={96}
              paddingAngle={0}
              dataKey="value"
              isAnimationActive={false}
              startAngle={90}
              endAngle={-270}
            >
              <Cell key="bg" fill="#f1f5f9" />
            </Pie>

            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={0}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: any) => formatCurrency(Number(value))}
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid rgba(15, 23, 42, 0.06)',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#0f172a',
                padding: '8px 10px',
              }}
            />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 space-y-2">
          {chartData.map((item, index) => (
            <div key={index} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-gray-700">{item.name}</span>
              </div>
              <span className="font-semibold text-gray-900">{formatCurrency(Number(item.value))}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default CategoryChart;

