'use client'

import { GenerationConfig } from '@/types'
import { FileText, Settings, Upload } from 'lucide-react'
import { formatFileSize } from '@/lib/utils'

interface Step4Props {
  formData: Partial<GenerationConfig>
  files: {
    guidelines?: File
    pastProjects: File[]
  }
}

export function Step4Review({ formData, files }: Step4Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Review & Submit
        </h2>
        <p className="text-gray-400">
          Please review your configuration before generating
        </p>
      </div>

      {/* Basic Info Section */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-bold text-white">Basic Information</h3>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-400">Field of Study:</span>
            <span className="text-white font-medium">{formData.field_of_study}</span>
          </div>
          
          {formData.research_topic && (
            <div className="flex justify-between">
              <span className="text-gray-400">Research Topic:</span>
              <span className="text-white font-medium">{formData.research_topic}</span>
            </div>
          )}
          
          <div className="flex justify-between">
            <span className="text-gray-400">Academic Level:</span>
            <span className="text-white font-medium">{formData.academic_level}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-400">Effort Level:</span>
            <span className="text-white font-medium capitalize">{formData.effort_level}</span>
          </div>
          
          {formData.notification_email && (
            <div className="flex justify-between">
              <span className="text-gray-400">Email:</span>
              <span className="text-white font-medium">{formData.notification_email}</span>
            </div>
          )}
        </div>
      </div>

      {/* Files Section */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <Upload className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-bold text-white">Uploaded Files</h3>
        </div>
        
        <div className="space-y-3">
          {files.guidelines && (
            <div>
              <span className="text-gray-400 text-sm">Guidelines:</span>
              <div className="mt-2 bg-slate-900/50 rounded-lg p-3 flex items-center justify-between">
                <span className="text-white font-medium">{files.guidelines.name}</span>
                <span className="text-gray-500 text-sm">{formatFileSize(files.guidelines.size)}</span>
              </div>
            </div>
          )}
          
          {files.pastProjects.length > 0 && (
            <div>
              <span className="text-gray-400 text-sm">Past Projects ({files.pastProjects.length}):</span>
              <div className="mt-2 space-y-2">
                {files.pastProjects.map((file, index) => (
                  <div key={index} className="bg-slate-900/50 rounded-lg p-3 flex items-center justify-between">
                    <span className="text-white font-medium">{file.name}</span>
                    <span className="text-gray-500 text-sm">{formatFileSize(file.size)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Configuration Section */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="w-5 h-5 text-green-400" />
          <h3 className="text-lg font-bold text-white">Configuration</h3>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-400">Past Projects Mode:</span>
            <span className="text-white font-medium capitalize">
              {formData.past_projects_mode?.replace('_', ' ')}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-400">Max Iterations:</span>
            <span className="text-white font-medium">{formData.max_iterations}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-400">Web Searches:</span>
            <span className="text-white font-medium">{formData.num_web_searches}</span>
          </div>
        </div>
      </div>

      {/* Estimated Time */}
      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-purple-500/20 rounded-xl">
            <Settings className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h4 className="text-white font-bold mb-2">Estimated Generation Time</h4>
            <p className="text-purple-300 text-sm mb-3">
              Based on your configuration, generation will take approximately <strong>8-12 minutes</strong>
            </p>
            <p className="text-purple-400/80 text-xs">
              You can leave this page - we'll email you when it's ready!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
