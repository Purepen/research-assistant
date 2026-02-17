'use client'

import { GenerationConfig } from '@/types'
import { Info } from 'lucide-react'

interface Step3Props {
  formData: Partial<GenerationConfig>
  updateFormData: (data: Partial<GenerationConfig>) => void
}

export function Step3Configuration({ formData, updateFormData }: Step3Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Advanced Configuration
        </h2>
        <p className="text-gray-400">
          Customize generation settings (optional)
        </p>
      </div>

      {/* Past Projects Mode */}
      <div>
        <label className="block text-sm font-medium text-white mb-3">
          Past Projects Mode
        </label>
        <div className="space-y-3">
          {[
            {
              value: 'hybrid',
              label: 'Hybrid (Recommended)',
              desc: 'Use uploaded files + auto-discover similar projects'
            },
            {
              value: 'user_provided',
              label: 'User Provided Only',
              desc: 'Use only the files you uploaded'
            },
            {
              value: 'auto_discover',
              label: 'Auto-Discover',
              desc: 'Let AI find similar projects automatically'
            },
          ].map((mode) => (
            <button
              key={mode.value}
              type="button"
              onClick={() => updateFormData({ past_projects_mode: mode.value as any })}
              className={`w-full px-6 py-4 rounded-xl font-medium transition-all text-left ${
                formData.past_projects_mode === mode.value
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                  : 'bg-slate-800 text-gray-400 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              <div className="font-bold mb-1">{mode.label}</div>
              <div className="text-sm opacity-80">{mode.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Max Iterations */}
      <div>
        <label className="block text-sm font-medium text-white mb-3">
          Maximum Review Iterations
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="1"
            max="5"
            value={formData.max_iterations || 3}
            onChange={(e) => updateFormData({ max_iterations: parseInt(e.target.value) })}
            className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-white font-bold text-xl w-8 text-center">
            {formData.max_iterations || 3}
          </span>
        </div>
        <div className="mt-2 flex items-start gap-2">
          <Info className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-500">
            AI professor will review and improve the specification up to {formData.max_iterations || 3} times
          </p>
        </div>
      </div>

      {/* Web Searches */}
      <div>
        <label className="block text-sm font-medium text-white mb-3">
          Number of Web Searches
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="3"
            max="10"
            value={formData.num_web_searches || 5}
            onChange={(e) => updateFormData({ num_web_searches: parseInt(e.target.value) })}
            className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-white font-bold text-xl w-8 text-center">
            {formData.num_web_searches || 5}
          </span>
        </div>
        <div className="mt-2 flex items-start gap-2">
          <Info className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-500">
            More searches = better resource discovery but longer generation time
          </p>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-purple-300">
            <p className="font-medium mb-1">Default settings work great!</p>
            <p className="text-purple-400/80">
              These advanced settings are optional. The defaults are optimized for most projects.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
