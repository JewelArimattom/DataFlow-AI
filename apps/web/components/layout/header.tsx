'use client'

import { MoreVertical, User } from 'lucide-react'
import { usePathname } from 'next/navigation'

export function Header() {
  const pathname = usePathname() || ''

  // derive a friendly title from the pathname
  let title = 'Dashboard'
  if (pathname.includes('chat-with-data')) title = 'Chat with Data'
  else if (pathname.includes('dashboard')) title = 'Dashboard'
  else if (pathname.includes('invoices')) title = 'Invoices'
  else if (pathname.includes('vendors')) title = 'Vendors'

  return (
    <div className="flex h-16 items-center justify-between border-b bg-white px-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
            <User className="h-5 w-5 text-gray-600" />
          </div>
          <div className="text-right">
            <div className="text-sm font-medium">Admin  </div>
            <div className="text-xs text-gray-500">Admin</div>
          </div>
          <button className="text-gray-400 hover:text-gray-600">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

