'use client'

import { ComingSoon } from '@/components/ui/coming-soon'
import { FileText, Zap } from 'lucide-react'

export default function InvoicePage() {
  return (
    <ComingSoon
      title="Invoice Management"
      description="Manage and track all your invoices in one place with advanced filtering and analytics."
      icon={<FileText className="w-10 h-10" />}
      features={[
        'Create and manage invoices',
        'Track payment status',
        'Generate reports',
        'Export to PDF/Excel',
        'Automated reminders',
      ]}
    />
  )
}
