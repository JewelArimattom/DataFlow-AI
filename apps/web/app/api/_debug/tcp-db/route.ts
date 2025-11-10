import { NextResponse } from 'next/server'
import net from 'net'
import dns from 'dns'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function parseDbHostPort(url: string | undefined) {
  if (!url) return null
  try {
    const u = new URL(url)
    return { host: u.hostname, port: Number(u.port || 5432) }
  } catch {
    return null
  }
}

export async function GET() {
  const target = parseDbHostPort(process.env.DATABASE_URL)
  if (!target) {
    return NextResponse.json({ ok: false, error: 'DATABASE_URL missing or invalid' }, { status: 500 })
  }

  const { host, port } = target
  const start = Date.now()
  const dnsInfo: any = {}

  try {
    dnsInfo.lookup = await new Promise((resolve, reject) => {
      dns.lookup(host, (err, address, family) => {
        if (err) reject(err)
        else resolve({ address, family })
      })
    })
  } catch (e) {
    dnsInfo.lookupError = String(e)
  }

  const connectResult: any = { host, port }
  await new Promise<void>((resolve) => {
    const socket = new net.Socket()
    let settled = false
    socket.setTimeout(5000)
    socket.once('error', (err) => {
      if (settled) return
      settled = true
      connectResult.error = String(err.message || err)
      connectResult.code = (err as any).code
      socket.destroy()
      resolve()
    })
    socket.once('timeout', () => {
      if (settled) return
      settled = true
      connectResult.error = 'timeout'
      socket.destroy()
      resolve()
    })
    socket.connect(port, host, () => {
      if (settled) return
      settled = true
      connectResult.connected = true
      socket.end()
      resolve()
    })
  })
  connectResult.elapsedMs = Date.now() - start

  // Optional Prisma direct probe for contrast
  let prismaProbe: any = {}
  try {
    await prisma.$queryRaw`SELECT 1 AS test`
    prismaProbe.ok = true
  } catch (e: any) {
    prismaProbe.ok = false
    prismaProbe.error = e?.message
    prismaProbe.name = e?.name
    prismaProbe.code = e?.code
  }

  return NextResponse.json({
    status: 'ok',
    dns: dnsInfo,
    tcp: connectResult,
    prismaProbe,
  })
}
