'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StepIndicator } from '@/components/generate/StepIndicator'
import { Step1BasicInfo } from '@/components/generate/Step1BasicInfo'
import { Step2FileUploads } from '@/components/generate/Step2FileUploads'
import { Step3Configuration } from '@/components/generate/Step3Configuration'
import { Step4Review } from '@/components/generate/Step4Review'
import { useGenerateSpecification } from '@/hooks/useProjects'
import { useRouter } from 'next/navigation'
import { GenerationConfig } from '@/types'
import axios from 'axios'

const steps = [
  { number: 1, title: 'Basic Info', description: 'Field and topic' },
  { number: 2, title: 'Files', description: 'Upload documents' },
  { number: 3, title: 'Configuration', description: 'Settings' },
  { number: 4, title: 'Review', description: 'Confirm & submit' },
]

export default function GeneratePage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [formData, setFormData] = useState<Partial<GenerationConfig>>({
    academic_level: 'MSc',
    effort_level: 'medium',
    past_projects_mode: 'hybrid',
    max_iterations: 3,
    num_web_searches: 5,
  })

  const [files, setFiles] = useState<{
    guidelines?: File
    pastProjects: File[]
  }>({
    pastProjects: [],
  })

  const { mutateAsync: generateSpec, isPending } = useGenerateSpecification()

  const updateFormData = (data: Partial<GenerationConfig>) => {
    setFormData(prev => ({ ...prev, ...data }))
  }

  const updateFiles = (newFiles: Partial<typeof files>) => {
    setFiles(prev => ({ ...prev, ...newFiles }))
  }

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleSubmit = async () => {
    setSubmitError(null)

    try {
      const apiFormData = new FormData()
      apiFormData.append('config_json', JSON.stringify(formData))

      if (files.guidelines) {
        apiFormData.append('guidelines_file', files.guidelines)
      }

      files.pastProjects.forEach(file => {
        apiFormData.append('past_project_files', file)
      })

      const result = await generateSpec(apiFormData)

      // ✅ FIXED: redirect to the SPECIFIC project page so the user can
      //    watch the live progress tracker instead of the generic list.
      router.push(`/dashboard/projects/${result.project_id}`)

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.detail
        setSubmitError(
          typeof detail === 'string'
            ? detail
            : `Server error ${error.response?.status ?? ''}`
        )
        console.error('Generation failed:', error.response?.status, error.response?.data)
      } else {
        setSubmitError('An unexpected error occurred. Please try again.')
        console.error('Generation failed:', error)
      }
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1: return !!(formData.field_of_study && formData.academic_level)
      case 2: return !!files.guidelines
      case 3: return true
      case 4: return true
      default: return false
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">
          Generate New Specification
        </h1>
        <p className="text-gray-400">
          Follow the steps to create your research specification
        </p>
      </div>

      {/* Step Indicator */}
      <div className="mb-8">
        <StepIndicator steps={steps} currentStep={currentStep} />
      </div>

      {/* Error banner */}
      {submitError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4"
        >
          <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-red-300 text-sm">{submitError}</p>
        </motion.div>
      )}

      {/* Form Steps */}
      <Card className="mb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {currentStep === 1 && (
              <Step1BasicInfo formData={formData} updateFormData={updateFormData} />
            )}
            {currentStep === 2 && (
              <Step2FileUploads files={files} updateFiles={updateFiles} />
            )}
            {currentStep === 3 && (
              <Step3Configuration formData={formData} updateFormData={updateFormData} />
            )}
            {currentStep === 4 && (
              <Step4Review formData={formData} files={files} />
            )}
          </motion.div>
        </AnimatePresence>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={currentStep === 1 || isPending}
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </Button>

        {currentStep < steps.length ? (
          <Button onClick={handleNext} disabled={!canProceed()}>
            Next
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!canProceed() || isPending}
            isLoading={isPending}
          >
            <Check className="w-5 h-5 mr-2" />
            {isPending ? 'Starting generation...' : 'Generate Specification'}
          </Button>
        )}
      </div>
    </div>
  )
}