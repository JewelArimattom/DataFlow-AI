import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const vannaBase = process.env.VANNA_API_BASE_URL || process.env.VANNA_API_BASE || process.env.NEXT_PUBLIC_VANNA_API_BASE || ''

  if (!vannaBase) {
    return NextResponse.json({ ok: false, error: 'VANNA_API_BASE_URL not configured in environment' }, { status: 500 })
  }

  const url = new URL('/health', vannaBase).toString()

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  const start = Date.now()

  try {
    const res = await fetch(url, { method: 'GET', signal: controller.signal })
    clearTimeout(timeout)
    const elapsed = Date.now() - start
    let text = null
    try {
      text = await res.text()
    } catch (e) {
      text = `<failed to read body: ${String(e)}>`
    }

    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      elapsed_ms: elapsed,
      url,
      body: typeof text === 'string' ? text.substring(0, 2000) : null,
    })
  } catch (error: any) {
    clearTimeout(timeout)
    const elapsed = Date.now() - start
    return NextResponse.json({ ok: false, error: String(error), elapsed_ms: elapsed, url }, { status: 500 })
  }
}
