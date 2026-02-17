'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
  number: number
  title: string
  description: string
}

interface StepIndicatorProps {
  steps: Step[]
  currentStep: number
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="relative">
      {/* Progress line */}
      <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-700">
        <motion.div
          className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
          initial={{ width: '0%' }}
          animate={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Steps */}
      <div className="relative flex justify-between">
        {steps.map((step) => {
          const isCompleted = currentStep > step.number
          const isCurrent = currentStep === step.number

          return (
            <div key={step.number} className="flex flex-col items-center">
              <motion.div
                initial={false}
                animate={{
                  scale: isCurrent ? 1.1 : 1,
                }}
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm relative z-10 transition-colors',
                  isCompleted
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                    : isCurrent
                    ? 'bg-purple-500 text-white'
                    : 'bg-slate-700 text-gray-400'
                )}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  step.number
                )}
              </motion.div>

              <div className="mt-3 text-center">
                <div
                  className={cn(
                    'text-sm font-medium',
                    isCurrent || isCompleted ? 'text-white' : 'text-gray-500'
                  )}
                >
                  {step.title}
                </div>
                <div className="text-xs text-gray-500 hidden sm:block">
                  {step.description}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
