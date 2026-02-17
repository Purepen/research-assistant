'use client'

import { motion } from 'framer-motion'
import { Clock, Brain, FileText, CheckCircle } from 'lucide-react'
import { Card } from '@/components/ui/Card'

interface ProgressTrackerProps {
  status: string
  progress: number
  currentPhase: string
}

const phases = [
  { key: 'parsing', label: 'Parsing Guidelines', icon: FileText },
  { key: 'generating', label: 'Generating Specification', icon: Brain },
  { key: 'reviewing', label: 'Professor Review', icon: CheckCircle },
]

export function ProgressTracker({ status, progress, currentPhase }: ProgressTrackerProps) {
  return (
    <Card className="mb-8">
      <div className="space-y-6">
        {/* Title */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Generation in Progress
            </h2>
            <p className="text-gray-400">{currentPhase}</p>
          </div>
          <div className="flex items-center gap-3 text-purple-400">
            <Clock className="w-5 h-5 animate-pulse" />
            <span className="text-lg font-bold">{progress}%</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative">
          <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Phase Steps */}
        <div className="grid grid-cols-3 gap-4">
          {phases.map((phase, index) => {
            const isActive = currentPhase.toLowerCase().includes(phase.key)
            const isComplete = progress > (index + 1) * 33

            return (
              <motion.div
                key={phase.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-xl border ${
                  isActive
                    ? 'bg-purple-500/10 border-purple-500/30'
                    : isComplete
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-slate-800 border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      isActive
                        ? 'bg-purple-500/20'
                        : isComplete
                        ? 'bg-green-500/20'
                        : 'bg-slate-700'
                    }`}
                  >
                    <phase.icon
                      className={`w-5 h-5 ${
                        isActive
                          ? 'text-purple-400 animate-pulse'
                          : isComplete
                          ? 'text-green-400'
                          : 'text-gray-500'
                      }`}
                    />
                  </div>
                  <div>
                    <div
                      className={`text-sm font-medium ${
                        isActive || isComplete ? 'text-white' : 'text-gray-500'
                      }`}
                    >
                      {phase.label}
                    </div>
                    {isActive && (
                      <div className="text-xs text-purple-400 mt-1">In progress...</div>
                    )}
                    {isComplete && (
                      <div className="text-xs text-green-400 mt-1">Complete</div>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Info */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <p className="text-sm text-blue-300">
            ⏱️ This usually takes 8-12 minutes. You can safely leave this page - we'll email you when it's ready!
          </p>
        </div>
      </div>
    </Card>
  )
}
