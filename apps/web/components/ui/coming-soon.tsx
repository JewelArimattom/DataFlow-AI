'use client'

import { useEffect, useState } from 'react'
import { LockIcon, Zap } from 'lucide-react'

interface ComingSoonProps {
  title?: string
  description?: string
  icon?: React.ReactNode
  features?: string[]
}

export function ComingSoon({
  title = 'Coming Soon',
  description = 'This feature is currently under development and will be available soon.',
  icon,
  features = ['Enhanced functionality', 'Improved performance', 'Better user experience'],
}: ComingSoonProps) {
  const [mounted, setMounted] = useState(false)
  const [animationPhase, setAnimationPhase] = useState(0)

  useEffect(() => {
    setMounted(true)
    const interval = setInterval(() => {
      setAnimationPhase((prev) => (prev + 1) % 4)
    }, 600)
    return () => clearInterval(interval)
  }, [])

  if (!mounted) return null

  return (
    <div className="flex-1 flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="w-full max-w-md">
        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center animate-in fade-in duration-700">
          {/* Animated Icon */}
          <div className="mb-8 flex justify-center">
            <div className="relative w-24 h-24">
              {/* Outer rotating ring */}
              <div
                className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 border-r-purple-500"
                style={{
                  animation: 'spin 3s linear infinite',
                }}
              />
              
              {/* Middle pulsing ring */}
              <div
                className="absolute inset-2 rounded-full border-2 border-purple-200"
                style={{
                  animation: 'pulse 2s ease-in-out infinite',
                }}
              />
              
              {/* Inner icon container */}
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 rounded-full shadow-inner">
                <div className="text-purple-600 animate-bounce" style={{ animationDuration: '2s' }}>
                  {icon || <Zap className="w-10 h-10" />}
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <h1 className="text-3xl font-bold text-slate-900 mb-3 animate-in fade-in slide-in-from-top duration-700 delay-100">
            {title}
          </h1>
          
          <p className="text-slate-600 text-base mb-8 animate-in fade-in slide-in-from-top duration-700 delay-200">
            {description}
          </p>

          {/* Progress indicator */}
          <div className="mb-8">
            <p className="text-sm text-slate-500 mb-3 font-medium">Development Progress</p>
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-1000"
                style={{
                  width: `${60 + (animationPhase * 10) % 30}%`,
                }}
              />
            </div>
          </div>

          {/* Features list */}
          <div className="bg-slate-50 rounded-lg p-6 mb-8 text-left">
            <p className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-600" />
              What&apos;s Coming
            </p>
            <ul className="space-y-3">
              {features.map((feature, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 text-sm text-slate-600 animate-in fade-in slide-in-from-left duration-700"
                  style={{ transitionDelay: `${300 + index * 100}ms` }}
                >
                  <div
                    className="flex-shrink-0 mt-1.5"
                    style={{
                      animation: `fadeInScale 0.5s ease-out ${300 + index * 100}ms forwards`,
                      opacity: 0,
                    }}
                  >
                    <div className="w-2 h-2 rounded-full bg-purple-600" />
                  </div>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Status badge */}
          <div className="flex items-center justify-center gap-2 text-sm text-slate-600 bg-slate-100 rounded-lg py-3 px-4">
            <LockIcon className="w-4 h-4 text-purple-600" />
            <span>Stay tuned for updates</span>
          </div>
        </div>

        {/* Floating elements for depth */}
        <div className="mt-8 flex justify-center gap-4">
          <div
            className="w-3 h-3 rounded-full bg-purple-300 opacity-50"
            style={{
              animation: 'float 4s ease-in-out infinite',
            }}
          />
          <div
            className="w-3 h-3 rounded-full bg-blue-300 opacity-50"
            style={{
              animation: 'float 5s ease-in-out infinite',
              animationDelay: '0.5s',
            }}
          />
          <div
            className="w-3 h-3 rounded-full bg-purple-300 opacity-50"
            style={{
              animation: 'float 6s ease-in-out infinite',
              animationDelay: '1s',
            }}
          />
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
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
