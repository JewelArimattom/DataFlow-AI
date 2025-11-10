'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Send } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  sql?: string
  data?: any[]
  suggestions?: string[]
  id?: string
  createdAt?: string
}

export default function ChatWithDataPage() {
  const STORAGE_KEY = 'flowbit.chat-with-data.v1'

  // Start empty on the server to avoid hydration mismatches.
  // Load persisted messages on the client after mount.
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [restored, setRestored] = useState(false)

  // persist messages to localStorage (only after we've restored from storage)
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      if (!restored) return
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    } catch (e) {
      // ignore
    }
  }, [messages, restored])

  // Load persisted messages on client after mount to avoid SSR hydration mismatch
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) setMessages(parsed)
    } catch (e) {
      // ignore
    } finally {
      // indicate we've finished attempting to restore (prevents initial overwrite)
      setRestored(true)
    }
  }, [])

  const handleSend = async (overrideQuestion?: string) => {
    const questionText = overrideQuestion ?? input.trim()
    if (!questionText || loading) return

    const userMessage: Message = {
      role: 'user',
      content: questionText,
      id: `u-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      createdAt: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    // clear input only when user typed it (not when using suggestion)
    if (!overrideQuestion) setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/chat-with-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: questionText }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Error from backend - display it as an assistant error message
        const errorMsg = data.error || 'Failed to process query'
        const errorDetails = data.details || ''
        
        // Create a friendly error message
        let friendlyError = errorMsg
        
        // If it's a Vanna service error, extract the friendly part
        if (errorMsg.includes('Vanna AI service error:')) {
          friendlyError = errorMsg.replace('Vanna AI service error:', '').trim()
        }
        
        const errorMessage: Message = {
          role: 'assistant',
          content: `❌ **Oops!** ${friendlyError}${errorDetails ? `\n\n💡 **Tip:** ${errorDetails}` : ''}`,
          id: `a-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
          createdAt: new Date().toISOString(),
          suggestions: [
            'Show me total spend this year',
            'List all tables available',
            'Show recent invoices',
          ],
        }
        
        setMessages((prev) => [...prev, errorMessage])
        setLoading(false)
        return
      }

      // Build a richer assistant message: prefer backend `message` when available
      const backendMessage = data.message || null
      let assistantContent = backendMessage || 'Results found'

      // If we have tabular data, compute simple numeric totals and suggestions
      const rows: any[] = data.data || []
      let suggestionList: string[] = []
      if (rows.length > 0) {
        const cols = Object.keys(rows[0])

        // compute totals for numeric-like columns
        const numericSums: Record<string, number> = {}
        for (const col of cols) {
          let sum = 0
          let countNumeric = 0
          for (const r of rows) {
            const v = r[col]
            const n = typeof v === 'number' ? v : (typeof v === 'string' && v !== '' && !isNaN(Number(v)) ? Number(v) : NaN)
            if (!isNaN(n)) {
              sum += n
              countNumeric++
            }
          }
          if (countNumeric > 0) numericSums[col] = sum
        }

        // Format totals summary
        const totalsParts: string[] = []
        const nf = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
        for (const [k, v] of Object.entries(numericSums)) {
          totalsParts.push(`${k}: ${nf.format(v)}`)
        }
        if (totalsParts.length) {
          assistantContent += '\n\nTotals: ' + totalsParts.join(', ')
        }

        // Suggested follow-ups based on columns (smarter heuristics)
        const suggestions: string[] = []
        const lowerCols = cols.map((c) => c.toLowerCase())
        if (lowerCols.some((c) => c.includes('vendor'))) suggestions.push('Show totals grouped by vendor')
        if (lowerCols.some((c) => c.includes('date') || c.includes('month') || c.includes('year'))) suggestions.push('Plot this over time (monthly totals)')

        // Detect aggregate-like columns (avg/average/sum/total/count/min/max)
        const aggKeywords = ['avg', 'average', 'mean', 'sum', 'total', 'count', 'min', 'max', 'median']
        const aggregateCols = lowerCols.filter((c) => aggKeywords.some((k) => c.includes(k)))

        const numericCols = Object.keys(numericSums)

        if (aggregateCols.length > 0 && cols.length === aggregateCols.length) {
          // All returned columns look like aggregates — suggest drilling into contributors
          if (aggregateCols.some((c) => c.includes('avg') || c.includes('average') || c.includes('mean'))) {
            suggestions.push('Show raw invoice rows that form this average')
            suggestions.push('Show top 10 invoices by amount')
            suggestions.push('Also compute count of invoices and total sum')
          } else if (aggregateCols.some((c) => c.includes('sum') || c.includes('total'))) {
            suggestions.push('Break down this total by vendor')
            suggestions.push('Break down this total by month')
            suggestions.push('Show top 10 contributors to this total')
          } else {
            suggestions.push('Show underlying data rows for more detail')
          }
        } else {
          if (numericCols.length > 0) {
            suggestions.push('Show top 10 rows by amount')
            if (!aggregateCols.some((c) => c.includes('avg') || c.includes('average') || c.includes('mean'))) {
              suggestions.push('Compute averages for numeric columns')
            }
          }
        }

        suggestionList = suggestions
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: assistantContent,
        sql: data.sql,
        data: data.data || [],
        suggestions: suggestionList,
        id: `a-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        createdAt: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error: any) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${error.message}`,
        id: `e-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  return (
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardContent className="space-y-4">
            <div className="space-y-4 h-[600px] overflow-y-auto border rounded p-4 bg-white">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-12">
                  <p className="font-semibold mb-4">Ask a question about your data</p>
                  <p className="text-sm mb-6">Examples:</p>
                  <ul className="text-sm space-y-2 inline-block text-left">
                    <li>• What&apos;s the total spend this month?</li>
                    <li>• Show me invoices over $1000</li>
                    <li>• Which vendor has the most invoices?</li>
                    <li>• What&apos;s the average invoice value?</li>
                    <li>• List pending invoices</li>
                  </ul>
                </div>
              )}
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                    {message.data && message.data.length > 0 && (
                      <div className="mt-3 overflow-x-auto">
                        <Table className="text-xs">
                          <TableHeader>
                            <TableRow>
                              {Object.keys(message.data[0]).map((key) => (
                                <TableHead key={key} className="text-xs">{key}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {message.data.slice(0, 5).map((row, i) => (
                              <TableRow key={i}>
                                {Object.values(row).map((value, j) => (
                                  <TableCell key={j} className="text-xs py-1">
                                    {String(value).substring(0, 30)}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {message.data.length > 5 && (
                          <p className="text-xs mt-1 text-muted-foreground">
                            +{message.data.length - 5} more results
                          </p>
                        )}
                      </div>
                    )}
                    {/* Suggestion buttons */}
                    {message.role === 'assistant' && message.suggestions && message.suggestions.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.suggestions.map((s, i) => (
                          <Button
                            key={i}
                            size="sm"
                            variant="secondary"
                            className="text-xs"
                            onClick={() => handleSend(s)}
                          >
                            {s}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3">
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Textarea
                placeholder="Ask a question about your data..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                rows={3}
              />
              <Button onClick={() => handleSend()} disabled={loading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
        {/* Context panel */}
        <Card>
          <CardHeader>
            <CardTitle>Context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {/* Latest assistant SQL */}
            {(() => {
              const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant')
              if (!lastAssistant) return (
                <p className="text-muted-foreground">Ask a question to see generated SQL and quick actions.</p>
              )
              return (
                <div className="space-y-2">
                  {lastAssistant.sql && (
                    <div>
                      <p className="font-semibold mb-1">Generated SQL</p>
                      <pre className="bg-muted p-2 rounded text-xs overflow-x-auto whitespace-pre-wrap break-words">
                        {lastAssistant.sql}
                      </pre>
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => navigator.clipboard.writeText(lastAssistant.sql || '')}
                        >
                          Copy SQL
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={async () => {
                            try {
                              // Attempt to re-run the original user question to fetch the full result set
                              const lastUser = [...messages].reverse().find(m => m.role === 'user')
                              const question = lastUser ? lastUser.content : undefined
                              let rows = lastAssistant.data || []

                              if (question) {
                                // call our API to retrieve the full data for the same question
                                const resp = await fetch('/api/chat-with-data', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ question, fetchAll: true }),
                                })
                                if (resp.ok) {
                                  const payload = await resp.json()
                                  rows = payload.data || rows
                                }
                              }

                              if (!rows || !rows.length) return
                              const cols = Object.keys(rows[0])
                              const csv = [
                                cols.join(','),
                                ...rows.map((r: any) => cols.map(c => JSON.stringify(r[c] ?? '')).join(',')),
                              ].join('\n')
                              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                              const url = URL.createObjectURL(blob)
                              const a = document.createElement('a')
                              a.href = url
                              a.download = 'results.csv'
                              a.click()
                              URL.revokeObjectURL(url)
                            } catch (e) {
                              // ignore
                            }
                          }}
                        >
                          Download CSV
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs ml-auto"
                          onClick={() => {
                            setMessages([])
                            try { if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY) } catch (e) {}
                          }}
                        >
                          Clear history
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Quick re-run with SQL as prompt if needed */}
                  {lastAssistant.sql && (
                    <div>
                      <p className="font-semibold mb-1">Actions</p>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" className="text-xs" onClick={() => handleSend('Explain this SQL in plain language')}>Explain SQL</Button>
                        <Button size="sm" className="text-xs" variant="secondary" onClick={() => handleSend('Visualize this as a time series chart')}>Visualize as time series</Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </CardContent>
        </Card>
      </div>
  )
}

