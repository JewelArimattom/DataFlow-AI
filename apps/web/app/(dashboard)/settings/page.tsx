'use client'

import { ComingSoon } from '@/components/ui/coming-soon'
import { Settings, Zap } from 'lucide-react'

export default function SettingsPage() {
  return (
    <ComingSoon
      title="Settings"
      description="Configure your preferences, security settings, and customize your experience."
      icon={<Settings className="w-10 h-10" />}
      features={[
        'Account preferences',
        'Security settings',
        'Notification management',
        'Integration settings',
        'System configuration',
      ]}
    />
  )
}
