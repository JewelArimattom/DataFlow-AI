'use client'

import { ComingSoon } from '@/components/ui/coming-soon'
import { Folder, Zap } from 'lucide-react'

export default function FilesPage() {
  return (
    <ComingSoon
      title="File Management"
      description="Store, organize, and manage all your business files securely in one location."
      icon={<Folder className="w-10 h-10" />}
      features={[
        'Upload and organize files',
        'Advanced search functionality',
        'File versioning and history',
        'Secure sharing options',
        'Access controls and permissions',
      ]}
    />
  )
}
