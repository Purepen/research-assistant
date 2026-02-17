'use client'

import { GenerationConfig } from '@/types'

interface Step1Props {
  formData: Partial<GenerationConfig>
  updateFormData: (data: Partial<GenerationConfig>) => void
}

export function Step1BasicInfo({ formData, updateFormData }: Step1Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Basic Information
        </h2>
        <p className="text-gray-400">
          Tell us about your research project
        </p>
      </div>

      {/* Field of Study */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Field of Study *
        </label>
        <input
          type="text"
          value={formData.field_of_study || ''}
          onChange={(e) => updateFormData({ field_of_study: e.target.value })}
          placeholder="e.g., Computer Science, Biology, Engineering"
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-colors"
        />
      </div>

      {/* Research Topic */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Research Topic <span className="text-gray-500">(Optional)</span>
        </label>
        <input
          type="text"
          value={formData.research_topic || ''}
          onChange={(e) => updateFormData({ research_topic: e.target.value })}
          placeholder="Leave blank to get AI suggestions"
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-colors"
        />
        <p className="mt-2 text-sm text-gray-500">
          If left blank, AI will suggest topics based on your field
        </p>
      </div>

      {/* Academic Level */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Academic Level *
        </label>
        <div className="grid grid-cols-3 gap-4">
          {['BSc', 'MSc', 'PhD'].map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => updateFormData({ academic_level: level as any })}
              className={`px-6 py-4 rounded-xl font-medium transition-all ${
                formData.academic_level === level
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                  : 'bg-slate-800 text-gray-400 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Effort Level */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Project Effort Level
        </label>
        <div className="grid grid-cols-3 gap-4">
          {[
            { value: 'low', label: 'Low', desc: 'Simple project' },
            { value: 'medium', label: 'Medium', desc: 'Standard project' },
            { value: 'high', label: 'High', desc: 'Complex project' },
          ].map((level) => (
            <button
              key={level.value}
              type="button"
              onClick={() => updateFormData({ effort_level: level.value as any })}
              className={`px-6 py-4 rounded-xl font-medium transition-all text-left ${
                formData.effort_level === level.value
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                  : 'bg-slate-800 text-gray-400 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              <div className="font-bold mb-1">{level.label}</div>
              <div className="text-xs opacity-80">{level.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Email Notification */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Email Notification <span className="text-gray-500">(Optional)</span>
        </label>
        <input
          type="email"
          value={formData.notification_email || ''}
          onChange={(e) => updateFormData({ notification_email: e.target.value })}
          placeholder="your@email.com"
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-colors"
        />
        <p className="mt-2 text-sm text-gray-500">
          Get notified when your specification is ready
        </p>
      </div>
    </div>
  )
}
