'use client'

import { ComingSoon } from '@/components/ui/coming-soon'
import { User, Zap } from 'lucide-react'

export default function UsersPage() {
  return (
    <ComingSoon
      title="User Management"
      description="Manage team members, set permissions, and control user access across the platform."
      icon={<User className="w-10 h-10" />}
      features={[
        'Add and manage users',
        'Set user permissions',
        'Manage user roles',
        'Activity tracking',
        'Security and access control',
      ]}
    />
  )
}
