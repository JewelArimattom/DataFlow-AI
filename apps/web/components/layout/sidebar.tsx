'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, MessageSquare, FileText, Folder, Users, User, Settings, ChevronDown } from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Invoice', href: '/invoice', icon: FileText },
  { name: 'Other files', href: '/files', icon: Folder },
  { name: 'Departments', href: '/departments', icon: Users },
  { name: 'Users', href: '/users', icon: User },
  { name: 'Settings', href: '/settings', icon: Settings },
]

const aiNavigation = [
  { name: 'Chat with Data', href: '/chat-with-data', icon: MessageSquare },
]

export function Sidebar() {
  const pathname = usePathname()
  return (
    <div className="flex h-screen w-56 flex-col border-r bg-white text-[#1a1a1a]">
      <div className="border-b border-[#f1f2f6] px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-[#1d042b]">
            <span className="text-sm font-bold text-white">FL</span>
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-[#111827]">FLOWBIT</div>
            <div className="flex items-center gap-1 text-xs text-[#6b7280]">
              <span>12 members</span>
              <ChevronDown className="h-3 w-3 text-[#6b7280]" />
            </div>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[#9ca3af]">General</div>
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-blue-50'
                  : 'hover:bg-gray-100'
              )}
            >
              <div className={cn('flex h-8 w-8 items-center justify-center rounded-md', isActive ? 'bg-[#2a053f]' : 'bg-transparent')}>
                <item.icon className={cn('h-4 w-4', isActive ? 'text-white' : 'text-gray-500')} />
              </div>
              <span className={cn('ml-1', isActive ? 'text-purple-800 font-semibold' : 'text-gray-600')}>{item.name}</span>
            </Link>
          )
        })}
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider mt-4 text-[#7c8493]">AI Features</div>
        {aiNavigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive ? 'bg-purple-50' : 'hover:bg-gray-100'
              )}
            >
              <div className={cn('flex h-8 w-8 items-center justify-center rounded-md', isActive ? 'bg-purple-800' : 'bg-transparent')}>
                <item.icon className={cn('h-4 w-4', isActive ? 'text-white' : 'text-gray-500')} />
              </div>
              <span className={cn('ml-1', isActive ? 'text-purple-800 font-semibold' : 'text-gray-600')}>{item.name}</span>
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-[#e6eaf2] px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-gray-200">
            <span className="text-xs font-bold text-gray-700">F</span>
          </div>
          <span className="text-sm font-semibold text-gray-700">Flowbit AI</span>
        </div>
      </div>
    </div>
  )
}