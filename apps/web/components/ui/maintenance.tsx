'use client'

import { useEffect, useState } from 'react'
import { Wrench, CheckCircle2, Clock } from 'lucide-react'

interface MaintenanceProps {
  title?: string
  description?: string
  estimatedTime?: string
  status?: 'maintenance' | 'update' | 'upgrade'
}

export function Maintenance({
  title = 'Under Maintenance',
  description = 'We are performing scheduled maintenance to improve your experience.',
  estimatedTime = 'Expected to complete in 2 hours',
  status = 'maintenance',
}: MaintenanceProps) {
  const [mounted, setMounted] = useState(false)
  const [dots, setDots] = useState('')

  useEffect(() => {
    setMounted(true)
    const interval = setInterval(() => {
      setDots((prev) => (prev.length < 3 ? prev + '.' : ''))
    }, 500)
    return () => clearInterval(interval)
  }, [])

  if (!mounted) return null

  const statusConfig = {
    maintenance: {
      icon: Wrench,
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-50',
      badgeColor: 'bg-orange-100 text-orange-800',
      text: 'Maintenance in Progress',
    },
    update: {
      icon: CheckCircle2,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50',
      badgeColor: 'bg-blue-100 text-blue-800',
      text: 'System Update',
    },
    upgrade: {
      icon: Clock,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50',
      badgeColor: 'bg-purple-100 text-purple-800',
      text: 'System Upgrade',
    },
  }

  const config = statusConfig[status]
  const IconComponent = config.icon

  return (
    <div className={`flex-1 flex items-center justify-center min-h-screen ${config.bgColor} p-6`}>
      <div className="w-full max-w-md">
        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
          {/* Animated Icon */}
          <div className="mb-8 flex justify-center">
            <div className="relative w-32 h-32">
              {/* Rotating background circle */}
              <div
                className={`absolute inset-0 rounded-full bg-gradient-to-r ${config.color} opacity-20`}
                style={{
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                }}
              />

              {/* Icon container with animation */}
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  animation: 'bounce 1s ease-in-out infinite',
                }}
              >
                <div className={`text-4xl bg-gradient-to-r ${config.color} bg-clip-text text-transparent`}>
                  <IconComponent className="w-16 h-16 text-orange-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className={`inline-block ${config.badgeColor} px-4 py-1.5 rounded-full text-sm font-semibold mb-6 animate-pulse`}>
            {config.text}
          </div>

          {/* Content */}
          <h1 className="text-3xl font-bold text-slate-900 mb-3">
            {title}
          </h1>

          <p className="text-slate-600 text-base mb-6">
            {description}
          </p>

          {/* Progress animation */}
          <div className="mb-8 space-y-3">
            <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
              <span className="inline-block">Processing{dots}</span>
            </div>
            <div className="relative h-1 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${config.color} rounded-full`}
                style={{
                  animation: 'shimmer 2s infinite',
                  backgroundSize: '200% 100%',
                }}
              />
            </div>
          </div>

          {/* Time Estimate */}
          <div className="bg-slate-50 rounded-lg p-4 mb-8 flex items-center justify-center gap-2">
            <Clock className="w-5 h-5 text-slate-600" />
            <span className="text-sm text-slate-600">{estimatedTime}</span>
          </div>

          {/* Steps indicator */}
          <div className="space-y-2 text-left">
            {[
              'Optimizing database',
              'Updating systems',
              'Testing features',
            ].map((step, index) => (
              <div key={index} className="flex items-center gap-3">
                <div
                  className="w-2 h-2 rounded-full bg-slate-300"
                  style={{
                    animation: `fadeInScale 0.5s ease-out ${index * 200}ms forwards`,
                  }}
                />
                <span className="text-sm text-slate-600">{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Floating particles */}
        <div className="mt-8 flex justify-center gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-slate-400 opacity-50"
              style={{
                animation: `float 4s ease-in-out infinite`,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            backgroundPosition: 200% 0;
          }
          100% {
            backgroundPosition: -200% 0;
          }
        }

        @keyframes bounce {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes pulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  )
}
