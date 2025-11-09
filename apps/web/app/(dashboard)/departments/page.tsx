'use client'

import { ComingSoon } from '@/components/ui/coming-soon'
import { Users, Zap } from 'lucide-react'

export default function DepartmentsPage() {
  return (
    <ComingSoon
      title="Department Management"
      description="Organize teams and manage departments with roles, permissions, and resource allocation."
      icon={<Users className="w-10 h-10" />}
      features={[
        'Create and manage departments',
        'Assign team members',
        'Set department budgets',
        'Track expenses by department',
        'Reporting and analytics',
      ]}
    />
  )
}
